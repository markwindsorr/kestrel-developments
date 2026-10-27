import { createClient } from "@/lib/supabase/server"
import { requireOrgContext } from "@/lib/db/org"
import type { AssemblyUnit } from "@/lib/db/assemblies"

export type MeasurementKind = "linear" | "area" | "count" | "lump"

export interface MeasurementPoint {
	x: number
	y: number
}

export interface Measurement {
	id: string
	label: string
	kind: MeasurementKind
	value: number
	unit: AssemblyUnit
	assemblyId: string
	assemblyName: string
	assemblyCategory: string
	materialCost: number
	labourCost: number
	totalCost: number
	points: MeasurementPoint[] | null
	createdAt: string
}

export interface Project {
	id: string
	orgId: string
	jobId: string | null
	name: string
	address: string
	pdfPath: string | null
	scalePxPerFt: number | null
	measurements: Measurement[]
	contingencyPct: number
	profitPct: number
	hstEnabled: boolean
	hstRate: number
	createdBy: string
	createdAt: string
	updatedAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToProject(row: any): Project {
	return {
		id: row.id,
		orgId: row.org_id,
		jobId: row.job_id ?? null,
		name: row.name,
		address: row.address ?? "",
		pdfPath: row.pdf_path ?? null,
		scalePxPerFt: row.scale_px_per_ft != null ? Number(row.scale_px_per_ft) : null,
		measurements: Array.isArray(row.measurements) ? row.measurements : [],
		contingencyPct: Number(row.contingency_pct ?? 0),
		profitPct: Number(row.profit_pct ?? 0),
		hstEnabled: !!row.hst_enabled,
		hstRate: Number(row.hst_rate ?? 0.15),
		createdBy: row.created_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

export async function getProjects(): Promise<Project[]> {
	const supabase = await createClient()
	const { data } = await supabase
		.from("projects")
		.select("*")
		.order("updated_at", { ascending: false })
	return (data ?? []).map(rowToProject)
}

export async function getProjectById(id: string): Promise<Project | null> {
	const supabase = await createClient()
	const { data } = await supabase
		.from("projects")
		.select("*")
		.eq("id", id)
		.single()
	return data ? rowToProject(data) : null
}

export async function getProjectsForJob(jobId: string): Promise<Project[]> {
	const supabase = await createClient()
	const { data } = await supabase
		.from("projects")
		.select("*")
		.eq("job_id", jobId)
		.order("updated_at", { ascending: false })
	return (data ?? []).map(rowToProject)
}

export interface CreateProjectInput {
	name: string
	address?: string
	jobId?: string | null
	hstRate?: number
	hstEnabled?: boolean
}

export async function createProject(input: CreateProjectInput): Promise<string | null> {
	const supabase = await createClient()
	const { userId, orgContext } = await requireOrgContext()
	const { data } = await supabase
		.from("projects")
		.insert({
			org_id: orgContext.orgId,
			created_by: userId,
			name: input.name,
			address: input.address ?? "",
			job_id: input.jobId ?? null,
			hst_rate: input.hstRate ?? 0.15,
			hst_enabled: input.hstEnabled ?? true,
		})
		.select("id")
		.single()
	return data?.id ?? null
}

export interface ProjectPatch {
	name?: string
	address?: string
	jobId?: string | null
	pdfPath?: string | null
	scalePxPerFt?: number | null
	measurements?: Measurement[]
	contingencyPct?: number
	profitPct?: number
	hstEnabled?: boolean
	hstRate?: number
}

export async function updateProject(id: string, patch: ProjectPatch): Promise<void> {
	const supabase = await createClient()
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const row: any = {}
	if (patch.name !== undefined) row.name = patch.name
	if (patch.address !== undefined) row.address = patch.address
	if (patch.jobId !== undefined) row.job_id = patch.jobId
	if (patch.pdfPath !== undefined) row.pdf_path = patch.pdfPath
	if (patch.scalePxPerFt !== undefined) row.scale_px_per_ft = patch.scalePxPerFt
	if (patch.measurements !== undefined) row.measurements = patch.measurements
	if (patch.contingencyPct !== undefined) row.contingency_pct = patch.contingencyPct
	if (patch.profitPct !== undefined) row.profit_pct = patch.profitPct
	if (patch.hstEnabled !== undefined) row.hst_enabled = patch.hstEnabled
	if (patch.hstRate !== undefined) row.hst_rate = patch.hstRate
	await supabase.from("projects").update(row).eq("id", id)
}

export async function deleteProject(id: string): Promise<void> {
	const supabase = await createClient()
	await supabase.from("projects").delete().eq("id", id)
}
