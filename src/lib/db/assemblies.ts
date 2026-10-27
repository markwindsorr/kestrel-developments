import { createClient } from "@/lib/supabase/server"
import { requireOrgContext } from "@/lib/db/org"

export type AssemblyUnit = "LF" | "SF" | "EA" | "LS"

export interface AssemblyLineItem {
	id: string
	label: string
	rate: number
	kind: "material" | "labour"
}

export interface Assembly {
	id: string
	orgId: string
	category: string
	name: string
	unit: AssemblyUnit
	items: AssemblyLineItem[]
	sortOrder: number
	createdAt: string
	updatedAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToAssembly(row: any): Assembly {
	return {
		id: row.id,
		orgId: row.org_id,
		category: row.category,
		name: row.name,
		unit: row.unit,
		items: Array.isArray(row.items) ? row.items : [],
		sortOrder: row.sort_order ?? 0,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

export async function getAssemblies(): Promise<Assembly[]> {
	const supabase = await createClient()
	const { data } = await supabase
		.from("assemblies")
		.select("*")
		.order("category", { ascending: true })
		.order("sort_order", { ascending: true })
		.order("name", { ascending: true })
	return (data ?? []).map(rowToAssembly)
}

export async function isAssembliesEmpty(): Promise<boolean> {
	const supabase = await createClient()
	const { count } = await supabase
		.from("assemblies")
		.select("id", { count: "exact", head: true })
	return (count ?? 0) === 0
}

export interface AssemblyInput {
	category: string
	name: string
	unit: AssemblyUnit
	items: Omit<AssemblyLineItem, "id">[]
	sortOrder?: number
}

export async function createAssembly(input: AssemblyInput): Promise<string | null> {
	const supabase = await createClient()
	const { orgContext } = await requireOrgContext()
	const items: AssemblyLineItem[] = input.items.map(i => ({
		id: crypto.randomUUID(),
		label: i.label,
		rate: i.rate,
		kind: i.kind,
	}))
	const { data } = await supabase
		.from("assemblies")
		.insert({
			org_id: orgContext.orgId,
			category: input.category,
			name: input.name,
			unit: input.unit,
			items,
			sort_order: input.sortOrder ?? 0,
		})
		.select("id")
		.single()
	return data?.id ?? null
}

export async function updateAssembly(
	id: string,
	patch: Partial<Pick<Assembly, "category" | "name" | "unit" | "items" | "sortOrder">>,
): Promise<void> {
	const supabase = await createClient()
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const row: any = {}
	if (patch.category !== undefined) row.category = patch.category
	if (patch.name !== undefined) row.name = patch.name
	if (patch.unit !== undefined) row.unit = patch.unit
	if (patch.items !== undefined) row.items = patch.items
	if (patch.sortOrder !== undefined) row.sort_order = patch.sortOrder
	await supabase.from("assemblies").update(row).eq("id", id)
}

export async function deleteAssembly(id: string): Promise<void> {
	const supabase = await createClient()
	await supabase.from("assemblies").delete().eq("id", id)
}

export async function bulkInsertAssemblies(inputs: AssemblyInput[]): Promise<Assembly[]> {
	if (inputs.length === 0) return []
	const supabase = await createClient()
	const { orgContext } = await requireOrgContext()
	const rows = inputs.map((input, i) => ({
		org_id: orgContext.orgId,
		category: input.category,
		name: input.name,
		unit: input.unit,
		items: input.items.map(it => ({
			id: crypto.randomUUID(),
			label: it.label,
			rate: it.rate,
			kind: it.kind,
		})),
		sort_order: input.sortOrder ?? i,
	}))
	const { data, error } = await supabase.from("assemblies").insert(rows).select("*")
	if (error) throw error
	return (data ?? []).map(rowToAssembly)
}
