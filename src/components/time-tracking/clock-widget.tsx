"use client"

import { useState } from "react"

import type { Job, ActiveClockSession } from "@/lib/types"
import { formatTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ActiveTimer } from "@/components/time-tracking/active-timer"
import { JobSelector } from "@/components/time-tracking/job-selector"

interface ClockWidgetProps {
	jobs: Job[]
	initialSession: ActiveClockSession | null
}

export function ClockWidget({ jobs, initialSession }: ClockWidgetProps) {
	const [session, setSession] = useState<{
		clockIn: string
		jobId: string
		jobName: string
	} | null>(
		initialSession
			? {
					clockIn: initialSession.timeEntry.clockIn,
					jobId: initialSession.job.id,
					jobName: initialSession.job.name
				}
			: null
	)
	const [selectedJobId, setSelectedJobId] = useState(initialSession?.job.id ?? "")

	const isClockedIn = session !== null
	const activeJobs = jobs.filter(j => j.status === "active")

	function handleClockIn() {
		if (!selectedJobId) return
		const job = jobs.find(j => j.id === selectedJobId)
		if (!job) return

		setSession({
			clockIn: new Date().toISOString(),
			jobId: job.id,
			jobName: job.name
		})
	}

	function handleClockOut() {
		setSession(null)
	}

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
				<h2 className="mb-4 text-lg font-semibold text-neutral-900">Clock Status</h2>

				{isClockedIn ? (
					<div className="space-y-4">
						<div>
							<p className="text-sm text-neutral-500">Clocked in to</p>
							<p className="text-base font-medium text-neutral-900">{session.jobName}</p>
							<p className="mt-1 text-sm text-neutral-400">Since {formatTime(session.clockIn)}</p>
						</div>
						<ActiveTimer clockInTime={session.clockIn} />
						<Button variant="danger" size="lg" className="w-full" onClick={handleClockOut}>
							Clock Out
						</Button>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex h-[72px] items-center">
							<p className="text-sm text-neutral-400">Not currently clocked in</p>
						</div>
						<Button
							variant="primary"
							size="lg"
							className="w-full"
							onClick={handleClockIn}
							disabled={!selectedJobId}
						>
							Clock In
						</Button>
					</div>
				)}
			</div>

			<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
				<h2 className="mb-4 text-lg font-semibold text-neutral-900">Job Selection</h2>
				<JobSelector
					jobs={activeJobs}
					selectedJobId={selectedJobId}
					onSelect={setSelectedJobId}
					disabled={isClockedIn}
				/>
				{selectedJobId && !isClockedIn && (
					<div className="mt-4 rounded-lg bg-neutral-50 p-3">
						<p className="text-xs text-neutral-500">Selected job</p>
						<p className="text-sm font-medium text-neutral-700">
							{activeJobs.find(j => j.id === selectedJobId)?.name}
						</p>
						<p className="text-xs text-neutral-400">
							{activeJobs.find(j => j.id === selectedJobId)?.address}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
