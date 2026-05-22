import { createClient } from "@/lib/supabase/server"

export interface TemplatePhase {
	id: string
	templateId: string
	externalRef: string | null
	trade: string
	durationDays: number
	color: string
	notes: string | null
	sortOrder: number
}

export interface TemplateDependency {
	id: string
	templateId: string
	fromPhaseId: string
	toPhaseId: string
	lagDays: number
}

export interface ScheduleTemplate {
	id: string
	orgId: string
	name: string
	isDefault: boolean
}

export const getDefaultScheduleTemplate = async (
	orgId: string
): Promise<ScheduleTemplate | null> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("schedule_templates")
		.select("id, org_id, name, is_default")
		.eq("org_id", orgId)
		.eq("is_default", true)
		.maybeSingle()

	if (error || !data) return null
	return {
		id: data.id,
		orgId: data.org_id,
		name: data.name,
		isDefault: data.is_default,
	}
}

export const getTemplatePhases = async (
	templateId: string
): Promise<TemplatePhase[]> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("schedule_template_phases")
		.select("*")
		.eq("template_id", templateId)
		.order("sort_order")

	if (error || !data) return []
	return data.map((r) => ({
		id: r.id,
		templateId: r.template_id,
		externalRef: r.external_ref,
		trade: r.trade,
		durationDays: r.duration_days,
		color: r.color,
		notes: r.notes,
		sortOrder: r.sort_order,
	}))
}

export const getTemplateDependencies = async (
	templateId: string
): Promise<TemplateDependency[]> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("schedule_template_dependencies")
		.select("*")
		.eq("template_id", templateId)

	if (error || !data) return []
	return data.map((r) => ({
		id: r.id,
		templateId: r.template_id,
		fromPhaseId: r.from_phase_id,
		toPhaseId: r.to_phase_id,
		lagDays: r.lag_days,
	}))
}
