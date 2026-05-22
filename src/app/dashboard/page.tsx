import { cookies } from "next/headers"

import { getCurrentProfile, getOrgMembers } from "@/lib/db/profiles"
import { getJobs } from "@/lib/db/jobs"
import {
	getWeeklyStats,
	getTodayActivity,
	getHoursByJob,
} from "@/lib/db/time-entries"
import { getAllTradeSchedules } from "@/lib/db/trade-schedules"
import { getChecklistStatsByJobs } from "@/lib/db/checklist-items"
import { getAPItems } from "@/lib/db/ap-items"
import { getOrgContext } from "@/lib/db/org"
import { buildProjectHealth } from "@/lib/portfolio"
import { todayIso } from "@/lib/schedule-cascade"

import { ExecutiveKpiRow } from "@/components/dashboard/executive-kpi-row"
import { PortfolioHealth } from "@/components/dashboard/portfolio-health"
import { APDuePanel } from "@/components/dashboard/ap-due-panel"
import { TeamActivity } from "@/components/dashboard/team-activity"
import { NoOrgPage } from "@/components/dashboard/no-org-page"
import { AssignTaskPanel } from "@/components/dashboard/assign-task-panel"
import { WorkerDashboard } from "@/components/dashboard/worker/worker-dashboard"
import { SubcontractorDashboard } from "@/components/dashboard/subcontractor/subcontractor-dashboard"

const fmtMoney = (n: number) => {
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
	return `$${Math.round(n).toLocaleString("en-CA")}`
}

export default async function DashboardPage() {
	const orgContext = await getOrgContext()
	if (!orgContext) return <NoOrgPage />

	if (orgContext.role === "worker") {
		return <WorkerDashboard orgId={orgContext.orgId} />
	}

	if (orgContext.role === "subcontractor") {
		return <SubcontractorDashboard orgId={orgContext.orgId} />
	}

	const cookieStore = await cookies()
	const company = cookieStore.get("kestrel-company")?.value ?? "developments"
	const today = todayIso()

	const [
		profile,
		allJobs,
		stats,
		allSchedules,
		todayActivity,
		apItems,
		orgMembers,
	] = await Promise.all([
		getCurrentProfile(),
		getJobs(orgContext.orgId),
		getWeeklyStats(orgContext.orgId),
		getAllTradeSchedules(company),
		getTodayActivity(),
		getAPItems(company),
		getOrgMembers(orgContext.orgId),
	])

	const activeJobs = allJobs.filter((j) => j.status === "active")
	const onHold = allJobs.filter((j) => j.status === "on-hold").length
	const jobIds = activeJobs.map((j) => j.id)

	const [hoursByJob, checklistStats] = await Promise.all([
		getHoursByJob(orgContext.orgId, jobIds),
		getChecklistStatsByJobs(jobIds),
	])

	// Latest scheduled end date per job
	const scheduleEndByJob: Record<string, string> = {}
	for (const s of allSchedules) {
		const cur = scheduleEndByJob[s.jobId]
		if (!cur || s.endDate > cur) scheduleEndByJob[s.jobId] = s.endDate
	}

	// Crew on site today per job
	const crewByJob: Record<string, { name: string; hours: number }[]> = {}
	for (const a of todayActivity) {
		;(crewByJob[a.jobId] ??= []).push({ name: a.name, hours: a.hours })
	}

	const projects = activeJobs
		.map((job) =>
			buildProjectHealth({
				job,
				hoursLogged: hoursByJob[job.id] ?? 0,
				checklist: {
					total: checklistStats[job.id]?.total ?? 0,
					completed: checklistStats[job.id]?.completed ?? 0,
				},
				scheduleEndDate: scheduleEndByJob[job.id] ?? null,
				todayIso: today,
				crewToday: crewByJob[job.id] ?? [],
			})
		)

	const horizon = new Date()
	horizon.setDate(horizon.getDate() + 14)
	const horizonIso = horizon.toISOString().slice(0, 10)
	const dueSoon = apItems.filter((i) => !i.isPaid && i.dueDate <= horizonIso)
	const dueSoonTotal = dueSoon.reduce((s, i) => s + i.amount, 0)
	const apTotal = apItems.reduce((s, i) => s + i.amount, 0)

	// ── Budget rollup ──
	const budgeted = projects.filter((p) => p.budget.status !== "unset")
	const totalBudgetHrs = budgeted.reduce(
		(s, p) => s + (p.budget.budgetHours ?? 0),
		0
	)
	const totalLoggedHrs = budgeted.reduce((s, p) => s + p.budget.hoursLogged, 0)
	const atRisk = projects.filter(
		(p) => p.budget.status === "red" || p.budget.status === "yellow"
	).length
	const overBudget = projects.filter((p) => p.budget.status === "red").length

	// ── KPI tiles ──
	const kpis = [
		{
			label: "Active Projects",
			value: String(activeJobs.length),
			sub: onHold > 0 ? `${onHold} on hold` : "All in motion",
			tone: "neutral" as const,
		},
		{
			label: "Budget Health",
			value: atRisk === 0 ? "On track" : `${atRisk} at risk`,
			sub:
				totalBudgetHrs > 0
					? `${totalLoggedHrs.toFixed(0)}/${totalBudgetHrs.toFixed(0)}h portfolio`
					: "No budgets set",
			tone:
				overBudget > 0
					? ("bad" as const)
					: atRisk > 0
						? ("warn" as const)
						: ("good" as const),
		},
		{
			label: "Hours This Week",
			value: `${stats.totalHours.toFixed(0)}h`,
			sub: `${stats.todaysUserCount} working today`,
			tone: "neutral" as const,
		},
		{
			label: "Cash Out · 14d",
			value: fmtMoney(dueSoonTotal),
			sub: `${fmtMoney(apTotal)} total unpaid`,
			tone:
				dueSoon.length > 0 ? ("warn" as const) : ("good" as const),
		},
	]

	const hour = new Date().getHours()
	const greeting =
		hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
	const companyLabel =
		company === "electrical" ? "Kestrel Electrical" : "Kestrel Developments"

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<p className="mb-0.5 text-xs font-bold uppercase tracking-widest text-brand-600">
						{companyLabel} · Command Center
					</p>
					<h1 className="text-3xl font-bold text-neutral-900">
						{greeting}, {profile.name.split(" ")[0]}
					</h1>
				</div>
				<p className="text-sm text-neutral-500">
					{new Date().toLocaleDateString("en-CA", {
						weekday: "long",
						year: "numeric",
						month: "long",
						day: "numeric",
					})}
				</p>
			</div>

			{/* Executive KPIs */}
			<ExecutiveKpiRow kpis={kpis} />

			{/* Portfolio */}
			<PortfolioHealth projects={projects} />

			{/* AP Due */}
			<APDuePanel items={dueSoon} allItems={apItems} company={company} />

			{/* Assign tasks to workers */}
			<AssignTaskPanel
				workers={orgMembers.filter((m) => m.role === "worker")}
				jobs={activeJobs}
			/>

			{/* Team */}
			<TeamActivity sessions={todayActivity} weeklyHours={stats.totalHours} />
		</div>
	)
}
