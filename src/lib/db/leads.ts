import { createClient } from "@/lib/supabase/server"

export type LeadStage = "lead" | "bid" | "proposal" | "won" | "lost"

export interface Lead {
	id: string
	clientName: string
	contactName: string | null
	email: string | null
	phone: string | null
	address: string | null
	projectType: string
	estimatedValue: number | null
	stage: LeadStage
	notes: string | null
	jobId: string | null
	company: string
	createdAt: string
	updatedAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toLead = (r: any): Lead => ({
	id: r.id,
	clientName: r.client_name,
	contactName: r.contact_name ?? null,
	email: r.email ?? null,
	phone: r.phone ?? null,
	address: r.address ?? null,
	projectType: r.project_type ?? "New Build",
	estimatedValue: r.estimated_value ? Number(r.estimated_value) : null,
	stage: r.stage as LeadStage,
	notes: r.notes ?? null,
	jobId: r.job_id ?? null,
	company: r.company ?? "developments",
	createdAt: r.created_at,
	updatedAt: r.updated_at,
})

export async function getLeads(company?: string): Promise<Lead[]> {
	try {
		const supabase = await createClient()
		let query = supabase.from("leads").select("*").order("created_at", { ascending: false })
		if (company) query = query.eq("company", company)
		const { data, error } = await query
		if (error) return []
		return (data ?? []).map(toLead)
	} catch {
		return []
	}
}

export async function insertLead(fields: {
	clientName: string
	contactName?: string
	email?: string
	phone?: string
	address?: string
	projectType?: string
	estimatedValue?: number
	stage?: LeadStage
	notes?: string
	company: string
}): Promise<string> {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("leads")
		.insert({
			client_name: fields.clientName,
			contact_name: fields.contactName ?? null,
			email: fields.email ?? null,
			phone: fields.phone ?? null,
			address: fields.address ?? null,
			project_type: fields.projectType ?? "New Build",
			estimated_value: fields.estimatedValue ?? null,
			stage: fields.stage ?? "lead",
			notes: fields.notes ?? null,
			company: fields.company,
		})
		.select("id")
		.single()
	if (error) throw new Error(error.message)
	return data.id
}

export async function updateLeadStage(id: string, stage: LeadStage): Promise<void> {
	const supabase = await createClient()
	await supabase.from("leads").update({ stage, updated_at: new Date().toISOString() }).eq("id", id)
}

export async function updateLeadJobId(id: string, jobId: string): Promise<void> {
	const supabase = await createClient()
	await supabase.from("leads").update({ job_id: jobId, stage: "won", updated_at: new Date().toISOString() }).eq("id", id)
}

export async function deleteLead(id: string): Promise<void> {
	const supabase = await createClient()
	await supabase.from("leads").delete().eq("id", id)
}
