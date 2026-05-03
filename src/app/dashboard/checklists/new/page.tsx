import { redirect } from "next/navigation"

import { getOrgContext } from "@/lib/db/org"
import { NewTemplateForm } from "@/components/checklists/new-template-form"

export default async function NewTemplatePage() {
	const orgContext = await getOrgContext()
	if (!orgContext) redirect("/dashboard")

	if (orgContext.role !== "admin" && orgContext.role !== "foreman") {
		redirect("/dashboard/checklists")
	}

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-neutral-900">
					New Template
				</h1>
				<p className="mt-1 text-neutral-500">
					Create a new checklist template.
				</p>
			</div>
			<div className="max-w-lg">
				<NewTemplateForm />
			</div>
		</div>
	)
}
