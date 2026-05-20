"use server"

import { revalidatePath } from "next/cache"
import {
	insertTodo,
	toggleTodo as toggleTodoDb,
	deleteTodo as deleteTodoDb,
	updateTodoLabel as updateTodoLabelDb,
} from "@/lib/db/todo-items"
import { requireOrgContext } from "@/lib/db/org"

const trimOrNull = (v: FormDataEntryValue | null): string | null => {
	if (v === null) return null
	const s = String(v).trim()
	return s === "" ? null : s
}

export const addTodo = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		const { userId, orgContext } = await requireOrgContext()

		const label = trimOrNull(formData.get("label"))
		if (!label) return { error: "Task description is required" }

		await insertTodo({
			org_id: orgContext.orgId,
			assignee_id: userId,
			created_by: userId,
			job_id: trimOrNull(formData.get("jobId")),
			label,
			due_date: trimOrNull(formData.get("dueDate")),
		})

		revalidatePath("/dashboard")
		return { error: "" }
	} catch (e) {
		return { error: (e as Error).message }
	}
}

export const assignTodo = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		const { userId, orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") {
			return { error: "Only foremen and admins can assign tasks" }
		}

		const assigneeId = trimOrNull(formData.get("assigneeId"))
		const label = trimOrNull(formData.get("label"))
		if (!assigneeId) return { error: "Pick a team member to assign" }
		if (!label) return { error: "Task description is required" }

		await insertTodo({
			org_id: orgContext.orgId,
			assignee_id: assigneeId,
			created_by: userId,
			job_id: trimOrNull(formData.get("jobId")),
			label,
			due_date: trimOrNull(formData.get("dueDate")),
		})

		revalidatePath("/dashboard")
		revalidatePath("/dashboard/team")
		return { error: "" }
	} catch (e) {
		return { error: (e as Error).message }
	}
}

export const toggleTodo = async (formData: FormData) => {
	try {
		await requireOrgContext()
	} catch {
		return
	}
	const id = formData.get("id") as string
	const isCompleted = formData.get("isCompleted") === "true"
	await toggleTodoDb(id, isCompleted)
	revalidatePath("/dashboard")
}

export const deleteTodo = async (formData: FormData) => {
	try {
		await requireOrgContext()
	} catch {
		return
	}
	const id = formData.get("id") as string
	await deleteTodoDb(id)
	revalidatePath("/dashboard")
}

export const updateTodoLabel = async (formData: FormData) => {
	try {
		await requireOrgContext()
	} catch {
		return
	}
	const id = formData.get("id") as string
	const label = (formData.get("label") as string | null)?.trim() ?? ""
	if (!label) return
	await updateTodoLabelDb(id, label)
	revalidatePath("/dashboard")
}
