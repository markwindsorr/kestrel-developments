import { createClient } from "@/lib/supabase/server"

export interface HouseEstimate {
	id: string
	userId: string
	name: string
	jobId: string | null
	data: Record<string, unknown>
	createdAt: string
	updatedAt: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToEstimate(row: any): HouseEstimate {
	return {
		id: row.id,
		userId: row.user_id,
		name: row.name,
		jobId: row.job_id ?? null,
		data: row.data,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

export async function getEstimates(): Promise<HouseEstimate[]> {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return []

	const { data } = await supabase
		.from("house_estimates")
		.select("*")
		.eq("user_id", user.id)
		.order("updated_at", { ascending: false })

	return (data ?? []).map(rowToEstimate)
}

export async function getEstimateById(id: string): Promise<HouseEstimate | null> {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return null

	const { data } = await supabase
		.from("house_estimates")
		.select("*")
		.eq("id", id)
		.eq("user_id", user.id)
		.single()

	return data ? rowToEstimate(data) : null
}

export async function getEstimatesForJob(jobId: string): Promise<HouseEstimate[]> {
	const supabase = await createClient()
	const { data } = await supabase
		.from("house_estimates")
		.select("*")
		.eq("job_id", jobId)
		.order("updated_at", { ascending: false })

	return (data ?? []).map(rowToEstimate)
}

export async function saveEstimate(
	name: string,
	data: Record<string, unknown>,
	existingId?: string,
): Promise<string | null> {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return null

	if (existingId) {
		await supabase
			.from("house_estimates")
			.update({ name, data, updated_at: new Date().toISOString() })
			.eq("id", existingId)
			.eq("user_id", user.id)
		return existingId
	}

	const { data: row } = await supabase
		.from("house_estimates")
		.insert({ user_id: user.id, name, data })
		.select("id")
		.single()

	return row?.id ?? null
}

export async function linkEstimateToJob(estimateId: string, jobId: string | null): Promise<void> {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return

	await supabase
		.from("house_estimates")
		.update({ job_id: jobId })
		.eq("id", estimateId)
		.eq("user_id", user.id)
}

export async function deleteEstimate(id: string): Promise<void> {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return

	await supabase
		.from("house_estimates")
		.delete()
		.eq("id", id)
		.eq("user_id", user.id)
}
