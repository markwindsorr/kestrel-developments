"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { insertLead, updateLeadStage, updateLeadJobId, deleteLead, type LeadStage } from "@/lib/db/leads"
import { insertJob } from "@/lib/db/jobs"

export async function addLeadAction(formData: FormData): Promise<void> {
	const cookieStore = await cookies()
	const company = cookieStore.get("kestrel-company")?.value ?? "developments"

	const clientName = formData.get("clientName") as string
	const contactName = formData.get("contactName") as string | null
	const email = formData.get("email") as string | null
	const phone = formData.get("phone") as string | null
	const address = formData.get("address") as string | null
	const projectType = formData.get("projectType") as string
	const estimatedValueRaw = formData.get("estimatedValue") as string | null
	const stage = (formData.get("stage") as LeadStage) ?? "lead"
	const notes = formData.get("notes") as string | null

	if (!clientName) return

	const estimatedValue = estimatedValueRaw ? parseFloat(estimatedValueRaw) : undefined

	await insertLead({
		clientName,
		contactName: contactName || undefined,
		email: email || undefined,
		phone: phone || undefined,
		address: address || undefined,
		projectType: projectType || "New Build",
		estimatedValue: estimatedValue && !isNaN(estimatedValue) ? estimatedValue : undefined,
		stage,
		notes: notes || undefined,
		company,
	})

	revalidatePath("/dashboard/sales")
}

export async function updateLeadStageAction(id: string, stage: LeadStage): Promise<void> {
	await updateLeadStage(id, stage)
	revalidatePath("/dashboard/sales")
}

export async function deleteLeadAction(id: string): Promise<void> {
	await deleteLead(id)
	revalidatePath("/dashboard/sales")
}

export async function convertToJobAction(leadId: string, formData: FormData): Promise<void> {
	const name = formData.get("name") as string
	const address = formData.get("address") as string
	const clientName = formData.get("clientName") as string
	const color = formData.get("color") as string ?? "#8b2c2c"

	if (!name || !clientName) return

	const jobId = await insertJob({
		name,
		address: address || "",
		client_name: clientName,
		status: "active",
		color,
	})

	await updateLeadJobId(leadId, jobId)
	revalidatePath("/dashboard/sales")
	revalidatePath("/dashboard/jobs")
	redirect(`/dashboard/jobs/${jobId}`)
}
