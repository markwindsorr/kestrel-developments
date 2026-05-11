import { createClient } from "@/lib/supabase/server"

export type ChangeOrderStatus = "pending" | "approved" | "rejected"

export interface ChangeOrder {
	id: string
	jobId: string
	number: number
	title: string
	description: string | null
	amount: number
	status: ChangeOrderStatus
	requestedAt: string
	approvedAt: string | null
}

function toChangeOrder(r: Record<string, unknown>): ChangeOrder {
	return {
		id: r.id as string,
		jobId: r.job_id as string,
		number: r.number as number,
		title: r.title as string,
		description: r.description as string | null,
		amount: r.amount as number,
		status: r.status as ChangeOrderStatus,
		requestedAt: r.requested_at as string,
		approvedAt: r.approved_at as string | null,
	}
}

export async function getChangeOrders(jobId: string): Promise<ChangeOrder[]> {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase
			.from("change_orders")
			.select("*")
			.eq("job_id", jobId)
			.order("number")
		if (error) return []
		return (data ?? []).map(toChangeOrder)
	} catch { return [] }
}

export async function insertChangeOrder(fields: {
	jobId: string
	title: string
	description?: string
	amount: number
	status?: ChangeOrderStatus
}): Promise<string> {
	const supabase = await createClient()
	const { data: existing } = await supabase
		.from("change_orders")
		.select("number")
		.eq("job_id", fields.jobId)
		.order("number", { ascending: false })
		.limit(1)
	const nextNumber = ((existing?.[0]?.number as number) ?? 0) + 1

	const { data, error } = await supabase
		.from("change_orders")
		.insert({
			job_id: fields.jobId,
			number: nextNumber,
			title: fields.title,
			description: fields.description ?? null,
			amount: fields.amount,
			status: fields.status ?? "pending",
		})
		.select("id")
		.single()
	if (error) throw new Error(error.message)
	return data.id
}

export async function updateChangeOrderStatus(id: string, status: ChangeOrderStatus): Promise<void> {
	const supabase = await createClient()
	const update: Record<string, unknown> = { status }
	if (status === "approved") update.approved_at = new Date().toISOString()
	const { error } = await supabase.from("change_orders").update(update).eq("id", id)
	if (error) throw new Error(error.message)
}

export async function deleteChangeOrder(id: string): Promise<void> {
	const supabase = await createClient()
	const { error } = await supabase.from("change_orders").delete().eq("id", id)
	if (error) throw new Error(error.message)
}

export async function getAllPendingChangeOrders(): Promise<Array<ChangeOrder & { jobName: string }>> {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase
			.from("change_orders")
			.select("*, jobs(name)")
			.eq("status", "pending")
			.order("requested_at", { ascending: false })
		if (error) return []
		return (data ?? []).map(r => ({
			...toChangeOrder(r),
			jobName: (r.jobs as { name: string } | null)?.name ?? "Unknown Job",
		}))
	} catch { return [] }
}
