import { JobForm } from "@/components/jobs/job-form"

export default function NewJobPage() {
	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-neutral-900">New Job</h1>
				<p className="mt-1 text-neutral-500">
					Create a new construction project.
				</p>
			</div>
			<div className="max-w-lg">
				<JobForm />
			</div>
		</div>
	)
}
