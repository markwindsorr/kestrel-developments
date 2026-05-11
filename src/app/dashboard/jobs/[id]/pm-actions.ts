"use server"

import { revalidatePath } from "next/cache"
import { deleteJobDocument } from "@/lib/db/job-documents"
import { deleteJobPhoto } from "@/lib/db/job-photos"
import { createAdminClient } from "@/lib/supabase/admin"
import {
	insertChangeOrder,
	updateChangeOrderStatus,
	deleteChangeOrder,
	type ChangeOrderStatus,
} from "@/lib/db/change-orders"
import {
	insertSelection,
	updateSelectionStatus,
	deleteSelection,
	type SelectionStatus,
} from "@/lib/db/selections"
import {
	insertWarrantyItem,
	updateWarrantyItemStatus,
	deleteWarrantyItem,
	type WarrantyPriority,
	type WarrantyStatus,
} from "@/lib/db/warranty-items"

// ── Change Orders ──────────────────────────────────────────

export async function addChangeOrderAction(jobId: string, formData: FormData): Promise<void> {
	const title = formData.get("title") as string
	const description = formData.get("description") as string
	const amountRaw = formData.get("amount") as string
	const type = formData.get("type") as string // "addition" | "deduction"

	if (!title || !amountRaw) return
	const abs = parseFloat(amountRaw)
	if (isNaN(abs)) return
	const amount = type === "deduction" ? -Math.abs(abs) : Math.abs(abs)

	await insertChangeOrder({ jobId, title, description: description || undefined, amount })
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export async function updateChangeOrderStatusAction(
	jobId: string,
	id: string,
	status: ChangeOrderStatus
): Promise<void> {
	await updateChangeOrderStatus(id, status)
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export async function deleteChangeOrderAction(jobId: string, id: string): Promise<void> {
	await deleteChangeOrder(id)
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

// ── Selections ─────────────────────────────────────────────

export async function addSelectionAction(jobId: string, formData: FormData): Promise<void> {
	const category = formData.get("category") as string
	const item = formData.get("item") as string
	const allowanceRaw = formData.get("allowance") as string
	const dueDate = formData.get("dueDate") as string
	const notes = formData.get("notes") as string

	if (!category || !item) return
	const allowance = allowanceRaw ? parseFloat(allowanceRaw) : undefined

	await insertSelection({
		jobId,
		category: category.trim(),
		item: item.trim(),
		allowance: allowance && !isNaN(allowance) ? allowance : undefined,
		dueDate: dueDate || undefined,
		notes: notes || undefined,
	})
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export async function updateSelectionAction(
	jobId: string,
	id: string,
	status: SelectionStatus,
	clientChoice?: string,
	actualCost?: number
): Promise<void> {
	await updateSelectionStatus(id, status, clientChoice, actualCost)
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export async function deleteSelectionAction(jobId: string, id: string): Promise<void> {
	await deleteSelection(id)
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

// ── Warranty Items ─────────────────────────────────────────

export async function addWarrantyItemAction(jobId: string, formData: FormData): Promise<void> {
	const title = formData.get("title") as string
	const description = formData.get("description") as string
	const priority = formData.get("priority") as WarrantyPriority
	const reportedDate = formData.get("reportedDate") as string

	if (!title) return

	await insertWarrantyItem({
		jobId,
		title,
		description: description || undefined,
		priority: priority || "medium",
		reportedDate: reportedDate || undefined,
	})
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export async function updateWarrantyStatusAction(
	jobId: string,
	id: string,
	status: WarrantyStatus
): Promise<void> {
	await updateWarrantyItemStatus(id, status)
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

export async function deleteWarrantyItemAction(jobId: string, id: string): Promise<void> {
	await deleteWarrantyItem(id)
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

// ── Documents ──────────────────────────────────────────────

export async function deleteJobDocumentAction(jobId: string, id: string): Promise<void> {
	const storagePath = await deleteJobDocument(id)
	if (storagePath) {
		const admin = createAdminClient()
		await admin.storage.from("project-documents").remove([storagePath])
	}
	revalidatePath(`/dashboard/jobs/${jobId}`)
}

// ── Photos ─────────────────────────────────────────────────

export async function deleteJobPhotoAction(jobId: string, id: string): Promise<void> {
	const storagePath = await deleteJobPhoto(id)
	if (storagePath) {
		const admin = createAdminClient()
		await admin.storage.from("project-documents").remove([storagePath])
	}
	revalidatePath(`/dashboard/jobs/${jobId}`)
}
