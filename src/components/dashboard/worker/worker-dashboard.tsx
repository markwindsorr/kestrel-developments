import { getCurrentProfile } from "@/lib/db/profiles"
import { getJobs } from "@/lib/db/jobs"
import { getEntriesForUserSince } from "@/lib/db/time-entries"
import { getTodosForUser } from "@/lib/db/todo-items"
import type { Job } from "@/lib/types"

import { LogHoursForm } from "./log-hours-form"
import { EntriesList } from "./entries-list"
import { MyTodosPanel } from "./my-todos-panel"

interface WorkerDashboardProps {
	orgId: string
}

const today = () => new Date().toISOString().slice(0, 10)
const weekAgo = () => {
	const d = new Date()
	d.setDate(d.getDate() - 7)
	return d.toISOString().slice(0, 10)
}

export async function WorkerDashboard({ orgId }: WorkerDashboardProps) {
	const profile = await getCurrentProfile()
	const userId = profile.id
	const todayStr = today()

	const [allJobs, todos, recentEntries] = await Promise.all([
		getJobs(orgId, "active"),
		getTodosForUser(userId, orgId),
		getEntriesForUserSince(userId, weekAgo()),
	])

	const uiJobs: Job[] = allJobs.map((j) => ({
		id: j.id,
		name: j.name,
		address: j.address,
		status: j.status,
		clientName: j.client_name,
		color: j.color,
	}))

	const hour = new Date().getHours()
	const greeting =
		hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold text-neutral-900">
					{greeting}, {profile.name.split(" ")[0]}
				</h1>
				<p className="mt-0.5 text-sm text-neutral-500">
					{new Date().toLocaleDateString("en-CA", {
						weekday: "long",
						year: "numeric",
						month: "long",
						day: "numeric",
					})}
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-2">
				<LogHoursForm jobs={uiJobs} defaultDate={todayStr} />
				<EntriesList entries={recentEntries} jobs={uiJobs} />
			</div>

			<MyTodosPanel todos={todos} />
		</div>
	)
}
