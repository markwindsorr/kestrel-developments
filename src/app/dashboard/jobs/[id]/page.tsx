import Link from "next/link"

import { getJobById } from "@/lib/db/jobs"
import { getChecklistItems } from "@/lib/db/checklist-items"
import { getTimeEntriesByJob } from "@/lib/db/time-entries"
import { getCurrentProfile } from "@/lib/db/profiles"
import { formatDuration, formatDate, formatTime } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checklist } from "@/components/jobs/checklist"
import { DeleteJobButton } from "@/components/jobs/delete-job-button"

export default async function JobDetailPage({
	params,
}: {
	params: Promise<{ id: string }>
}) {
	const { id } = await params
	const [job, checklist, timeEntries, profile] = await Promise.all([
		getJobById(id),
		getChecklistItems(id),
		getTimeEntriesByJob(id),
		getCurrentProfile(),
	])

	const canEdit = profile.role === "admin" || profile.role === "foreman"
	const totalMinutes = timeEntries.reduce(
		(sum, e) => sum + (e.duration ?? 0),
		0
	)

	return (
		<div>
			<div className="mb-8">
				<Link
					href="/dashboard/jobs"
					className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
				>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
					</svg>
					Back to Jobs
				</Link>
				<div className="flex items-center gap-3">
					<div
						className="h-4 w-4 rounded-full"
						style={{ backgroundColor: job.color }}
					/>
					<h1 className="text-2xl font-bold text-neutral-900">{job.name}</h1>
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
				<div className="mt-2 flex items-center gap-4">
					<p className="text-neutral-500">{job.address}</p>
					<span className="text-neutral-300">|</span>
					<p className="text-sm text-neutral-400">Client: {job.client_name}</p>
				</div>
				{profile.role === "admin" && (
					<div className="mt-4">
						<DeleteJobButton jobId={id} jobName={job.name} />
					</div>
				)}
			</div>

			<div className="mb-6 grid gap-6 sm:grid-cols-3">
				<Card>
					<p className="text-2xl font-bold text-neutral-900">
						{formatDuration(totalMinutes)}
					</p>
					<p className="text-sm text-neutral-500">Total Hours Logged</p>
				</Card>
				<Card>
					<p className="text-2xl font-bold text-neutral-900">
						{timeEntries.length}
					</p>
					<p className="text-sm text-neutral-500">Time Entries</p>
				</Card>
				<Card>
					<p className="text-2xl font-bold text-neutral-900">
						{checklist.filter((i) => i.is_completed).length}/{checklist.length}
					</p>
					<p className="text-sm text-neutral-500">Checklist Progress</p>
				</Card>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<div className="lg:col-span-2">
					<Checklist items={checklist} jobId={id} canEdit={canEdit} />
				</div>

				<Card title="Recent Time Entries">
					{timeEntries.length === 0 ? (
						<p className="text-sm text-neutral-400">No time entries yet.</p>
					) : (
						<div className="space-y-3">
							{timeEntries.slice(0, 10).map((entry) => (
								<div
									key={entry.id}
									className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2"
								>
									<div>
										<p className="text-sm font-medium text-neutral-900">
											{entry.user.name}
										</p>
										<p className="text-xs text-neutral-500">
											{formatDate(entry.clockIn)} &middot;{" "}
											{formatTime(entry.clockIn)}
											{entry.clockOut && ` – ${formatTime(entry.clockOut)}`}
										</p>
									</div>
									<div className="text-sm font-medium text-neutral-700">
										{entry.duration ? formatDuration(entry.duration) : (
											<Badge variant="success">Active</Badge>
										)}
									</div>
								</div>
							))}
						</div>
					)}
				</Card>
			</div>
		</div>
	)
}
