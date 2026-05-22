"use server"

import { revalidatePath } from "next/cache"
import {
	insertTimeEntries,
	updateTimeEntry as updateTimeEntryDb,
	deleteTimeEntry as deleteTimeEntryDb,
} from "@/lib/db/time-entries"
import { requireOrgContext } from "@/lib/db/org"

interface RowInput {
	jobId: string
	hours: number
	dailyTask: string
}

const parseRowsFromForm = (formData: FormData): RowInput[] => {
	const rows: RowInput[] = []
	for (const [key, value] of formData.entries()) {
		const match = key.match(/^row\[(\d+)\]\[(jobId|hours|dailyTask)\]$/)
		if (!match) continue
		const idx = parseInt(match[1], 10)
		const field = match[2] as keyof RowInput
		if (!rows[idx]) rows[idx] = { jobId: "", hours: 0, dailyTask: "" }
		if (field === "hours") {
			rows[idx].hours = parseFloat(String(value)) || 0
		} else {
			rows[idx][field] = String(value)
		}
	}
	return rows.filter(Boolean)
}

const isValidIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

export interface LogHoursState {
	error: string
	savedAt?: string
	savedCount?: number
	savedHours?: number
}

export const logHours = async (
	_prevState: LogHoursState,
	formData: FormData
): Promise<LogHoursState> => {
	try {
		const { userId, orgContext } = await requireOrgContext()
		if (orgContext.role === "subcontractor") {
			return { error: "Subcontractors do not log hours" }
		}

		const workDate = String(formData.get("workDate") ?? "").trim()
		if (!isValidIsoDate(workDate)) return { error: "Pick a valid date" }

		const rows = parseRowsFromForm(formData)
		const filled = rows.filter(
			(r) => r.jobId && r.hours > 0 && r.dailyTask.trim()
		)
		if (filled.length === 0) {
			return { error: "Add at least one row with job, hours, and description" }
		}
		for (const r of filled) {
			if (r.hours <= 0 || r.hours > 24) {
				return { error: "Hours per row must be between 0 and 24" }
			}
		}

		await insertTimeEntries(
			filled.map((r) => ({
				user_id: userId,
				job_id: r.jobId,
				org_id: orgContext.orgId,
				work_date: workDate,
				hours: r.hours,
				daily_task: r.dailyTask.trim(),
				notes: null,
			}))
		)

		const totalHours = filled.reduce((s, r) => s + r.hours, 0)

		revalidatePath("/dashboard")
		revalidatePath("/dashboard/time-tracking")
		return {
			error: "",
			savedAt: new Date().toISOString(),
			savedCount: filled.length,
			savedHours: Math.round(totalHours * 10) / 10,
		}
	} catch (e) {
		return { error: (e as Error).message }
	}
}

export const updateTimeEntry = async (
	_prevState: LogHoursState,
	formData: FormData
): Promise<LogHoursState> => {
	try {
		await requireOrgContext()
		const id = String(formData.get("id") ?? "")
		const jobId = String(formData.get("jobId") ?? "")
		const workDate = String(formData.get("workDate") ?? "")
		const hours = parseFloat(String(formData.get("hours") ?? ""))
		const dailyTask = String(formData.get("dailyTask") ?? "").trim()

		if (!id) return { error: "Missing entry id" }
		if (!jobId) return { error: "Pick a job" }
		if (!isValidIsoDate(workDate)) return { error: "Pick a valid date" }
		if (!Number.isFinite(hours) || hours <= 0 || hours > 24) {
			return { error: "Hours must be between 0 and 24" }
		}
		if (!dailyTask) return { error: "Description is required" }

		await updateTimeEntryDb(id, {
			job_id: jobId,
			work_date: workDate,
			hours,
			daily_task: dailyTask,
		})

		revalidatePath("/dashboard")
		revalidatePath("/dashboard/time-tracking")
		return { error: "", savedAt: new Date().toISOString() }
	} catch (e) {
		return { error: (e as Error).message }
	}
}

export const deleteTimeEntry = async (formData: FormData) => {
	try {
		await requireOrgContext()
	} catch {
		return
	}
	const id = String(formData.get("id") ?? "")
	if (!id) return
	await deleteTimeEntryDb(id)
	revalidatePath("/dashboard")
	revalidatePath("/dashboard/time-tracking")
}
