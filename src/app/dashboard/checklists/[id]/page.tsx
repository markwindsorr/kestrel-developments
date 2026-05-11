import Link from "next/link"
import { redirect } from "next/navigation"

import { getOrgContext } from "@/lib/db/org"
import { getTemplateById, getTemplateItems } from "@/lib/db/checklist-templates"
import { Badge } from "@/components/ui/badge"
import { TemplateEditor } from "@/components/checklists/template-editor"
import { DeleteTemplateButton } from "@/components/checklists/delete-template-button"

export default async function TemplateDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const orgContext = await getOrgContext()
	if (!orgContext) redirect("/dashboard")

	const { id } = await params
	const [template, items] = await Promise.all([
		getTemplateById(id),
		getTemplateItems(id),
	])

	const canEdit = orgContext.role === "admin" || orgContext.role === "foreman"

	return (
		<div>
			<div className="mb-8">
				<Link
					href="/dashboard/checklists"
					className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
				>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
					</svg>
					Back to Templates
				</Link>
				<div className="flex items-center gap-3">
					<h1 className="text-2xl font-bold text-neutral-900">
						{template.name}
					</h1>
					{template.is_default && (
						<Badge variant="info">Default</Badge>
					)}
				</div>
				<p className="mt-1 text-neutral-500">
					{items.length} item{items.length !== 1 ? "s" : ""}
				</p>
				{canEdit && !template.is_default && (
					<div className="mt-4">
						<DeleteTemplateButton templateId={id} templateName={template.name} />
					</div>
				)}
			</div>

			<div className="max-w-3xl">
				<TemplateEditor template={template} items={items} canEdit={canEdit} />
			</div>
		</div>
	)
}
