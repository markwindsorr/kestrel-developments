import { getCurrentProfile } from "@/lib/db/profiles"
import { getJobs } from "@/lib/db/jobs"
import {
	getHoursByJob,
	getRecentJobsForUser,
	getEntriesForUserSince,
} from "@/lib/db/time-entries"
import { getChecklistStatsByJobs } from "@/lib/db/checklist-items"
import {
	getTodosForUser,
	getOpenTodoCountsByJob,
} from "@/lib/db/todo-items"
import { computeBudgetStatus } from "@/lib/budget"
import type { Job } from "@/lib/types"

import { LogHoursForm } from "./log-hours-form"
import { EntriesList } from "./entries-list"
import { MyTodosPanel } from "./my-todos-panel"
import { WorkerJobCard } from "./worker-job-card"

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

	const [allJobs, todos, recentJobIds, recentEntries] = await Promise.all([
		getJobs(orgId, "active"),
		getTodosForUser(userId, orgId),
		getRecentJobsForUser(userId),
		getEntriesForUserSince(userId, weekAgo()),
	])

	const jobIds = allJobs.map((j) => j.id)
	const [hoursByJob, checklistStats, openTodosByJob] = await Promise.all([
		getHoursByJob(orgId, jobIds),
		getChecklistStatsByJobs(jobIds),
		getOpenTodoCountsByJob(userId, jobIds),
	])

	const recencyIndex = new Map<string, number>()
	recentJobIds.forEach((id, i) => recencyIndex.set(id, i))
	const sortedJobs = [...allJobs].sort((a, b) => {
		const ai = recencyIndex.has(a.id) ? recencyIndex.get(a.id)! : Infinity
		const bi = recencyIndex.has(b.id) ? recencyIndex.get(b.id)! : Infinity
		if (ai !== bi) return ai - bi
		return a.name.localeCompare(b.name)
	})

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

			<div>
				<p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">
					My job sites
				</p>
				{sortedJobs.length === 0 ? (
					<div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
						<p className="text-sm text-neutral-400">
							No active jobs right now.
						</p>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{sortedJobs.map((job) => {
							const budget = computeBudgetStatus({
								hoursLogged: hoursByJob[job.id] ?? 0,
								budgetHours: job.budget_hours_total,
								startDate: job.planned_start_date,
								plannedEndDate: job.planned_end_date,
							})
							return (
								<WorkerJobCard
									key={job.id}
									job={job}
									checklist={{
										total: checklistStats[job.id]?.total ?? 0,
										completed: checklistStats[job.id]?.completed ?? 0,
									}}
									budget={budget}
									openTodos={openTodosByJob[job.id] ?? 0}
								/>
							)
						})}
					</div>
				)}
			</div>
		</div>
	)
}
