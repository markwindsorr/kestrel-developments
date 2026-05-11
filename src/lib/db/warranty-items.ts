import { createClient } from "@/lib/supabase/server"

export type WarrantyStatus = "open" | "in_progress" | "completed"
export type WarrantyPriority = "low" | "medium" | "high"

export interface WarrantyItem {
	id: string
	jobId: string
	title: string
	description: string | null
	reportedDate: string
	completedDate: string | null
	status: WarrantyStatus
	priority: WarrantyPriority
}

function toWarrantyItem(r: Record<string, unknown>): WarrantyItem {
	return {
		id: r.id as string,
		jobId: r.job_id as string,
		title: r.title as string,
		description: r.description as string | null,
		reportedDate: r.reported_date as string,
		completedDate: r.completed_date as string | null,
		status: r.status as WarrantyStatus,
		priority: r.priority as WarrantyPriority,
	}
}

export async function getWarrantyItems(jobId: string): Promise<WarrantyItem[]> {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase
			.from("warranty_items")
			.select("*")
			.eq("job_id", jobId)
			.order("reported_date", { ascending: false })
		if (error) return []
		return (data ?? []).map(toWarrantyItem)
	} catch { return [] }
}

export async function insertWarrantyItem(fields: {
	jobId: string
	title: string
	description?: string
	priority?: WarrantyPriority
	reportedDate?: string
}): Promise<string> {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("warranty_items")
		.insert({
			job_id: fields.jobId,
			title: fields.title,
			description: fields.description ?? null,
			priority: fields.priority ?? "medium",
			reported_date: fields.reportedDate ?? new Date().toISOString().split("T")[0],
			status: "open",
		})
		.select("id")
		.single()
	if (error) throw new Error(error.message)
	return data.id
}

export async function updateWarrantyItemStatus(id: string, status: WarrantyStatus): Promise<void> {
	const supabase = await createClient()
	const update: Record<string, unknown> = { status }
	if (status === "completed") update.completed_date = new Date().toISOString().split("T")[0]
	const { error } = await supabase.from("warranty_items").update(update).eq("id", id)
	if (error) throw new Error(error.message)
}

export async function deleteWarrantyItem(id: string): Promise<void> {
	const supabase = await createClient()
	const { error } = await supabase.from("warranty_items").delete().eq("id", id)
	if (error) throw new Error(error.message)
}

export async function getAllHighPriorityOpenWarranty(): Promise<Array<WarrantyItem & { jobName: string }>> {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase
			.from("warranty_items")
			.select("*, jobs(name)")
			.in("status", ["open", "in_progress"])
			.eq("priority", "high")
			.order("reported_date", { ascending: false })
		if (error) return []
		return (data ?? []).map(r => ({
			...toWarrantyItem(r),
			jobName: (r.jobs as { name: string } | null)?.name ?? "Unknown Job",
		}))
	} catch { return [] }
}
