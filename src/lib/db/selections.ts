import { createClient } from "@/lib/supabase/server"

export type SelectionStatus = "pending" | "selected" | "ordered" | "installed"

export interface Selection {
	id: string
	jobId: string
	category: string
	item: string
	allowance: number | null
	actualCost: number | null
	clientChoice: string | null
	status: SelectionStatus
	dueDate: string | null
	notes: string | null
}

function toSelection(r: Record<string, unknown>): Selection {
	return {
		id: r.id as string,
		jobId: r.job_id as string,
		category: r.category as string,
		item: r.item as string,
		allowance: r.allowance as number | null,
		actualCost: r.actual_cost as number | null,
		clientChoice: r.client_choice as string | null,
		status: r.status as SelectionStatus,
		dueDate: r.due_date as string | null,
		notes: r.notes as string | null,
	}
}

export async function getSelections(jobId: string): Promise<Selection[]> {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase
			.from("selections")
			.select("*")
			.eq("job_id", jobId)
			.order("category")
		if (error) return []
		return (data ?? []).map(toSelection)
	} catch { return [] }
}

export async function insertSelection(fields: {
	jobId: string
	category: string
	item: string
	allowance?: number
	clientChoice?: string
	status?: SelectionStatus
	dueDate?: string
	notes?: string
}): Promise<string> {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("selections")
		.insert({
			job_id: fields.jobId,
			category: fields.category,
			item: fields.item,
			allowance: fields.allowance ?? null,
			client_choice: fields.clientChoice ?? null,
			status: fields.status ?? "pending",
			due_date: fields.dueDate ?? null,
			notes: fields.notes ?? null,
		})
		.select("id")
		.single()
	if (error) throw new Error(error.message)
	return data.id
}

export async function updateSelectionStatus(
	id: string,
	status: SelectionStatus,
	clientChoice?: string,
	actualCost?: number
): Promise<void> {
	const supabase = await createClient()
	const update: Record<string, unknown> = { status }
	if (clientChoice !== undefined) update.client_choice = clientChoice
	if (actualCost !== undefined) update.actual_cost = actualCost
	const { error } = await supabase.from("selections").update(update).eq("id", id)
	if (error) throw new Error(error.message)
}

export async function deleteSelection(id: string): Promise<void> {
	const supabase = await createClient()
	const { error } = await supabase.from("selections").delete().eq("id", id)
	if (error) throw new Error(error.message)
}
