import { redirect } from "next/navigation"

import { getCurrentProfile } from "@/lib/db/profiles"
import { getJobs } from "@/lib/db/jobs"
import {
	getEntriesForUserSince,
	getTimeEntriesWithDetails,
} from "@/lib/db/time-entries"
import { getOrgContext } from "@/lib/db/org"
import { LogHoursForm } from "@/components/dashboard/worker/log-hours-form"
import { EntriesList } from "@/components/dashboard/worker/entries-list"
import { TimeLogTable } from "@/components/time-tracking/time-log-table"

const today = () => new Date().toISOString().slice(0, 10)
const weekAgo = () => {
	const d = new Date()
	d.setDate(d.getDate() - 7)
	return d.toISOString().slice(0, 10)
}

export default async function TimeTrackingPage() {
	const orgContext = await getOrgContext()
	if (!orgContext) redirect("/dashboard")

	// Time clock is for employees only — subcontractors are not hourly.
	if (orgContext.role === "subcontractor") redirect("/dashboard")

	const profile = await getCurrentProfile()
	const [jobs, recentEntries, orgEntries] = await Promise.all([
		getJobs(orgContext.orgId, "active"),
		getEntriesForUserSince(profile.id, weekAgo()),
		getTimeEntriesWithDetails(orgContext.orgId),
	])

	const uiJobs = jobs.map((j) => ({
		id: j.id,
		name: j.name,
		address: j.address,
		status: j.status,
		clientName: j.client_name,
		color: j.color,
	}))

	const canSeeOrgLog =
		orgContext.role === "admin" || orgContext.role === "foreman"

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-neutral-900">Time Tracking</h1>
				<p className="mt-1 text-neutral-500">
					Log your hours at the end of each day. Split across jobs as needed.
				</p>
			</div>

			<div className="mb-8 grid gap-6 lg:grid-cols-2">
				<LogHoursForm jobs={uiJobs} defaultDate={today()} />
				<EntriesList entries={recentEntries} jobs={uiJobs} />
			</div>

			{canSeeOrgLog && <TimeLogTable entries={orgEntries} />}
		</div>
	)
}
