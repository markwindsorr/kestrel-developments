import { createClient } from "@/lib/supabase/server"
import type { DbChecklistTemplate, DbChecklistTemplateItem } from "@/lib/types"
import { CHECKLIST_TEMPLATE } from "@/lib/checklist-template"

export interface TemplateSummary {
	id: string
	name: string
	is_default: boolean
	item_count: number
}

export const getTemplates = async (orgId: string): Promise<TemplateSummary[]> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("checklist_templates")
		.select("id, name, is_default, checklist_template_items(count)")
		.eq("org_id", orgId)
		.order("created_at")

	if (error) throw error

	return (data as unknown as { id: string; name: string; is_default: boolean; checklist_template_items: [{ count: number }] }[]).map((t) => ({
		id: t.id,
		name: t.name,
		is_default: t.is_default,
		item_count: t.checklist_template_items[0]?.count ?? 0,
	}))
}

export const getTemplateById = async (id: string): Promise<DbChecklistTemplate> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("checklist_templates")
		.select("*")
		.eq("id", id)
		.single()

	if (error) throw error
	return data as DbChecklistTemplate
}

export const getTemplateItems = async (templateId: string): Promise<DbChecklistTemplateItem[]> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("checklist_template_items")
		.select("*")
		.eq("template_id", templateId)
		.order("sort_order")

	if (error) throw error
	return data as DbChecklistTemplateItem[]
}

export const insertTemplate = async (fields: {
	org_id: string
	name: string
	created_by: string
}): Promise<string> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("checklist_templates")
		.insert(fields)
		.select("id")
		.single()

	if (error) throw error
	return data.id
}

export const updateTemplate = async (id: string, fields: { name: string }) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("checklist_templates")
		.update(fields)
		.eq("id", id)

	if (error) throw error
}

export const deleteTemplate = async (id: string) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("checklist_templates")
		.delete()
		.eq("id", id)

	if (error) throw error
}

export const insertTemplateItem = async (fields: {
	template_id: string
	section: string
	label: string
	sort_order: number
}): Promise<string> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("checklist_template_items")
		.insert(fields)
		.select("id")
		.single()

	if (error) throw error
	return data.id
}

export const insertTemplateItems = async (
	rows: { template_id: string; section: string; label: string; sort_order: number }[]
) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("checklist_template_items")
		.insert(rows)

	if (error) throw error
}

export const updateTemplateItem = async (
	id: string,
	fields: { label?: string; section?: string }
) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("checklist_template_items")
		.update(fields)
		.eq("id", id)

	if (error) throw error
}

export const deleteTemplateItem = async (id: string) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("checklist_template_items")
		.delete()
		.eq("id", id)

	if (error) throw error
}

export const getMaxTemplateItemSortOrder = async (templateId: string): Promise<number> => {
	const supabase = await createClient()
	const { data } = await supabase
		.from("checklist_template_items")
		.select("sort_order")
		.eq("template_id", templateId)
		.order("sort_order", { ascending: false })
		.limit(1)

	return data && data.length > 0 ? data[0].sort_order : -1
}

export const seedDefaultTemplate = async (orgId: string, userId: string): Promise<string> => {
	const templateId = await insertTemplate({
		org_id: orgId,
		name: "Standard Residential Build",
		created_by: userId,
	})

	const rows = CHECKLIST_TEMPLATE.map((item, i) => ({
		template_id: templateId,
		section: item.section,
		label: item.label,
		sort_order: i,
	}))

	await insertTemplateItems(rows)
	return templateId
}
