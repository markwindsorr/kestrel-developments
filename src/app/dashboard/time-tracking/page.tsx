import { getCurrentProfile } from "@/lib/db/profiles"
import { getJobs } from "@/lib/db/jobs"
import { getActiveSession, getTimeEntriesWithDetails } from "@/lib/db/time-entries"
import { ClockWidget } from "@/components/time-tracking/clock-widget"
import { TimeLogTable } from "@/components/time-tracking/time-log-table"

export default async function TimeTrackingPage() {
	const profile = await getCurrentProfile()
	const jobs = await getJobs("active")
	const activeSession = await getActiveSession(profile.id)
	const entries = await getTimeEntriesWithDetails()

	const uiJobs = jobs.map((j) => ({
		id: j.id,
		name: j.name,
		address: j.address,
		status: j.status,
		clientName: j.client_name,
		color: j.color,
	}))

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-neutral-900">Time Tracking</h1>
				<p className="mt-1 text-neutral-500">
					Clock your hours and view time logs across all jobs.
				</p>
			</div>

			<div className="mb-8">
				<ClockWidget jobs={uiJobs} initialSession={activeSession} />
			</div>

			<TimeLogTable entries={entries} />
		</div>
	)
}
