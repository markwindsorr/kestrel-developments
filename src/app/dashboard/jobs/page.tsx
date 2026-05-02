import Link from "next/link"

import { getJobs } from "@/lib/db/jobs"
import { getCurrentProfile } from "@/lib/db/profiles"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default async function JobsPage({
	searchParams,
}: {
	searchParams: Promise<{ status?: string }>
}) {
	const { status } = await searchParams
	const profile = await getCurrentProfile()
	const jobs = await getJobs(
		status as "active" | "on-hold" | "completed" | undefined
	)
	const canCreate = profile.role === "admin" || profile.role === "foreman"

	return (
		<div>
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-neutral-900">Jobs</h1>
					<p className="mt-1 text-neutral-500">
						Manage your construction projects.
					</p>
				</div>
				{canCreate && (
					<Link href="/dashboard/jobs/new">
						<Button variant="primary">New Job</Button>
					</Link>
				)}
			</div>

			<div className="mb-6 flex gap-2">
				<Link
					href="/dashboard/jobs"
					className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
						!status
							? "bg-brand-600 text-white"
							: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
					}`}
				>
					All
				</Link>
				<Link
					href="/dashboard/jobs?status=active"
					className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
						status === "active"
							? "bg-brand-600 text-white"
							: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
					}`}
				>
					Active
				</Link>
				<Link
					href="/dashboard/jobs?status=on-hold"
					className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
						status === "on-hold"
							? "bg-brand-600 text-white"
							: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
					}`}
				>
					On Hold
				</Link>
				<Link
					href="/dashboard/jobs?status=completed"
					className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
						status === "completed"
							? "bg-brand-600 text-white"
							: "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
					}`}
				>
					Completed
				</Link>
			</div>

			{jobs.length === 0 ? (
				<div className="rounded-xl border border-neutral-200 bg-white p-12 text-center">
					<p className="text-neutral-500">No jobs found.</p>
					{canCreate && (
						<Link href="/dashboard/jobs/new" className="mt-2 inline-block text-sm text-brand-600 hover:underline">
							Create your first job
						</Link>
					)}
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{jobs.map((job) => (
						<Link
							key={job.id}
							href={`/dashboard/jobs/${job.id}`}
							className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="mb-3 flex items-center justify-between">
								<div className="flex items-center gap-2">
									<div
										className="h-3 w-3 rounded-full"
										style={{ backgroundColor: job.color }}
									/>
									<h3 className="font-semibold text-neutral-900">
										{job.name}
									</h3>
								</div>
								<Badge
									variant={
										job.status === "active"
											? "success"
											: job.status === "on-hold"
												? "warning"
												: "default"
									}
								>
									{job.status}
								</Badge>
							</div>
							<p className="text-sm text-neutral-600">{job.address}</p>
							<p className="mt-1 text-xs text-neutral-400">
								{job.client_name}
							</p>
						</Link>
					))}
				</div>
			)}
		</div>
	)
}
