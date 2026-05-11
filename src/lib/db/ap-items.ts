import { createClient } from "@/lib/supabase/server"

export interface APItem {
	id: string
	vendor: string
	description: string | null
	amount: number
	dueDate: string
	isPaid: boolean
	company: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toItem = (r: any): APItem => ({
	id: r.id,
	vendor: r.vendor,
	description: r.description ?? null,
	amount: Number(r.amount),
	dueDate: r.due_date,
	isPaid: r.is_paid,
	company: r.company,
})

export async function getAPItems(company?: string): Promise<APItem[]> {
	const supabase = await createClient()
	let query = supabase
		.from("ap_items")
		.select("*")
		.eq("is_paid", false)
		.order("due_date")

	if (company) query = query.eq("company", company)
	const { data } = await query
	return (data ?? []).map(toItem)
}

export async function insertAPItem(fields: {
	vendor: string
	description?: string
	amount: number
	dueDate: string
	company: string
}): Promise<void> {
	const supabase = await createClient()
	await supabase.from("ap_items").insert({
		vendor: fields.vendor,
		description: fields.description ?? null,
		amount: fields.amount,
		due_date: fields.dueDate,
		company: fields.company,
	})
}

export async function markAPItemPaid(id: string): Promise<void> {
	const supabase = await createClient()
	await supabase.from("ap_items").update({ is_paid: true }).eq("id", id)
}

export async function deleteAPItem(id: string): Promise<void> {
	const supabase = await createClient()
	await supabase.from("ap_items").delete().eq("id", id)
}
