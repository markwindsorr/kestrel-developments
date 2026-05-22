"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import {
	insertJob,
	updateJob as updateJobDb,
	updateJobBudget as updateJobBudgetDb,
	deleteJob as deleteJobDb,
} from "@/lib/db/jobs"
import {
	getMaxSortOrder,
	insertChecklistItem,
	insertChecklistItems,
	toggleChecklistItem as toggleChecklistItemDb,
	deleteChecklistItem as deleteChecklistItemDb,
} from "@/lib/db/checklist-items"
import { getTemplateItems } from "@/lib/db/checklist-templates"
import { requireAuth, requireOrgContext } from "@/lib/db/org"
import { applyDefaultScheduleTemplate } from "@/lib/apply-schedule"
import { todayIso } from "@/lib/schedule-cascade"

const parseNumber = (v: FormDataEntryValue | null): number | null => {
	if (v === null) return null
	const s = String(v).trim()
	if (s === "") return null
	const n = Number(s)
	return Number.isFinite(n) ? n : null
}

const parseDate = (v: FormDataEntryValue | null): string | null => {
	if (v === null) return null
	const s = String(v).trim()
	return s === "" ? null : s
}

const parseBudget = (formData: FormData) => ({
	budget_days: parseNumber(formData.get("budgetDays")),
	budget_hours_per_day: parseNumber(formData.get("budgetHoursPerDay")),
	budget_workers: parseNumber(formData.get("budgetWorkers")),
	planned_start_date: parseDate(formData.get("plannedStartDate")),
	planned_end_date: parseDate(formData.get("plannedEndDate")),
})

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
		const budget = parseBudget(formData)

		const jobId = await insertJob({
			name,
			address,
			client_name: clientName,
			status: status || "active",
			color: color || "#2563eb",
			org_id: orgContext.orgId,
			template_id: templateId || null,
			...budget,
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

		// Auto-apply default schedule template using planned start date (or today)
		try {
			await applyDefaultScheduleTemplate({
				orgId: orgContext.orgId,
				jobId,
				startDate: budget.planned_start_date ?? todayIso(),
			})
		} catch (scheduleErr) {
			// Don't block job creation if schedule install fails
			console.error("Schedule template apply failed:", scheduleErr)
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
	const budget = parseBudget(formData)

	try {
		await updateJobDb(id, {
			name,
			address,
			client_name: clientName,
			status,
			color,
			...budget,
		})
	} catch (e) {
		return { error: (e as Error).message }
	}

	revalidatePath("/dashboard/jobs")
	revalidatePath(`/dashboard/jobs/${id}`)
	revalidatePath("/dashboard")
	return { error: "" }
}

export const updateJobBudget = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") {
			return { error: "Only admins and foremen can set budgets" }
		}

		const id = formData.get("id") as string
		if (!id) return { error: "Missing job id" }

		const budget = parseBudget(formData)
		await updateJobBudgetDb(id, budget)

		revalidatePath("/dashboard/jobs")
		revalidatePath(`/dashboard/jobs/${id}`)
		revalidatePath("/dashboard")
		return { error: "" }
	} catch (e) {
		return { error: (e as Error).message }
	}
}

export const applyScheduleTemplate = async (
	_prevState: { error: string; installed?: number },
	formData: FormData
) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") {
			return { error: "Only admins and foremen can apply schedule templates" }
		}

		const jobId = String(formData.get("jobId") ?? "")
		const startDate = String(formData.get("startDate") ?? todayIso())
		if (!jobId) return { error: "Missing job id" }

		const installed = await applyDefaultScheduleTemplate({
			orgId: orgContext.orgId,
			jobId,
			startDate,
		})

		if (installed === null) {
			return { error: "No default schedule template exists for this org" }
		}

		revalidatePath(`/dashboard/jobs/${jobId}`)
		revalidatePath("/dashboard/jobs")
		revalidatePath("/dashboard")
		return { error: "", installed }
	} catch (e) {
		return { error: (e as Error).message }
	}
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
