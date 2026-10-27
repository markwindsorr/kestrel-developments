import type { Assembly, AssemblyLineItem } from "@/lib/db/assemblies"
import type { Measurement, MeasurementPoint } from "@/lib/db/projects"

export function distancePx(a: MeasurementPoint, b: MeasurementPoint): number {
	const dx = a.x - b.x
	const dy = a.y - b.y
	return Math.sqrt(dx * dx + dy * dy)
}

// Shoelace formula. Returns absolute area in px².
export function polygonAreaPx(points: MeasurementPoint[]): number {
	if (points.length < 3) return 0
	let sum = 0
	for (let i = 0; i < points.length; i++) {
		const a = points[i]
		const b = points[(i + 1) % points.length]
		sum += a.x * b.y - b.x * a.y
	}
	return Math.abs(sum) / 2
}

export function pxToFeet(px: number, pxPerFt: number): number {
	if (!pxPerFt || pxPerFt <= 0) return 0
	return px / pxPerFt
}

export function pxAreaToSqft(pxArea: number, pxPerFt: number): number {
	if (!pxPerFt || pxPerFt <= 0) return 0
	return pxArea / (pxPerFt * pxPerFt)
}

export interface CostBreakdown {
	materialCost: number
	labourCost: number
	totalCost: number
}

// Snapshot costs at measurement time. Subsequent rate edits on the assembly
// do NOT retroactively change saved measurements — this preserves project
// totals as they existed when the measurement was confirmed.
export function computeCost(value: number, items: AssemblyLineItem[]): CostBreakdown {
	let material = 0
	let labour = 0
	for (const it of items) {
		if (it.kind === "material") material += value * it.rate
		else labour += value * it.rate
	}
	return {
		materialCost: round2(material),
		labourCost: round2(labour),
		totalCost: round2(material + labour),
	}
}

export function round2(n: number): number {
	return Math.round(n * 100) / 100
}

export function buildMeasurement(opts: {
	label: string
	kind: Measurement["kind"]
	value: number
	assembly: Assembly
	points: MeasurementPoint[] | null
}): Measurement {
	const costs = computeCost(opts.value, opts.assembly.items)
	return {
		id: crypto.randomUUID(),
		label: opts.label,
		kind: opts.kind,
		value: round2(opts.value),
		unit: opts.assembly.unit,
		assemblyId: opts.assembly.id,
		assemblyName: opts.assembly.name,
		assemblyCategory: opts.assembly.category,
		materialCost: costs.materialCost,
		labourCost: costs.labourCost,
		totalCost: costs.totalCost,
		points: opts.points,
		createdAt: new Date().toISOString(),
	}
}
