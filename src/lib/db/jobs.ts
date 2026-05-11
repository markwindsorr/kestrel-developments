import { createClient } from "@/lib/supabase/server"
import type { DbJob, JobStatus } from "@/lib/types"

export const getJobs = async (orgId: string, status?: JobStatus): Promise<DbJob[]> => {
	const supabase = await createClient()
	let query = supabase
		.from("jobs")
		.select("*")
		.eq("org_id", orgId)
		.order("created_at", { ascending: false })

	if (status) {
		query = query.eq("status", status)
	}

	const { data, error } = await query
	if (error) throw error
	return data as DbJob[]
}

export const getJobById = async (id: string): Promise<DbJob> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("jobs")
		.select("*")
		.eq("id", id)
		.single()

	if (error) throw error
	return data as DbJob
}

export const insertJob = async (fields: {
	name: string
	address: string
	client_name: string
	status: string
	color: string
	org_id: string
	template_id?: string | null
}): Promise<string> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("jobs")
		.insert(fields)
		.select("id")
		.single()

	if (error) throw error
	return data.id
}

export const updateJob = async (
	id: string,
	fields: {
		name: string
		address: string
		client_name: string
		status: string
		color: string
	}
) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("jobs")
		.update(fields)
		.eq("id", id)

	if (error) throw error
}

export const deleteJob = async (id: string) => {
	const supabase = await createClient()
	const { error } = await supabase.from("jobs").delete().eq("id", id)
	if (error) throw error
}
