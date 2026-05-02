"use client"

import { useActionState } from "react"
import { useState } from "react"

import type { Job } from "@/lib/types"
import { formatTime } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ActiveTimer } from "@/components/time-tracking/active-timer"
import { JobSelector } from "@/components/time-tracking/job-selector"
import { clockIn, clockOut } from "@/app/dashboard/time-tracking/actions"

interface ClockWidgetProps {
	jobs: Job[]
	initialSession: {
		timeEntry: { id: string; clockIn: string; jobId: string }
		job: { id: string; name: string }
	} | null
}

export function ClockWidget({ jobs, initialSession }: ClockWidgetProps) {
	const [selectedJobId, setSelectedJobId] = useState(initialSession?.job.id ?? "")
	const [clockInState, clockInAction, clockInPending] = useActionState(clockIn, {
		error: "",
	})
	const [clockOutState, clockOutAction, clockOutPending] = useActionState(clockOut, {
		error: "",
	})

	const isClockedIn = initialSession !== null
	const activeJobs = jobs.filter((j) => j.status === "active")

	return (
		<div className="grid gap-6 lg:grid-cols-2">
			<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
				<h2 className="mb-4 text-lg font-semibold text-neutral-900">
					Clock Status
				</h2>

				{(clockInState.error !== "" || clockOutState.error !== "") && (
					<div className="mb-4 rounded-lg bg-danger/10 px-4 py-2 text-sm text-danger">
						{clockInState.error || clockOutState.error}
					</div>
				)}

				{isClockedIn ? (
					<div className="space-y-4">
						<div>
							<p className="text-sm text-neutral-500">Clocked in to</p>
							<p className="text-base font-medium text-neutral-900">
								{initialSession.job.name}
							</p>
							<p className="mt-1 text-sm text-neutral-400">
								Since {formatTime(initialSession.timeEntry.clockIn)}
							</p>
						</div>
						<ActiveTimer clockInTime={initialSession.timeEntry.clockIn} />
						<form action={clockOutAction}>
							<Button
								type="submit"
								variant="danger"
								size="lg"
								className="w-full"
								disabled={clockOutPending}
							>
								{clockOutPending ? "Clocking out..." : "Clock Out"}
							</Button>
						</form>
					</div>
				) : (
					<div className="space-y-4">
						<div className="flex h-[72px] items-center">
							<p className="text-sm text-neutral-400">
								Not currently clocked in
							</p>
						</div>
						<form action={clockInAction}>
							<input type="hidden" name="jobId" value={selectedJobId} />
							<Button
								type="submit"
								variant="primary"
								size="lg"
								className="w-full"
								disabled={!selectedJobId || clockInPending}
							>
								{clockInPending ? "Clocking in..." : "Clock In"}
							</Button>
						</form>
					</div>
				)}
			</div>

			<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
				<h2 className="mb-4 text-lg font-semibold text-neutral-900">
					Job Selection
				</h2>
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
							{activeJobs.find((j) => j.id === selectedJobId)?.name}
						</p>
						<p className="text-xs text-neutral-400">
							{activeJobs.find((j) => j.id === selectedJobId)?.address}
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
