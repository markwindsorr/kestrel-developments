"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { insertJob, updateJob as updateJobDb, deleteJob as deleteJobDb } from "@/lib/db/jobs"
import {
	getMaxSortOrder,
	insertChecklistItem,
	insertChecklistItems,
	toggleChecklistItem as toggleChecklistItemDb,
	deleteChecklistItem as deleteChecklistItemDb,
} from "@/lib/db/checklist-items"
import { getTemplateItems } from "@/lib/db/checklist-templates"
import { requireAuth, requireOrgContext } from "@/lib/db/org"

export const createJob = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") {
			return { error: "Unauthorized" }
		}

		const name = formData.get("name") as string
		const address = formData.get("address") as string
		const clientName = formData.get("clientName") as string
		const status = formData.get("status") as string
		const color = formData.get("color") as string

		if (!name || !address || !clientName) {
			return { error: "Name, address, and client name are required" }
		}

		const templateId = formData.get("templateId") as string | null

		const jobId = await insertJob({
			name,
			address,
			client_name: clientName,
			status: status || "active",
			color: color || "#2563eb",
			org_id: orgContext.orgId,
			template_id: templateId || null,
		})

		if (templateId) {
			const templateItems = await getTemplateItems(templateId)
			const checklistRows = templateItems.map((item, i) => ({
				job_id: jobId,
				section: item.section,
				label: item.label,
				sort_order: i,
			}))
			if (checklistRows.length > 0) {
				await insertChecklistItems(checklistRows)
			}
		}

		revalidatePath("/dashboard/jobs")
		revalidatePath("/dashboard")
		redirect(`/dashboard/jobs/${jobId}`)
	} catch (e) {
		if ((e as Error).message === "NEXT_REDIRECT") throw e
		return { error: (e as Error).message }
	}
}

export const updateJob = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		await requireAuth()
	} catch {
		return { error: "Not authenticated" }
	}

	const id = formData.get("id") as string
	const name = formData.get("name") as string
	const address = formData.get("address") as string
	const clientName = formData.get("clientName") as string
	const status = formData.get("status") as string
	const color = formData.get("color") as string

	try {
		await updateJobDb(id, {
			name,
			address,
			client_name: clientName,
			status,
			color,
		})
	} catch (e) {
		return { error: (e as Error).message }
	}

	revalidatePath("/dashboard/jobs")
	revalidatePath(`/dashboard/jobs/${id}`)
	revalidatePath("/dashboard")
	return { error: "" }
}

export const addChecklistItem = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		await requireAuth()
	} catch {
		return { error: "Not authenticated" }
	}

	const jobId = formData.get("jobId") as string
	const label = formData.get("label") as string

	if (!label?.trim()) return { error: "Item label is required" }

	const maxOrder = await getMaxSortOrder(jobId)
	const section = (formData.get("section") as string) || ""

	try {
		await insertChecklistItem({
			job_id: jobId,
			section,
			label: label.trim(),
			sort_order: maxOrder + 1,
		})
	} catch (e) {
		return { error: (e as Error).message }
	}

	revalidatePath(`/dashboard/jobs/${jobId}`)
	return { error: "" }
}

export const toggleChecklistItem = async (formData: FormData) => {
	let userId: string
	try {
		userId = await requireAuth()
	} catch {
		return
	}

	const id = formData.get("id") as string
	const jobId = formData.get("jobId") as string
	const isCompleted = formData.get("isCompleted") === "true"
	const notes = formData.get("notes") as string | null

	await toggleChecklistItemDb(id, isCompleted, userId, notes)

	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export const deleteChecklistItem = async (formData: FormData) => {
	try {
		await requireAuth()
	} catch {
		return
	}

	const id = formData.get("id") as string
	const jobId = formData.get("jobId") as string

	await deleteChecklistItemDb(id)

	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export const deleteJob = async (formData: FormData) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin") return

		const id = formData.get("id") as string
		const confirmation = formData.get("confirmation") as string
		const jobName = formData.get("jobName") as string

		if (confirmation !== jobName) return

		await deleteJobDb(id)

		revalidatePath("/dashboard/jobs")
		revalidatePath("/dashboard")
		redirect("/dashboard/jobs")
	} catch (e) {
		if ((e as Error).message === "NEXT_REDIRECT") throw e
		return
	}
}
