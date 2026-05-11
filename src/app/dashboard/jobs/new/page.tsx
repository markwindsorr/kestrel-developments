import { redirect } from "next/navigation"

import { getOrgContext } from "@/lib/db/org"
import { getTemplates } from "@/lib/db/checklist-templates"
import { JobForm } from "@/components/jobs/job-form"

export default async function NewJobPage() {
	const orgContext = await getOrgContext()
	if (!orgContext) redirect("/dashboard")

	const templates = await getTemplates(orgContext.orgId)

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-neutral-900">New Job</h1>
				<p className="mt-1 text-neutral-500">
					Create a new construction project.
				</p>
			</div>
			<div className="max-w-lg">
				<JobForm templates={templates} />
			</div>
		</div>
	)
}
