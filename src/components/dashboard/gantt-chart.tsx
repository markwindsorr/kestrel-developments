"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { ViewMode } from "gantt-task-react"
import type { Task } from "gantt-task-react"
import "gantt-task-react/dist/index.css"
import type { TradeSchedule, ScheduleDependency } from "@/lib/db/trade-schedules"
import { updateTradeScheduleAction, addDependencyAction, removeDependencyAction } from "@/app/dashboard/actions"

const GanttLib = dynamic(
	() => import("gantt-task-react").then(m => m.Gantt),
	{ ssr: false }
)

type GanttEntry = TradeSchedule & { jobName: string; jobColor: string }

function parseDate(s: string): Date {
	const [y, m, d] = s.split("-").map(Number)
	return new Date(y, m - 1, d)
}

export function GanttChart({
	schedules,
	dependencies: initDeps,
}: {
	schedules: GanttEntry[]
	dependencies: ScheduleDependency[]
}) {
	const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.Week)
	const [deps, setDeps] = useState<ScheduleDependency[]>(initDeps)
	const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set())
	const [addFrom, setAddFrom] = useState("")
	const [addTo, setAddTo] = useState("")

	// Group schedules by job
	const jobGroups = useMemo(() => {
		const map = new Map<string, { jobName: string; jobColor: string; rows: GanttEntry[] }>()
		for (const s of schedules) {
			if (!map.has(s.jobId)) map.set(s.jobId, { jobName: s.jobName, jobColor: s.jobColor, rows: [] })
			map.get(s.jobId)!.rows.push(s)
		}
		return map
	}, [schedules])

	// Conflict detection: same contractor, overlapping dates, different jobs
	const conflictIds = useMemo(() => {
		const ids = new Set<string>()
		const named = schedules.filter(s => s.contractorName?.trim())
		for (let i = 0; i < named.length; i++) {
			for (let j = i + 1; j < named.length; j++) {
				const a = named[i], b = named[j]
				if (a.jobId === b.jobId) continue
				if (a.contractorName!.toLowerCase() !== b.contractorName!.toLowerCase()) continue
				if (parseDate(a.startDate) <= parseDate(b.endDate) && parseDate(b.startDate) <= parseDate(a.endDate)) {
					ids.add(a.id); ids.add(b.id)
				}
			}
		}
		return ids
	}, [schedules])

	const conflictNames = useMemo(() => {
		const names = new Set<string>()
		for (const s of schedules) {
			if (conflictIds.has(s.id) && s.contractorName) names.add(s.contractorName)
		}
		return Array.from(names)
	}, [conflictIds, schedules])

	// Build dependency lookup: toId -> [fromId, ...]
	const depsByTarget = useMemo(() => {
		const map = new Map<string, string[]>()
		for (const d of deps) {
			if (!map.has(d.toId)) map.set(d.toId, [])
			map.get(d.toId)!.push(d.fromId)
		}
		return map
	}, [deps])

	// Build Task[] for the library
	const tasks = useMemo((): Task[] => {
		const result: Task[] = []
		for (const [jobId, group] of jobGroups) {
			const allStarts = group.rows.map(s => parseDate(s.startDate).getTime())
			const allEnds = group.rows.map(s => parseDate(s.endDate).getTime())
			const isExpanded = !expandedJobs.has(jobId)

			result.push({
				id: jobId,
				type: "project",
				name: group.jobName,
				start: new Date(Math.min(...allStarts)),
				end: new Date(Math.max(...allEnds)),
				progress: 0,
				hideChildren: !isExpanded,
				styles: {
					backgroundColor: group.jobColor,
					backgroundSelectedColor: group.jobColor,
					progressColor: group.jobColor,
				},
			})

			if (isExpanded) {
				for (const s of group.rows) {
					const isConflict = conflictIds.has(s.id)
					result.push({
						id: s.id,
						type: "task",
						name: s.contractorName ? `${s.trade} · ${s.contractorName}` : s.trade,
						start: parseDate(s.startDate),
						end: parseDate(s.endDate),
						progress: s.progress,
						project: jobId,
						dependencies: depsByTarget.get(s.id) ?? [],
						styles: {
							backgroundColor: isConflict ? "#ef4444" : s.color + "44",
							backgroundSelectedColor: isConflict ? "#dc2626" : s.color + "66",
							progressColor: isConflict ? "#ef4444" : s.color,
							progressSelectedColor: isConflict ? "#dc2626" : s.color,
						},
					})
				}
			}
		}
		return result
	}, [jobGroups, expandedJobs, conflictIds, depsByTarget])

	const handleDateChange = async (task: Task) => {
		if (task.type !== "task") return
		const start = task.start.toISOString().slice(0, 10)
		const end = task.end.toISOString().slice(0, 10)
		await updateTradeScheduleAction(task.id, start, end)
	}

	const handleExpanderClick = (task: Task) => {
		setExpandedJobs(prev => {
			const next = new Set(prev)
			if (next.has(task.id)) next.delete(task.id)
			else next.add(task.id)
			return next
		})
	}

	const handleAddDep = async () => {
		if (!addFrom || !addTo || addFrom === addTo) return
		if (deps.some(d => d.fromId === addFrom && d.toId === addTo)) return
		const result = await addDependencyAction(addFrom, addTo)
		setDeps(prev => [...prev, { id: result.id, fromId: addFrom, toId: addTo }])
		setAddFrom("")
		setAddTo("")
	}

	const handleRemoveDep = async (depId: string) => {
		setDeps(prev => prev.filter(d => d.id !== depId))
		await removeDependencyAction(depId)
	}

	if (schedules.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 text-center">
				<p className="text-sm font-medium text-neutral-500">No trade schedules yet</p>
				<p className="text-xs text-neutral-400 mt-1">Open a job and add phases to see them here</p>
			</div>
		)
	}

	const colWidth = viewMode === ViewMode.Day ? 40 : viewMode === ViewMode.Week ? 80 : 220

	return (
		<div>
			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-neutral-100 bg-neutral-50/80">
				{/* View mode */}
				<div className="flex rounded-lg border border-neutral-200 overflow-hidden">
					{([ViewMode.Day, ViewMode.Week, ViewMode.Month] as const).map(mode => (
						<button
							key={mode}
							onClick={() => setViewMode(mode)}
							className={`px-3 py-1 text-xs font-medium transition-colors ${
								viewMode === mode
									? "bg-brand-600 text-white"
									: "text-neutral-500 hover:bg-neutral-100"
							}`}
						>
							{mode}
						</button>
					))}
				</div>

				{/* Conflict warning */}
				{conflictNames.length > 0 && (
					<div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-1">
						<span className="text-red-500 text-sm">⚠</span>
						<span className="text-xs font-medium text-red-700">{conflictNames.join(", ")} double-booked</span>
					</div>
				)}
			</div>

			{/* Gantt */}
			<div className="gantt-wrapper">
				<GanttLib
					tasks={tasks}
					viewMode={viewMode}
					onDateChange={handleDateChange}
					onExpanderClick={handleExpanderClick}
					listCellWidth="220px"
					columnWidth={colWidth}
					locale="en"
					rowHeight={38}
					headerHeight={50}
					barFill={70}
					barCornerRadius={4}
					todayColor="rgba(139,44,44,0.08)"
					arrowColor="#f97316"
					arrowIndent={20}
					fontSize="12px"
				/>
			</div>

			{/* Dependency manager */}
			{schedules.length > 1 && (
				<div className="border-t border-neutral-100 px-4 py-3 bg-neutral-50/50">
					<p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">Dependencies</p>
					<div className="flex flex-wrap gap-2 items-center mb-2">
						<select
							value={addFrom}
							onChange={e => setAddFrom(e.target.value)}
							className="rounded border border-neutral-200 px-2 py-1 text-xs bg-white text-neutral-700"
						>
							<option value="">Predecessor…</option>
							{schedules.map(s => (
								<option key={s.id} value={s.id}>
									{s.trade}{s.contractorName ? ` · ${s.contractorName}` : ""}
								</option>
							))}
						</select>
						<span className="text-xs text-neutral-400">→ then</span>
						<select
							value={addTo}
							onChange={e => setAddTo(e.target.value)}
							className="rounded border border-neutral-200 px-2 py-1 text-xs bg-white text-neutral-700"
						>
							<option value="">Successor…</option>
							{schedules.map(s => (
								<option key={s.id} value={s.id}>
									{s.trade}{s.contractorName ? ` · ${s.contractorName}` : ""}
								</option>
							))}
						</select>
						<button
							onClick={handleAddDep}
							disabled={!addFrom || !addTo || addFrom === addTo}
							className="rounded px-3 py-1 text-xs font-medium bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed"
						>
							Add
						</button>
					</div>
					{deps.length > 0 && (
						<div className="flex flex-wrap gap-1.5">
							{deps.map(d => {
								const from = schedules.find(s => s.id === d.fromId)
								const to = schedules.find(s => s.id === d.toId)
								if (!from || !to) return null
								return (
									<div key={d.id} className="flex items-center gap-1 rounded-full bg-white border border-neutral-200 pl-2.5 pr-1.5 py-0.5 text-xs text-neutral-600">
										{from.trade} → {to.trade}
										<button
											onClick={() => handleRemoveDep(d.id)}
											className="ml-0.5 text-neutral-300 hover:text-red-500 font-bold leading-none"
											title="Remove"
										>
											×
										</button>
									</div>
								)
							})}
						</div>
					)}
				</div>
			)}
		</div>
	)
}
