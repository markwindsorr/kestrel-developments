import Link from "next/link"
import { redirect } from "next/navigation"

import { getOrgContext } from "@/lib/db/org"
import { getTemplates } from "@/lib/db/checklist-templates"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default async function ChecklistTemplatesPage() {
	const orgContext = await getOrgContext()
	if (!orgContext) redirect("/dashboard")

	const canEdit = orgContext.role === "admin" || orgContext.role === "foreman"
	const templates = await getTemplates(orgContext.orgId)

	return (
		<div>
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-neutral-900">
						Checklist Templates
					</h1>
					<p className="mt-1 text-neutral-500">
						Manage reusable checklists for your jobs.
					</p>
				</div>
				{canEdit && (
					<Link href="/dashboard/checklists/new">
						<Button variant="primary">New Template</Button>
					</Link>
				)}
			</div>

			{templates.length === 0 ? (
				<p className="text-sm text-neutral-400">No templates yet.</p>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{templates.map((template) => (
						<Link
							key={template.id}
							href={`/dashboard/checklists/${template.id}`}
						>
							<Card className="transition-shadow hover:shadow-md">
								<div className="flex items-start justify-between">
									<div>
										<h3 className="font-semibold text-neutral-900">
											{template.name}
										</h3>
										<p className="mt-1 text-sm text-neutral-500">
											{template.item_count} item{template.item_count !== 1 ? "s" : ""}
										</p>
									</div>
									{template.is_default && (
										<Badge variant="info">Default</Badge>
									)}
								</div>
							</Card>
						</Link>
					))}
				</div>
			)}
		</div>
	)
}
