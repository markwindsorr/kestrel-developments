import { cookies } from "next/headers"

import { getCurrentProfile } from "@/lib/db/profiles"
import { getJobs } from "@/lib/db/jobs"
import { getWeeklyStats, getActiveSessions } from "@/lib/db/time-entries"
import { getAllTradeSchedules } from "@/lib/db/trade-schedules"
import { getAllPendingChangeOrders } from "@/lib/db/change-orders"
import { getAllHighPriorityOpenWarranty } from "@/lib/db/warranty-items"
import { getChecklistStatsByJobs } from "@/lib/db/checklist-items"
import { getLeads } from "@/lib/db/leads"
import { getOrgContext } from "@/lib/db/org"

import { WeeklyFocus } from "@/components/dashboard/weekly-focus"
import { AttentionPanel } from "@/components/dashboard/attention-panel"
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule"
import { JobSiteCard } from "@/components/dashboard/job-site-card"
import { TeamActivity } from "@/components/dashboard/team-activity"
import { NoOrgPage } from "@/components/dashboard/no-org-page"
import { formatDuration } from "@/lib/utils"

function toLocal(dateStr: string) {
	const [y, m, d] = dateStr.split("-").map(Number)
	return new Date(y, m - 1, d)
}

export default async function DashboardPage() {
	const orgContext = await getOrgContext()

	if (!orgContext) {
		return <NoOrgPage />
	}

	const cookieStore = await cookies()
	const company = cookieStore.get("kestrel-company")?.value ?? "developments"

	const [profile, allJobs, stats, allSchedules, pendingCOs, urgentWarranty, activeSessions, allLeads] = await Promise.all([
		getCurrentProfile(),
		getJobs(orgContext.orgId),
		getWeeklyStats(orgContext.orgId),
		getAllTradeSchedules(company),
		getAllPendingChangeOrders(),
		getAllHighPriorityOpenWarranty(),
		getActiveSessions(),
		getLeads(),
	])

	const activeJobs = allJobs.filter(j => j.status === "active")
	const checklistStats = await getChecklistStatsByJobs(activeJobs.map(j => j.id))

	// Group crew by job
	const crewByJob = activeSessions.reduce<Record<string, { name: string; clockIn: string }[]>>((acc, s) => {
		if (!acc[s.jobId]) acc[s.jobId] = []
		acc[s.jobId].push({ name: s.name, clockIn: s.clockIn })
		return acc
	}, {})

	// Open issues (COs + warranty) by job
	const issuesByJob: Record<string, number> = {}
	for (const co of pendingCOs) {
		issuesByJob[co.jobId] = (issuesByJob[co.jobId] ?? 0) + 1
	}
	for (const w of urgentWarranty) {
		issuesByJob[w.jobId] = (issuesByJob[w.jobId] ?? 0) + 1
	}

	// Current / next trade phase per job
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	const phaseByJob: Record<string, { current: typeof allSchedules[0] | null; next: typeof allSchedules[0] | null }> = {}
	for (const job of activeJobs) {
		const jobSchedules = allSchedules
			.filter(s => s.jobId === job.id)
			.sort((a, b) => toLocal(a.startDate).getTime() - toLocal(b.startDate).getTime())

		const current = jobSchedules.find(s => toLocal(s.startDate) <= today && toLocal(s.endDate) >= today) ?? null
		const next = jobSchedules.find(s => toLocal(s.startDate) > today) ?? null
		phaseByJob[job.id] = { current, next }
	}

	// Stale leads
	const staleLeads = allLeads.filter(l => {
		const days = (Date.now() - new Date(l.updatedAt).getTime()) / 86_400_000
		return days > 7 && l.stage !== "won" && l.stage !== "lost"
	})

	// Schedules enriched with job info for WeeklySchedule
	const schedulesWithJob = allSchedules.map(s => {
		const job = allJobs.find(j => j.id === s.jobId)
		return { ...s, jobName: job?.name ?? "Unknown", jobColor: job?.color ?? "#888" }
	})

	// Phase count this week
	const weekStart = new Date(today)
	weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7))
	const weekEnd = new Date(weekStart)
	weekEnd.setDate(weekStart.getDate() + 6)
	const phasesThisWeek = allSchedules.filter(s => toLocal(s.startDate) <= weekEnd && toLocal(s.endDate) >= weekStart).length

	const hour = new Date().getHours()
	const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
	const companyLabel = company === "electrical" ? "Kestrel Electrical" : "Kestrel Developments"

	// Sort jobs: crew on site first, then by name
	const sortedJobs = [...activeJobs].sort((a, b) => {
		const aOnSite = (crewByJob[a.id]?.length ?? 0) > 0 ? 0 : 1
		const bOnSite = (crewByJob[b.id]?.length ?? 0) > 0 ? 0 : 1
		return aOnSite - bOnSite
	})

	return (
		<div className="space-y-6">

			{/* ── Header ── */}
			<div>
				<p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-0.5">{companyLabel}</p>
				<h1 className="text-3xl font-bold text-neutral-900">
					{greeting}, {profile.name.split(" ")[0]}
				</h1>
				<p className="mt-0.5 text-sm text-neutral-500">
					{new Date().toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
				</p>
			</div>

			{/* ── Weekly Focus ── */}
			<div>
				<p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-2">This Week&apos;s Focus</p>
				<WeeklyFocus />
			</div>

			{/* ── Site pulse stats ── */}
			<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<StatPill
					label="Active Sites"
					value={String(activeJobs.length)}
					sub={`${allJobs.filter(j => j.status === "on-hold").length} on hold`}
					dot="bg-brand-600"
				/>
				<StatPill
					label="Crew Out Now"
					value={String(stats.activeCount)}
					sub={`${formatDuration(stats.totalMinutes)} logged this week`}
					dot="bg-green-500"
					pulse
				/>
				<StatPill
					label="Phases This Week"
					value={String(phasesThisWeek)}
					sub={allSchedules.length > 0 ? `${allSchedules.length} total scheduled` : "None scheduled"}
					dot="bg-blue-500"
				/>
				<StatPill
					label="Open Issues"
					value={String(pendingCOs.length + urgentWarranty.length)}
					sub={staleLeads.length > 0 ? `+ ${staleLeads.length} stale leads` : "Sales on track"}
					dot={pendingCOs.length + urgentWarranty.length > 0 ? "bg-amber-400" : "bg-neutral-300"}
				/>
			</div>

			{/* ── Job Sites ── */}
			<div>
				<p className="text-xs font-bold uppercase tracking-widest text-neutral-400 mb-3">Job Sites</p>
				{sortedJobs.length === 0 ? (
					<div className="rounded-xl border border-neutral-200 bg-white p-10 text-center">
						<p className="text-sm text-neutral-400">No active jobs — <a href="/dashboard/jobs/new" className="text-brand-600 hover:underline">create one</a></p>
					</div>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
						{sortedJobs.map(job => (
							<JobSiteCard
								key={job.id}
								job={job}
								total={checklistStats[job.id]?.total ?? 0}
								completed={checklistStats[job.id]?.completed ?? 0}
								crew={crewByJob[job.id] ?? []}
								currentPhase={phaseByJob[job.id]?.current ?? null}
								nextPhase={phaseByJob[job.id]?.next ?? null}
								openIssues={issuesByJob[job.id] ?? 0}
							/>
						))}
					</div>
				)}
			</div>

			{/* ── Schedule + Attention ── */}
			<div className="grid gap-6 xl:grid-cols-2">
				<WeeklySchedule schedules={schedulesWithJob} />
				<AttentionPanel
					pendingCOs={pendingCOs}
					urgentWarranty={urgentWarranty}
					staleLeads={staleLeads}
				/>
			</div>

			{/* ── Team Activity ── */}
			<TeamActivity sessions={activeSessions} weeklyMinutes={stats.totalMinutes} />

		</div>
	)
}

function StatPill({ label, value, sub, dot, pulse }: {
	label: string; value: string; sub?: string; dot: string; pulse?: boolean
}) {
	return (
		<div className="rounded-xl border border-neutral-200 bg-white px-4 py-3.5">
			<div className="flex items-center gap-2 mb-1">
				<span className={`h-2 w-2 rounded-full shrink-0 ${dot} ${pulse ? "animate-pulse" : ""}`} />
				<p className="text-xs font-medium text-neutral-500">{label}</p>
			</div>
			<p className="text-2xl font-bold text-neutral-900 tabular-nums">{value}</p>
			{sub && <p className="text-xs text-neutral-400 mt-0.5">{sub}</p>}
		</div>
	)
}
