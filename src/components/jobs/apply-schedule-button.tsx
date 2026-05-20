"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { applyScheduleTemplate } from "@/app/dashboard/jobs/actions"

interface ApplyScheduleButtonProps {
	jobId: string
	defaultStartDate: string
	hasExistingSchedule: boolean
}

export function ApplyScheduleButton({
	jobId,
	defaultStartDate,
	hasExistingSchedule,
}: ApplyScheduleButtonProps) {
	const [state, formAction, pending] = useActionState(applyScheduleTemplate, {
		error: "",
	})
	const [startDate, setStartDate] = useState(defaultStartDate)
	const [confirming, setConfirming] = useState(false)

	const label = hasExistingSchedule
		? "Reapply schedule from start date"
		: "Install default schedule"

	return (
		<div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4">
			<form
				action={(fd) => {
					formAction(fd)
					setConfirming(false)
				}}
				className="space-y-3"
			>
				<input type="hidden" name="jobId" value={jobId} />

				<div>
					<label
						htmlFor="schedule-start"
						className="mb-1 block text-sm font-medium text-neutral-700"
					>
						Project start date
					</label>
					<input
						id="schedule-start"
						name="startDate"
						type="date"
						required
						value={startDate}
						onChange={(e) => setStartDate(e.target.value)}
						className="block rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
					/>
					<p className="mt-1 text-xs text-neutral-500">
						All 41 phases will be installed cascading from this date, skipping weekends.
					</p>
				</div>

				{state.error !== "" && (
					<div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
						{state.error}
					</div>
				)}

				{state.installed !== undefined && state.error === "" && (
					<div className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
						Installed {state.installed} phases. Refresh to see updates.
					</div>
				)}

				{hasExistingSchedule && !confirming ? (
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onClick={() => setConfirming(true)}
					>
						{label}
					</Button>
				) : (
					<div className="flex items-center gap-2">
						{hasExistingSchedule && (
							<p className="flex-1 text-xs text-amber-700">
								⚠ This will replace all existing phases and dependencies on this job.
							</p>
						)}
						<Button type="submit" variant="primary" size="sm" disabled={pending}>
							{pending ? "Applying..." : hasExistingSchedule ? "Confirm reapply" : label}
						</Button>
						{confirming && (
							<button
								type="button"
								onClick={() => setConfirming(false)}
								className="text-xs font-medium text-neutral-500 hover:text-neutral-700"
							>
								Cancel
							</button>
						)}
					</div>
				)}
			</form>
		</div>
	)
}
