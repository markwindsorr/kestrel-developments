import { cookies } from "next/headers"

import { getCurrentProfile } from "@/lib/db/profiles"
import { getJobs } from "@/lib/db/jobs"
import {
	getWeeklyStats,
	getTodayActivity,
	getHoursByJob,
} from "@/lib/db/time-entries"
import { getAllTradeSchedules } from "@/lib/db/trade-schedules"
import { getAllPendingChangeOrders } from "@/lib/db/change-orders"
import { getAllHighPriorityOpenWarranty } from "@/lib/db/warranty-items"
import { getChecklistStatsByJobs } from "@/lib/db/checklist-items"
import { getAPItems } from "@/lib/db/ap-items"
import { getOrgContext } from "@/lib/db/org"
import { buildProjectHealth } from "@/lib/portfolio"
import { todayIso } from "@/lib/schedule-cascade"

import { ExecutiveKpiRow } from "@/components/dashboard/executive-kpi-row"
import { PortfolioHealth } from "@/components/dashboard/portfolio-health"
import { RiskRadar, type RiskItem } from "@/components/dashboard/risk-radar"
import { APDuePanel } from "@/components/dashboard/ap-due-panel"
import { WeeklySchedule } from "@/components/dashboard/weekly-schedule"
import { TeamActivity } from "@/components/dashboard/team-activity"
import { NoOrgPage } from "@/components/dashboard/no-org-page"
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
		pendingCOs,
		urgentWarranty,
		todayActivity,
		apItems,
	] = await Promise.all([
		getCurrentProfile(),
		getJobs(orgContext.orgId),
		getWeeklyStats(orgContext.orgId),
		getAllTradeSchedules(company),
		getAllPendingChangeOrders(),
		getAllHighPriorityOpenWarranty(),
		getTodayActivity(),
		getAPItems(company),
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
		.sort((a, b) => b.riskScore - a.riskScore)

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
	const behindCount = projects.filter(
		(p) => p.schedule.health === "behind" || p.schedule.health === "overdue"
	).length

	const openRisks =
		pendingCOs.length + urgentWarranty.length + overBudget + behindCount

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
		{
			label: "Open Risks",
			value: String(openRisks),
			sub:
				openRisks > 0
					? `${overBudget} over budget · ${behindCount} behind`
					: "Nothing flagged",
			tone:
				openRisks === 0
					? ("good" as const)
					: overBudget + behindCount > 0
						? ("bad" as const)
						: ("warn" as const),
			accent: true,
		},
	]

	// ── Risk radar ──
	const risks: RiskItem[] = []
	for (const p of projects) {
		if (p.budget.status === "red") {
			risks.push({
				severity: "critical",
				title: `${p.job.name} over budget`,
				detail: `${p.budget.pct}% used · ${p.budget.hoursLogged.toFixed(0)}/${p.budget.budgetHours}h`,
				href: `/dashboard/jobs/${p.job.id}`,
			})
		}
		if (p.schedule.health === "overdue") {
			risks.push({
				severity: "critical",
				title: `${p.job.name} overdue`,
				detail: `Planned end passed ${p.schedule.slipDays}d ago`,
				href: `/dashboard/jobs/${p.job.id}?tab=schedule`,
			})
		} else if (p.schedule.health === "behind") {
			risks.push({
				severity: "high",
				title: `${p.job.name} behind schedule`,
				detail: `Tracking ${p.schedule.slipDays}d past planned end`,
				href: `/dashboard/jobs/${p.job.id}?tab=schedule`,
			})
		}
		if (p.budget.status === "yellow") {
			risks.push({
				severity: "high",
				title: `${p.job.name} budget tightening`,
				detail: `${p.budget.pct}% of hours used`,
				href: `/dashboard/jobs/${p.job.id}`,
			})
		}
	}
	for (const co of pendingCOs.slice(0, 5)) {
		const abs = Math.abs(co.amount)
		risks.push({
			severity: "high",
			title: `Change order pending: ${co.title}`,
			detail: `${co.jobName} · ${co.amount >= 0 ? "+" : "−"}${fmtMoney(abs)}`,
			href: `/dashboard/jobs/${co.jobId}?tab=change-orders`,
		})
	}
	for (const w of urgentWarranty.slice(0, 5)) {
		risks.push({
			severity: "high",
			title: `Warranty: ${w.title}`,
			detail: `${w.jobName} · high priority`,
			href: `/dashboard/jobs/${w.jobId}?tab=warranty`,
		})
	}
	const hour = new Date().getHours()
	const greeting =
		hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
	const companyLabel =
		company === "electrical" ? "Kestrel Electrical" : "Kestrel Developments"

	const schedulesWithJob = allSchedules.map((s) => {
		const job = allJobs.find((j) => j.id === s.jobId)
		return {
			...s,
			jobName: job?.name ?? "Unknown",
			jobColor: job?.color ?? "#888",
		}
	})

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

			{/* Portfolio + Risk */}
			<div className="grid gap-6 xl:grid-cols-3">
				<div className="xl:col-span-2">
					<PortfolioHealth projects={projects} />
				</div>
				<RiskRadar items={risks} />
			</div>

			{/* AP Due */}
			<APDuePanel items={dueSoon} allItems={apItems} company={company} />

			{/* Schedule + team */}
			<WeeklySchedule schedules={schedulesWithJob} />
			<TeamActivity sessions={todayActivity} weeklyHours={stats.totalHours} />
		</div>
	)
}
