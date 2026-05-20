import type {
	TemplateDependency,
	TemplatePhase,
} from "@/lib/db/schedule-templates"

const parseDate = (iso: string): Date => {
	const [y, m, d] = iso.split("-").map(Number)
	return new Date(y, m - 1, d)
}

const toIso = (d: Date): string => {
	const y = d.getFullYear()
	const m = String(d.getMonth() + 1).padStart(2, "0")
	const day = String(d.getDate()).padStart(2, "0")
	return `${y}-${m}-${day}`
}

const isWeekend = (d: Date): boolean => {
	const dow = d.getDay()
	return dow === 0 || dow === 6
}

/**
 * Add n business days. If n is 0, returns the same date (clamped to next biz day if input lands on weekend).
 * If n > 0, advances n business days forward.
 */
const addBusinessDays = (start: Date, n: number): Date => {
	const d = new Date(start.getTime())
	while (isWeekend(d)) d.setDate(d.getDate() + 1)
	let remaining = n
	while (remaining > 0) {
		d.setDate(d.getDate() + 1)
		if (!isWeekend(d)) remaining--
	}
	return d
}

const nextBusinessDay = (d: Date): Date => addBusinessDays(d, 1)

export interface ComputedPhase {
	phaseId: string
	startDate: string
	endDate: string
}

/**
 * Compute start/end dates for each phase given a project start date.
 * Phases with no incoming dependencies start at projectStart (clamped to next biz day if weekend).
 * Phases with predecessors start the business day after the latest predecessor's end + edge.lag_days
 * business days. Phase end = start + (duration - 1) business days.
 */
export function computeScheduleDates(
	phases: TemplatePhase[],
	deps: TemplateDependency[],
	projectStartIso: string
): ComputedPhase[] {
	const projectStart = parseDate(projectStartIso)
	// Clamp to next business day if landing on weekend
	const anchor = isWeekend(projectStart)
		? nextBusinessDay(projectStart)
		: projectStart

	// Build adjacency: phaseId -> list of incoming { fromId, lagDays }
	const incoming = new Map<string, { fromId: string; lagDays: number }[]>()
	for (const p of phases) incoming.set(p.id, [])
	for (const d of deps) {
		const arr = incoming.get(d.toPhaseId)
		if (arr) arr.push({ fromId: d.fromPhaseId, lagDays: d.lagDays })
	}

	// Topological sort (Kahn's algorithm)
	const indegree = new Map<string, number>()
	for (const p of phases) indegree.set(p.id, incoming.get(p.id)?.length ?? 0)
	const outgoing = new Map<string, string[]>()
	for (const p of phases) outgoing.set(p.id, [])
	for (const d of deps) {
		outgoing.get(d.fromPhaseId)?.push(d.toPhaseId)
	}

	const queue: string[] = []
	for (const [id, deg] of indegree) {
		if (deg === 0) queue.push(id)
	}

	const order: string[] = []
	while (queue.length) {
		const id = queue.shift()!
		order.push(id)
		for (const next of outgoing.get(id) ?? []) {
			const deg = (indegree.get(next) ?? 0) - 1
			indegree.set(next, deg)
			if (deg === 0) queue.push(next)
		}
	}

	if (order.length !== phases.length) {
		throw new Error("Schedule template has a dependency cycle")
	}

	const phaseById = new Map(phases.map((p) => [p.id, p]))
	const startById = new Map<string, Date>()
	const endById = new Map<string, Date>()

	for (const id of order) {
		const phase = phaseById.get(id)!
		const preds = incoming.get(id) ?? []

		let start: Date
		if (preds.length === 0) {
			start = anchor
		} else {
			let latest: Date | null = null
			for (const { fromId, lagDays } of preds) {
				const predEnd = endById.get(fromId)
				if (!predEnd) continue
				// Start the business day after predEnd, plus extra lagDays business days
				const candidate = addBusinessDays(predEnd, 1 + lagDays)
				if (!latest || candidate.getTime() > latest.getTime()) latest = candidate
			}
			start = latest ?? anchor
		}

		// End = start + (duration - 1) business days (duration includes the start day)
		const end = addBusinessDays(start, phase.durationDays - 1)
		startById.set(id, start)
		endById.set(id, end)
	}

	return phases.map((p) => ({
		phaseId: p.id,
		startDate: toIso(startById.get(p.id)!),
		endDate: toIso(endById.get(p.id)!),
	}))
}

/**
 * Get today as ISO date string in local time.
 */
export const todayIso = (): string => toIso(new Date())

/**
 * Business days between two inclusive dates (Mon-Fri only).
 * Used to derive a phase's working-day duration from its current start/end.
 */
export function businessDaysInclusive(startIso: string, endIso: string): number {
	const start = parseDate(startIso)
	const end = parseDate(endIso)
	if (end.getTime() < start.getTime()) return 1
	const cur = new Date(start.getTime())
	let count = 0
	while (cur.getTime() <= end.getTime()) {
		if (!isWeekend(cur)) count++
		cur.setDate(cur.getDate() + 1)
	}
	return Math.max(1, count)
}

export interface CascadePhase {
	id: string
	startDate: string
	endDate: string
}

export interface CascadeEdge {
	fromId: string
	toId: string
	lagDays: number
}

/**
 * Given a job's current phases + dependencies and one phase that just changed,
 * return the new start/end dates for every downstream phase (transitively).
 * Each downstream phase's start = max(predecessor.end + 1 + lag business days).
 * Duration is preserved from the phase's current start/end.
 */
export function cascadeForwardFromPhase(
	phases: CascadePhase[],
	edges: CascadeEdge[],
	changedPhaseId: string
): CascadePhase[] {
	const phaseMap = new Map<string, CascadePhase>(
		phases.map((p) => [p.id, { ...p }])
	)
	const outgoing = new Map<string, string[]>()
	const incoming = new Map<string, { fromId: string; lagDays: number }[]>()
	for (const p of phases) {
		outgoing.set(p.id, [])
		incoming.set(p.id, [])
	}
	for (const e of edges) {
		outgoing.get(e.fromId)?.push(e.toId)
		incoming.get(e.toId)?.push({ fromId: e.fromId, lagDays: e.lagDays })
	}

	const updated = new Map<string, CascadePhase>()
	const visited = new Set<string>([changedPhaseId])
	const queue: string[] = [changedPhaseId]

	while (queue.length) {
		const fromId = queue.shift()!
		for (const toId of outgoing.get(fromId) ?? []) {
			const successor = phaseMap.get(toId)
			if (!successor) continue
			const preds = incoming.get(toId) ?? []
			const duration = businessDaysInclusive(
				successor.startDate,
				successor.endDate
			)

			let latest: Date | null = null
			for (const { fromId: pid, lagDays } of preds) {
				const pred = phaseMap.get(pid)
				if (!pred) continue
				const predEnd = parseDate(pred.endDate)
				const candidate = addBusinessDays(predEnd, 1 + lagDays)
				if (!latest || candidate.getTime() > latest.getTime()) latest = candidate
			}
			if (!latest) continue

			const newStart = toIso(latest)
			const newEnd = toIso(addBusinessDays(latest, duration - 1))
			const prev = phaseMap.get(toId)!
			if (prev.startDate !== newStart || prev.endDate !== newEnd) {
				const updatedPhase = { id: toId, startDate: newStart, endDate: newEnd }
				phaseMap.set(toId, updatedPhase)
				updated.set(toId, updatedPhase)
			}
			if (!visited.has(toId)) {
				visited.add(toId)
				queue.push(toId)
			}
		}
	}

	return Array.from(updated.values())
}

/**
 * Pure helpers, exported for testing.
 */
export const _testing = { parseDate, toIso, addBusinessDays, isWeekend }
