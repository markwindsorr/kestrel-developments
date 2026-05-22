"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { insertAPItem, markAPItemPaid, deleteAPItem } from "@/lib/db/ap-items"
import {
	insertTradeSchedule,
	updateTradeSchedule,
	deleteTradeSchedule,
	addDependency,
	removeDependency,
	getScheduleJobId,
	getTradeSchedulesForJob,
	getDependenciesForJob,
	bulkUpdateScheduleDates,
	updateTradeScheduleProgress,
} from "@/lib/db/trade-schedules"
import { cascadeForwardFromPhase } from "@/lib/schedule-cascade"
import { toggleChecklistItem } from "@/lib/db/checklist-items"
import { requireAuth, hasOrgMembership, createOrgForAdmin } from "@/lib/db/org"

export const completeTaskAction = async (id: string): Promise<void> => {
	const userId = await requireAuth()
	await toggleChecklistItem(id, false, userId)
	revalidatePath("/dashboard")
}

export const addAPItemAction = async (formData: FormData): Promise<void> => {
	const vendor = formData.get("vendor") as string
	const description = formData.get("description") as string | null
	const amount = parseFloat(formData.get("amount") as string)
	const dueDate = formData.get("dueDate") as string
	const company = formData.get("company") as string
	if (!vendor || isNaN(amount) || !dueDate) return
	await insertAPItem({ vendor, description: description ?? undefined, amount, dueDate, company })
	revalidatePath("/dashboard")
}

export const markAPPaidAction = async (id: string): Promise<void> => {
	await markAPItemPaid(id)
	revalidatePath("/dashboard")
}

export const deleteAPItemAction = async (id: string): Promise<void> => {
	await deleteAPItem(id)
	revalidatePath("/dashboard")
}

export const addTradeScheduleAction = async (formData: FormData): Promise<void> => {
	const jobId = formData.get("jobId") as string
	const trade = formData.get("trade") as string
	const contractorName = formData.get("contractorName") as string | null
	const startDate = formData.get("startDate") as string
	const endDate = formData.get("endDate") as string
	const color = formData.get("color") as string | null
	const notes = formData.get("notes") as string | null
	if (!jobId || !trade || !startDate || !endDate) return
	await insertTradeSchedule({
		jobId, trade,
		contractorName: contractorName ?? undefined,
		startDate, endDate,
		color: color ?? undefined,
		notes: notes ?? undefined,
	})
	revalidatePath("/dashboard")
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export const updateTradeScheduleAction = async (
	id: string,
	startDate: string,
	endDate: string
): Promise<{ updated: Array<{ id: string; startDate: string; endDate: string }> }> => {
	await updateTradeSchedule(id, startDate, endDate)

	const jobId = await getScheduleJobId(id)
	if (!jobId) {
		revalidatePath("/dashboard")
		return { updated: [] }
	}

	const [schedules, deps] = await Promise.all([
		getTradeSchedulesForJob(jobId),
		getDependenciesForJob(jobId),
	])

	// Use the edited dates for the changed phase (DB read may be stale)
	const phasesForCascade = schedules.map((s) =>
		s.id === id
			? { id: s.id, startDate, endDate }
			: { id: s.id, startDate: s.startDate, endDate: s.endDate }
	)
	const edges = deps.map((d) => ({ fromId: d.fromId, toId: d.toId, lagDays: 0 }))

	const cascaded = cascadeForwardFromPhase(phasesForCascade, edges, id)
	if (cascaded.length > 0) {
		await bulkUpdateScheduleDates(
			cascaded.map((c) => ({
				id: c.id,
				start_date: c.startDate,
				end_date: c.endDate,
			}))
		)
	}

	revalidatePath("/dashboard")
	revalidatePath(`/dashboard/jobs/${jobId}`)
	return { updated: cascaded }
}

export const updateScheduleProgressAction = async (
	id: string,
	progress: number,
	jobId: string
): Promise<void> => {
	await updateTradeScheduleProgress(id, progress)
	revalidatePath("/dashboard")
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export const deleteTradeScheduleAction = async (id: string, jobId: string): Promise<void> => {
	await deleteTradeSchedule(id)
	revalidatePath("/dashboard")
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export const addDependencyAction = async (fromId: string, toId: string): Promise<{ id: string }> => {
	const id = await addDependency(fromId, toId)
	revalidatePath("/dashboard")
	return { id }
}

export const removeDependencyAction = async (id: string): Promise<void> => {
	await removeDependency(id)
	revalidatePath("/dashboard")
}

export const createOrganization = async (
	_prevState: { error: string },
	formData: FormData
) => {
	let userId: string
	try {
		userId = await requireAuth()
	} catch {
		return { error: "Not authenticated" }
	}

	const name = (formData.get("orgName") as string)?.trim()
	if (!name) return { error: "Organization name is required" }

	if (await hasOrgMembership(userId)) {
		return { error: "You are already part of an organization" }
	}

	try {
		await createOrgForAdmin(name, userId)
	} catch (e) {
		return { error: (e as Error).message }
	}

	revalidatePath("/dashboard")
	redirect("/dashboard")
}
