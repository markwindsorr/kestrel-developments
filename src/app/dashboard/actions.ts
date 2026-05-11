"use server"

import { revalidatePath } from "next/cache"
import { insertAPItem, markAPItemPaid, deleteAPItem } from "@/lib/db/ap-items"
import { insertTradeSchedule, updateTradeSchedule, deleteTradeSchedule, addDependency, removeDependency } from "@/lib/db/trade-schedules"
import { toggleChecklistItem } from "@/lib/db/checklist-items"

export async function completeTaskAction(id: string): Promise<void> {
	await toggleChecklistItem(id, false)
	revalidatePath("/dashboard")
}

export async function addAPItemAction(formData: FormData): Promise<void> {
	const vendor = formData.get("vendor") as string
	const description = formData.get("description") as string | null
	const amount = parseFloat(formData.get("amount") as string)
	const dueDate = formData.get("dueDate") as string
	const company = formData.get("company") as string
	if (!vendor || isNaN(amount) || !dueDate) return
	await insertAPItem({ vendor, description: description ?? undefined, amount, dueDate, company })
	revalidatePath("/dashboard")
}

export async function markAPPaidAction(id: string): Promise<void> {
	await markAPItemPaid(id)
	revalidatePath("/dashboard")
}

export async function deleteAPItemAction(id: string): Promise<void> {
	await deleteAPItem(id)
	revalidatePath("/dashboard")
}

export async function addTradeScheduleAction(formData: FormData): Promise<void> {
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

export async function updateTradeScheduleAction(id: string, startDate: string, endDate: string): Promise<void> {
	await updateTradeSchedule(id, startDate, endDate)
	revalidatePath("/dashboard")
}

export async function deleteTradeScheduleAction(id: string, jobId: string): Promise<void> {
	await deleteTradeSchedule(id)
	revalidatePath("/dashboard")
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export async function addDependencyAction(fromId: string, toId: string): Promise<{ id: string }> {
	const id = await addDependency(fromId, toId)
	revalidatePath("/dashboard")
	return { id }
}

export async function removeDependencyAction(id: string): Promise<void> {
	await removeDependency(id)
	revalidatePath("/dashboard")
}
