import { CURRENT_USER_ID } from "@/lib/constants"
import { mockJobs, getTimeEntriesWithDetails, getActiveSession } from "@/lib/mock-data"
import { ClockWidget } from "@/components/time-tracking/clock-widget"
import { TimeLogTable } from "@/components/time-tracking/time-log-table"

export default function TimeTrackingPage() {
	const entries = getTimeEntriesWithDetails()
	const activeSession = getActiveSession(CURRENT_USER_ID)

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-neutral-900">Time Tracking</h1>
				<p className="mt-1 text-neutral-500">Clock your hours and view time logs across all jobs.</p>
			</div>

			<div className="mb-8">
				<ClockWidget jobs={mockJobs} initialSession={activeSession} />
			</div>

			<TimeLogTable entries={entries} />
		</div>
	)
}
