import { createClient } from "@/lib/supabase/server"
import type { DbChecklistItem } from "@/lib/types"

export const getChecklistItems = async (jobId: string): Promise<DbChecklistItem[]> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("job_checklist_items")
		.select("*")
		.eq("job_id", jobId)
		.order("sort_order")

	if (error) throw error
	return data as DbChecklistItem[]
}

export const getMaxSortOrder = async (jobId: string): Promise<number> => {
	const supabase = await createClient()
	const { data } = await supabase
		.from("job_checklist_items")
		.select("sort_order")
		.eq("job_id", jobId)
		.order("sort_order", { ascending: false })
		.limit(1)

	return data && data.length > 0 ? data[0].sort_order : -1
}

export const insertChecklistItem = async (fields: {
	job_id: string
	section: string
	label: string
	sort_order: number
}) => {
	const supabase = await createClient()
	const { error } = await supabase.from("job_checklist_items").insert(fields)
	if (error) throw error
}

export const insertChecklistItems = async (
	rows: { job_id: string; section: string; label: string; sort_order: number }[]
) => {
	const supabase = await createClient()
	const { error } = await supabase.from("job_checklist_items").insert(rows)
	if (error) throw error
}

export const toggleChecklistItem = async (
	id: string,
	currentlyCompleted: boolean,
	userId: string,
	notes?: string | null
) => {
	const supabase = await createClient()
	const nowCompleting = !currentlyCompleted
	const { error } = await supabase
		.from("job_checklist_items")
		.update({
			is_completed: nowCompleting,
			completed_at: nowCompleting ? new Date().toISOString() : null,
			completed_by: nowCompleting ? userId : null,
			notes: nowCompleting ? (notes || null) : null,
		})
		.eq("id", id)

	if (error) throw error
}

export const getChecklistItemById = async (id: string): Promise<DbChecklistItem> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("job_checklist_items")
		.select("*")
		.eq("id", id)
		.single()

	if (error) throw error
	return data as DbChecklistItem
}

export const deleteChecklistItem = async (id: string) => {
	const supabase = await createClient()
	const { error } = await supabase.from("job_checklist_items").delete().eq("id", id)
	if (error) throw error
}

export async function getChecklistStatsByJobs(jobIds: string[]): Promise<Record<string, { total: number; completed: number }>> {
	if (jobIds.length === 0) return {}
	try {
		const supabase = await createClient()
		const { data } = await supabase
			.from("job_checklist_items")
			.select("job_id, is_completed")
			.in("job_id", jobIds)
		const stats: Record<string, { total: number; completed: number }> = {}
		for (const item of data ?? []) {
			if (!stats[item.job_id]) stats[item.job_id] = { total: 0, completed: 0 }
			stats[item.job_id].total++
			if (item.is_completed) stats[item.job_id].completed++
		}
		return stats
	} catch { return {} }
}
