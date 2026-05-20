import { createClient } from "@/lib/supabase/server"
import type { DbTodoItem, TodoItem } from "@/lib/types"

interface TodoRow extends DbTodoItem {
	creator: { name: string } | null
	job: { name: string } | null
}

const toTodo = (row: TodoRow): TodoItem => ({
	id: row.id,
	assigneeId: row.assignee_id,
	createdBy: row.created_by,
	createdByName: row.creator?.name ?? "Unknown",
	jobId: row.job_id,
	jobName: row.job?.name ?? null,
	label: row.label,
	isCompleted: row.is_completed,
	completedAt: row.completed_at,
	dueDate: row.due_date,
	createdAt: row.created_at,
	source: row.created_by === row.assignee_id ? "self" : "assigned",
})

export const getTodosForUser = async (
	userId: string,
	orgId: string
): Promise<TodoItem[]> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("todo_items")
		.select("*, creator:profiles!todo_items_created_by_fkey(name), job:jobs(name)")
		.eq("assignee_id", userId)
		.eq("org_id", orgId)
		.order("is_completed", { ascending: true })
		.order("created_at", { ascending: false })

	if (error) throw error
	return (data as unknown as TodoRow[]).map(toTodo)
}

export const getOpenTodoCountsByJob = async (
	userId: string,
	jobIds: string[]
): Promise<Record<string, number>> => {
	if (jobIds.length === 0) return {}
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("todo_items")
		.select("job_id")
		.eq("assignee_id", userId)
		.eq("is_completed", false)
		.in("job_id", jobIds)

	if (error) return {}
	const counts: Record<string, number> = {}
	for (const row of data ?? []) {
		if (!row.job_id) continue
		counts[row.job_id] = (counts[row.job_id] ?? 0) + 1
	}
	return counts
}

export const insertTodo = async (fields: {
	org_id: string
	assignee_id: string
	created_by: string
	job_id: string | null
	label: string
	due_date: string | null
}) => {
	const supabase = await createClient()
	const { error } = await supabase.from("todo_items").insert(fields)
	if (error) throw error
}

export const toggleTodo = async (id: string, isCompleted: boolean) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("todo_items")
		.update({
			is_completed: isCompleted,
			completed_at: isCompleted ? new Date().toISOString() : null,
		})
		.eq("id", id)

	if (error) throw error
}

export const updateTodoLabel = async (id: string, label: string) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("todo_items")
		.update({ label })
		.eq("id", id)

	if (error) throw error
}

export const deleteTodo = async (id: string) => {
	const supabase = await createClient()
	const { error } = await supabase.from("todo_items").delete().eq("id", id)
	if (error) throw error
}
