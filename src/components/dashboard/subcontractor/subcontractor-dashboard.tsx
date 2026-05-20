import Link from "next/link"

import { getCurrentProfile } from "@/lib/db/profiles"
import { getJobs } from "@/lib/db/jobs"
import { getHoursByJob } from "@/lib/db/time-entries"
import { getChecklistStatsByJobs } from "@/lib/db/checklist-items"
import { computeBudgetStatus } from "@/lib/budget"
import { RagBadge } from "@/components/dashboard/worker/rag-badge"

interface SubcontractorDashboardProps {
	orgId: string
}

export async function SubcontractorDashboard({
	orgId,
}: SubcontractorDashboardProps) {
	const profile = await getCurrentProfile()
	const allJobs = await getJobs(orgId, "active")
	const jobIds = allJobs.map((j) => j.id)

	const [hoursByJob, checklistStats] = await Promise.all([
		getHoursByJob(orgId, jobIds),
		getChecklistStatsByJobs(jobIds),
	])

	const jobs = [...allJobs].sort((a, b) => a.name.localeCompare(b.name))

	const hour = new Date().getHours()
	const greeting =
		hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

	return (
		<div className="space-y-6">
			<div>
				<p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-brand-600">
					Subcontractor
				</p>
				<h1 className="text-3xl font-bold text-neutral-900">
					{greeting}, {profile.name.split(" ")[0]}
				</h1>
				<p className="mt-0.5 text-sm text-neutral-500">
					Your active jobs — plans, schedule, and progress.
				</p>
			</div>

			{jobs.length === 0 ? (
				<div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
					<p className="text-sm text-neutral-400">No active jobs right now.</p>
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					{jobs.map((job) => {
						const budget = computeBudgetStatus({
							hoursLogged: hoursByJob[job.id] ?? 0,
							budgetHours: job.budget_hours_total,
							startDate: job.planned_start_date,
							plannedEndDate: job.planned_end_date,
						})
						const cl = checklistStats[job.id] ?? { total: 0, completed: 0 }
						const pct =
							cl.total > 0
								? Math.round((cl.completed / cl.total) * 100)
								: 0

						return (
							<div
								key={job.id}
								className="overflow-hidden rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-md"
							>
								<div className="flex items-start gap-2.5 border-b border-neutral-100 px-4 py-3">
									<span
										className="mt-1 h-3 w-3 shrink-0 rounded-full"
										style={{ backgroundColor: job.color }}
									/>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-semibold text-neutral-900">
											{job.name}
										</p>
										<p className="truncate text-xs text-neutral-400">
											{job.address}
										</p>
									</div>
								</div>

								<div className="space-y-3 px-4 py-3">
									<div>
										<RagBadge budget={budget} />
										{budget.status !== "unset" && (
											<p className="mt-1.5 text-xs text-neutral-500 tabular-nums">
												{budget.hoursLogged.toFixed(1)}h of{" "}
												{budget.budgetHours}h budgeted
											</p>
										)}
									</div>

									<div>
										<div className="mb-1 flex items-center justify-between text-xs">
											<span className="text-neutral-500">Checklist</span>
											<span className="font-semibold text-neutral-700">
												{pct}% · {cl.completed}/{cl.total}
											</span>
										</div>
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
											<div
												className="h-full rounded-full bg-blue-500"
												style={{ width: `${pct}%` }}
											/>
										</div>
									</div>
								</div>

								<div className="grid grid-cols-2 divide-x divide-neutral-100 border-t border-neutral-100 bg-neutral-50/50 text-center">
									<Link
										href={`/dashboard/jobs/${job.id}?tab=plans-specs`}
										className="px-2 py-2.5 text-xs font-semibold text-brand-600 hover:bg-neutral-100"
									>
										Plans &amp; Specs
									</Link>
									<Link
										href={`/dashboard/jobs/${job.id}?tab=schedule`}
										className="px-2 py-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
									>
										Schedule
									</Link>
								</div>
							</div>
						)
					})}
				</div>
			)}
		</div>
	)
}
