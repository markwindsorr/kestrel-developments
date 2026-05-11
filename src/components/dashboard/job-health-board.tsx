import Link from "next/link"
import type { DbJob } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

interface JobHealth {
	job: DbJob
	total: number
	completed: number
}

export function JobHealthBoard({ jobs }: { jobs: JobHealth[] }) {
	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-5 h-full flex flex-col">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="font-semibold text-neutral-900">Active Jobs</h2>
					<p className="text-xs text-neutral-500 mt-0.5">{jobs.length} job{jobs.length !== 1 ? "s" : ""} in progress</p>
				</div>
				<Link href="/dashboard/jobs" className="text-xs font-medium text-brand-600 hover:underline">
					All jobs →
				</Link>
			</div>

			{jobs.length === 0 ? (
				<p className="text-sm text-neutral-400 text-center py-8">No active jobs</p>
			) : (
				<div className="space-y-3 flex-1">
					{jobs.map(({ job, total, completed }) => {
						const pct = total > 0 ? Math.round((completed / total) * 100) : 0
						const barColor = pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-blue-500" : "bg-amber-400"

						return (
							<Link key={job.id} href={`/dashboard/jobs/${job.id}`} className="block group">
								<div className="flex items-center gap-2 mb-1">
									<div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: job.color }} />
									<p className="text-sm font-medium text-neutral-900 truncate flex-1 group-hover:text-brand-600 transition-colors">{job.name}</p>
									<span className="text-xs text-neutral-400 shrink-0">{pct}%</span>
								</div>
								<div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden ml-4">
									<div
										className={`h-full rounded-full transition-all ${barColor}`}
										style={{ width: `${pct}%` }}
									/>
								</div>
								<p className="text-xs text-neutral-400 mt-0.5 ml-4">{job.client_name} · {completed}/{total} items</p>
							</Link>
						)
					})}
				</div>
			)}
		</div>
	)
}
