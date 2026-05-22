import {
	getDefaultScheduleTemplate,
	getTemplatePhases,
	getTemplateDependencies,
} from "@/lib/db/schedule-templates"
import { computeScheduleDates } from "@/lib/schedule-cascade"
import {
	deleteAllTradeSchedulesForJob,
	insertTradeSchedulesBulk,
	insertScheduleDependenciesBulk,
} from "@/lib/db/trade-schedules"

const PALETTE = [
	"#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d",
	"#16a34a", "#059669", "#0891b2", "#0284c7", "#2563eb",
	"#4f46e5", "#7c3aed", "#9333ea", "#c026d3", "#db2777",
]

/**
 * Apply the org's default schedule template to a job, replacing any existing trade schedules.
 * Returns the number of phases installed, or null if no default template exists.
 */
export async function applyDefaultScheduleTemplate({
	orgId,
	jobId,
	startDate,
}: {
	orgId: string
	jobId: string
	startDate: string
}): Promise<number | null> {
	const template = await getDefaultScheduleTemplate(orgId)
	if (!template) return null

	const [phases, deps] = await Promise.all([
		getTemplatePhases(template.id),
		getTemplateDependencies(template.id),
	])

	if (phases.length === 0) return 0

	const computed = computeScheduleDates(phases, deps, startDate)
	const dateByPhase = new Map(computed.map((c) => [c.phaseId, c]))

	// Replace existing schedules for the job
	await deleteAllTradeSchedulesForJob(jobId)

	// Insert phases preserving template sort_order
	const phaseRows = phases
		.slice()
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((p, i) => {
			const dates = dateByPhase.get(p.id)!
			return {
				job_id: jobId,
				trade: p.trade,
				contractor_name: null,
				start_date: dates.startDate,
				end_date: dates.endDate,
				color: p.color !== "#8b2c2c" ? p.color : PALETTE[i % PALETTE.length],
				notes: p.notes,
				_templatePhaseId: p.id,
			}
		})

	const inserted = await insertTradeSchedulesBulk(
		phaseRows.map(({ _templatePhaseId, ...rest }) => {
			void _templatePhaseId
			return rest
		})
	)

	// Map template_phase_id → new trade_schedule_id (insert order is preserved)
	const idMap = new Map<string, string>()
	phaseRows.forEach((row, i) => {
		idMap.set(row._templatePhaseId, inserted[i].id)
	})

	const depPairs: Array<{ from_id: string; to_id: string }> = []
	for (const d of deps) {
		const fromId = idMap.get(d.fromPhaseId)
		const toId = idMap.get(d.toPhaseId)
		if (fromId && toId) depPairs.push({ from_id: fromId, to_id: toId })
	}
	await insertScheduleDependenciesBulk(depPairs)

	return phases.length
}
