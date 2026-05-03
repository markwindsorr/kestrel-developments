"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { requireOrgContext } from "@/lib/db/org"
import {
	insertTemplate,
	updateTemplate as updateTemplateDb,
	deleteTemplate as deleteTemplateDb,
	getTemplateById,
	insertTemplateItem,
	updateTemplateItem as updateTemplateItemDb,
	deleteTemplateItem as deleteTemplateItemDb,
	getMaxTemplateItemSortOrder,
} from "@/lib/db/checklist-templates"

export const createTemplate = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		const { userId, orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") {
			return { error: "Unauthorized" }
		}

		const name = (formData.get("name") as string)?.trim()
		if (!name) return { error: "Template name is required" }

		const templateId = await insertTemplate({
			org_id: orgContext.orgId,
			name,
			created_by: userId,
		})

		revalidatePath("/dashboard/checklists")
		redirect(`/dashboard/checklists/${templateId}`)
	} catch (e) {
		if ((e as Error).message === "NEXT_REDIRECT") throw e
		return { error: (e as Error).message }
	}
}

export const updateTemplateName = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") {
			return { error: "Unauthorized" }
		}

		const id = formData.get("id") as string
		const name = (formData.get("name") as string)?.trim()
		if (!name) return { error: "Template name is required" }

		await updateTemplateDb(id, { name })

		revalidatePath(`/dashboard/checklists/${id}`)
		revalidatePath("/dashboard/checklists")
		return { error: "" }
	} catch (e) {
		return { error: (e as Error).message }
	}
}

export const deleteTemplateAction = async (formData: FormData) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") return

		const id = formData.get("id") as string
		const template = await getTemplateById(id)
		if (template.is_default) return

		await deleteTemplateDb(id)
		revalidatePath("/dashboard/checklists")
		redirect("/dashboard/checklists")
	} catch (e) {
		if ((e as Error).message === "NEXT_REDIRECT") throw e
		return
	}
}

export const addTemplateItemAction = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") {
			return { error: "Unauthorized" }
		}

		const templateId = formData.get("templateId") as string
		const label = (formData.get("label") as string)?.trim()
		const section = (formData.get("section") as string) || ""

		if (!label) return { error: "Item label is required" }

		const maxOrder = await getMaxTemplateItemSortOrder(templateId)
		await insertTemplateItem({
			template_id: templateId,
			section,
			label,
			sort_order: maxOrder + 1,
		})

		revalidatePath(`/dashboard/checklists/${templateId}`)
		return { error: "" }
	} catch (e) {
		return { error: (e as Error).message }
	}
}

export const updateTemplateItemAction = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") {
			return { error: "Unauthorized" }
		}

		const id = formData.get("id") as string
		const templateId = formData.get("templateId") as string
		const label = (formData.get("label") as string)?.trim()
		const section = formData.get("section") as string

		if (!label) return { error: "Item label is required" }

		await updateTemplateItemDb(id, { label, section })

		revalidatePath(`/dashboard/checklists/${templateId}`)
		return { error: "" }
	} catch (e) {
		return { error: (e as Error).message }
	}
}

export const deleteTemplateItemAction = async (formData: FormData) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") return

		const id = formData.get("id") as string
		const templateId = formData.get("templateId") as string

		await deleteTemplateItemDb(id)
		revalidatePath(`/dashboard/checklists/${templateId}`)
	} catch {
		return
	}
}
