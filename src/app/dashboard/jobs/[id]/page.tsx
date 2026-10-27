import Link from "next/link"
import { redirect } from "next/navigation"

import { getJobById } from "@/lib/db/jobs"
import { getChecklistItems } from "@/lib/db/checklist-items"
import { getTimeEntriesByJob } from "@/lib/db/time-entries"
import { getOrgContext } from "@/lib/db/org"
import { getOrgMembers } from "@/lib/db/profiles"
import { getProjectsForJob } from "@/lib/db/projects"
import { getTradeSchedulesForJob, getAllDependencies } from "@/lib/db/trade-schedules"
import { getChangeOrders } from "@/lib/db/change-orders"
import { getSelections } from "@/lib/db/selections"
import { getWarrantyItems } from "@/lib/db/warranty-items"
import { getJobDocuments, getSignedUrl } from "@/lib/db/job-documents"
import { getJobPhotos, getSignedPhotoUrls } from "@/lib/db/job-photos"
import { formatDate } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Checklist } from "@/components/jobs/checklist"
import { DeleteJobButton } from "@/components/jobs/delete-job-button"
import { TradeSchedulePanel } from "@/components/jobs/trade-schedule-panel"
import { GanttChart } from "@/components/dashboard/gantt-chart"
import { JobTabs } from "@/components/jobs/job-tabs"
import { ChangeOrdersPanel } from "@/components/jobs/change-orders-panel"
import { SelectionsPanel } from "@/components/jobs/selections-panel"
import { WarrantyPanel } from "@/components/jobs/warranty-panel"
import { PlansSpecsPanel } from "@/components/jobs/plans-specs-panel"
import { PhotosPanel } from "@/components/jobs/photos-panel"
import { BudgetEditor } from "@/components/jobs/budget-editor"
import { ApplyScheduleButton } from "@/components/jobs/apply-schedule-button"
import { resolveJobTab } from "@/lib/job-tabs"

export default async function JobDetailPage({
	params,
	searchParams,
}: {
	params: Promise<{ id: string }>
	searchParams: Promise<{ tab?: string }>
}) {
	const orgContext = await getOrgContext()
	if (!orgContext) redirect("/dashboard")

	const { id } = await params
	const { tab: requestedTab = "overview" } = await searchParams
	// Resolve to a tab this role may actually view — a spoofed ?tab=warranty
	// falls back to overview, so the guarded blocks below never render.
	const tab = resolveJobTab(requestedTab, orgContext.role)

	const [job, checklist, timeEntries, members, projects, tradeSchedules, allDeps, changeOrders, selections, warrantyItems, rawDocuments, rawPhotos] = await Promise.all([
		getJobById(id),
		getChecklistItems(id),
		getTimeEntriesByJob(id),
		getOrgMembers(orgContext.orgId),
		getProjectsForJob(id),
		getTradeSchedulesForJob(id),
		getAllDependencies(),
		getChangeOrders(id),
		getSelections(id),
		getWarrantyItems(id),
		getJobDocuments(id),
		getJobPhotos(id),
	])

	const [documents, photos] = await Promise.all([
		Promise.all(rawDocuments.map(async doc => ({ ...doc, signedUrl: await getSignedUrl(doc.storagePath) }))),
		getSignedPhotoUrls(rawPhotos),
	])

	const memberNames: Record<string, string> = {}
	for (const m of members) {
		memberNames[m.id] = m.name
	}

	const canEdit = orgContext.role === "admin" || orgContext.role === "foreman"
	const totalHours = timeEntries.reduce((sum, e) => sum + e.hours, 0)

	const ganttSchedules = tradeSchedules.map(s => ({
		...s,
		jobName: job.name,
		jobColor: job.color,
	}))

	const scheduleIds = new Set(tradeSchedules.map(s => s.id))
	const dependencies = allDeps.filter(d => scheduleIds.has(d.fromId) || scheduleIds.has(d.toId))

	const tabCounts = {
		"change-orders": changeOrders.filter(c => c.status === "pending").length,
		selections: selections.filter(s => s.status === "pending").length,
		warranty: warrantyItems.filter(w => w.status === "open").length,
		"plans-specs": documents.length,
		photos: photos.length,
	}

	return (
		<div>
			{/* Header */}
			<div className="mb-6">
				<Link
					href="/dashboard/jobs"
					className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
				>
					<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
						<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
					</svg>
					Back to Jobs
				</Link>
				<div className="flex items-center gap-3">
					<div className="h-4 w-4 rounded-full" style={{ backgroundColor: job.color }} />
					<h1 className="text-2xl font-bold text-neutral-900">{job.name}</h1>
					<Badge
						variant={
							job.status === "active" ? "success" : job.status === "on-hold" ? "warning" : "default"
						}
					>
						{job.status}
					</Badge>
				</div>
				<div className="mt-2 flex items-center gap-4">
					<p className="text-neutral-500">{job.address}</p>
					<span className="text-neutral-300">|</span>
					<p className="text-sm text-neutral-400">Client: {job.client_name}</p>
				</div>
				{orgContext.role === "admin" && (
					<div className="mt-4">
						<DeleteJobButton jobId={id} jobName={job.name} />
					</div>
				)}
			</div>

			{/* Tabs */}
			<JobTabs active={tab} jobId={id} userRole={orgContext.role} counts={tabCounts} />

			{/* ── Overview ── */}
			{tab === "overview" && (
				<div>
					<div className="mb-6">
						<BudgetEditor
							jobId={id}
							initial={{
								budgetDays: job.budget_days,
								budgetHoursPerDay: job.budget_hours_per_day,
								budgetWorkers: job.budget_workers,
								plannedStartDate: job.planned_start_date,
								plannedEndDate: job.planned_end_date,
							}}
							hoursLogged={totalHours}
							canEdit={canEdit}
						/>
					</div>

					<div className="mb-6 grid gap-4 sm:grid-cols-2">
						<Card>
							<p className="text-2xl font-bold text-neutral-900">{timeEntries.length}</p>
							<p className="text-sm text-neutral-500">Time Entries</p>
						</Card>
						<Card>
							<p className="text-2xl font-bold text-neutral-900">
								{checklist.filter(i => i.is_completed).length}/{checklist.length}
							</p>
							<p className="text-sm text-neutral-500">Checklist Progress</p>
						</Card>
					</div>

					{projects.length > 0 && (
						<div className="mb-6 rounded-xl border border-neutral-200 bg-white p-5">
							<h2 className="font-semibold text-neutral-900 mb-3">Takeoff Projects</h2>
							<div className="space-y-2">
								{projects.map(p => (
									<div key={p.id} className="flex items-center justify-between rounded-lg border border-neutral-100 px-4 py-3">
										<div>
											<p className="text-sm font-medium text-neutral-900">{p.name}</p>
											<p className="text-xs text-neutral-400 mt-0.5">
												{p.measurements.length} measurement{p.measurements.length !== 1 ? "s" : ""}
												{" · "}
												Updated {new Date(p.updatedAt).toLocaleDateString("en-CA")}
											</p>
										</div>
										<Link
											href={`/dashboard/takeoff/house?project=${p.id}`}
											className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
										>
											Open in Takeoff
										</Link>
									</div>
								))}
							</div>
						</div>
					)}

					<div className="grid gap-6 lg:grid-cols-3">
						<div className="lg:col-span-2">
							<Checklist items={checklist} jobId={id} canEdit={canEdit} memberNames={memberNames} />
						</div>
						<Card title="Recent Time Entries">
							{timeEntries.length === 0 ? (
								<p className="text-sm text-neutral-400">No time entries yet.</p>
							) : (
								<div className="space-y-3">
									{timeEntries.slice(0, 10).map(entry => (
										<div key={entry.id} className="flex items-center justify-between rounded-lg bg-neutral-50 px-3 py-2">
											<div className="min-w-0">
												<p className="text-sm font-medium text-neutral-900 truncate">{entry.user.name}</p>
												<p className="text-xs text-neutral-500 truncate">
													{formatDate(entry.workDate)}
													{entry.dailyTask ? ` · ${entry.dailyTask}` : ""}
												</p>
											</div>
											<div className="text-sm font-medium text-neutral-700 tabular-nums shrink-0">
												{entry.hours.toFixed(1)}h
											</div>
										</div>
									))}
								</div>
							)}
						</Card>
					</div>
				</div>
			)}

			{/* ── Schedule ── */}
			{tab === "schedule" && (
				<div className="space-y-4">
					{canEdit && (
						<ApplyScheduleButton
							jobId={id}
							defaultStartDate={job.planned_start_date ?? new Date().toISOString().slice(0, 10)}
							hasExistingSchedule={tradeSchedules.length > 0}
						/>
					)}
					<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
						<div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
							<div>
								<h2 className="font-semibold text-neutral-900">Trade Schedule</h2>
								<p className="text-xs text-neutral-500 mt-0.5">
									{tradeSchedules.length > 0
										? `${tradeSchedules.length} phase${tradeSchedules.length !== 1 ? "s" : ""} scheduled`
										: "No phases scheduled yet"}
								</p>
							</div>
						</div>
						<GanttChart schedules={ganttSchedules} dependencies={dependencies} />
						<div className="border-t border-neutral-100">
							<TradeSchedulePanel jobId={id} schedules={tradeSchedules} embedded />
						</div>
					</div>
				</div>
			)}

			{/* ── Change Orders ── */}
			{tab === "change-orders" && (
				<ChangeOrdersPanel jobId={id} changeOrders={changeOrders} canEdit={canEdit} />
			)}

			{/* ── Selections ── */}
			{tab === "selections" && (
				<SelectionsPanel jobId={id} selections={selections} canEdit={canEdit} />
			)}

			{/* ── Warranty ── */}
			{tab === "warranty" && (
				<WarrantyPanel jobId={id} warrantyItems={warrantyItems} canEdit={canEdit} />
			)}

			{/* ── Plans & Specs ── */}
			{tab === "plans-specs" && (
				<PlansSpecsPanel jobId={id} documents={documents} canEdit={canEdit} />
			)}

			{/* ── Photos & Video ── */}
			{tab === "photos" && (
				<PhotosPanel jobId={id} photos={photos} />
			)}
		</div>
	)
}
