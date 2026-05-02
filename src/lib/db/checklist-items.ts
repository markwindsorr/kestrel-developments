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

export const toggleChecklistItem = async (id: string, currentlyCompleted: boolean) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("job_checklist_items")
		.update({ is_completed: !currentlyCompleted })
		.eq("id", id)

	if (error) throw error
}

export const deleteChecklistItem = async (id: string) => {
	const supabase = await createClient()
	const { error } = await supabase.from("job_checklist_items").delete().eq("id", id)
	if (error) throw error
}
