"use client"

import { useState, useTransition } from "react"
import type { TradeSchedule } from "@/lib/db/trade-schedules"
import {
	addTradeScheduleAction,
	deleteTradeScheduleAction,
	updateScheduleProgressAction,
} from "@/app/dashboard/actions"

const TRADES = [
	"Framing", "Electrical", "Plumbing", "HVAC", "Insulation",
	"Drywall", "Painting", "Roofing", "Concrete", "Excavation",
	"Landscaping", "Cabinets", "Flooring", "Siding", "Tile", "Other",
]

const COLORS = [
	{ label: "Red", value: "#8b2c2c" },
	{ label: "Blue", value: "#1d4ed8" },
	{ label: "Sky", value: "#0369a1" },
	{ label: "Orange", value: "#c2410c" },
	{ label: "Green", value: "#15803d" },
	{ label: "Gray", value: "#78716c" },
	{ label: "Gold", value: "#a16207" },
	{ label: "Navy", value: "#1e1b4b" },
	{ label: "Stone", value: "#57534e" },
	{ label: "Brown", value: "#92400e" },
	{ label: "Teal", value: "#0f766e" },
	{ label: "Purple", value: "#6b21a8" },
]

export function TradeSchedulePanel({
	jobId,
	schedules,
	embedded = false,
}: {
	jobId: string
	schedules: TradeSchedule[]
	embedded?: boolean
}) {
	const [showAdd, setShowAdd] = useState(false)
	const [saveError, setSaveError] = useState<string | null>(null)
	const [pending, startTransition] = useTransition()

	const remove = (id: string) => {
		startTransition(async () => {
			await deleteTradeScheduleAction(id, jobId)
		})
	}

	const setProgress = (id: string, progress: number) => {
		startTransition(async () => {
			await updateScheduleProgressAction(id, progress, jobId)
		})
	}

	const statusOf = (p: number) =>
		p >= 100 ? "done" : p > 0 ? "in-progress" : "not-started"

	const inner = (
		<>
			{/* Header row */}
			<div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
				<p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">
					{schedules.length > 0 ? `${schedules.length} phase${schedules.length !== 1 ? "s" : ""}` : "No phases yet"}
				</p>
				<button
					onClick={() => setShowAdd(s => !s)}
					className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
				>
					+ Add phase
				</button>
			</div>

			{/* Add form */}
			{showAdd && (
				<form
					action={async (fd) => {
						fd.set("jobId", jobId)
						try {
							await addTradeScheduleAction(fd)
							setSaveError(null)
							setShowAdd(false)
						} catch (e) {
							setSaveError(e instanceof Error ? e.message : "Failed to save — make sure the trade_schedules table exists in Supabase.")
						}
					}}
					className="px-5 py-4 border-b border-neutral-100 bg-neutral-50 space-y-3"
				>
					<div className="grid grid-cols-2 gap-3">
						<div className="col-span-2 sm:col-span-1">
							<label className="text-xs text-neutral-500 block mb-1">Trade *</label>
							<select name="trade" required className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none bg-white">
								{TRADES.map(t => <option key={t}>{t}</option>)}
							</select>
						</div>
						<div className="col-span-2 sm:col-span-1">
							<label className="text-xs text-neutral-500 block mb-1">Contractor / Company</label>
							<input name="contractorName" placeholder="ABC Framing Ltd." className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
						</div>
						<div>
							<label className="text-xs text-neutral-500 block mb-1">Start Date *</label>
							<input name="startDate" type="date" required className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
						</div>
						<div>
							<label className="text-xs text-neutral-500 block mb-1">End Date *</label>
							<input name="endDate" type="date" required className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
						</div>
						<div>
							<label className="text-xs text-neutral-500 block mb-1">Bar Colour</label>
							<select name="color" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none bg-white">
								{COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
							</select>
						</div>
						<div>
							<label className="text-xs text-neutral-500 block mb-1">Notes</label>
							<input name="notes" placeholder="Optional notes" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
						</div>
					</div>
					{saveError && (
						<p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{saveError}</p>
					)}
					<div className="flex gap-2">
						<button type="submit" className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Save</button>
						<button type="button" onClick={() => { setShowAdd(false); setSaveError(null) }} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50">Cancel</button>
					</div>
				</form>
			)}

			{/* Phase list */}
			{schedules.length > 0 && (
				<ul className={`divide-y divide-neutral-100 ${pending ? "opacity-60 pointer-events-none" : ""}`}>
					{schedules.map(s => (
						<li key={s.id} className="flex items-center gap-3 px-5 py-2.5">
							<div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
							<div className="flex-1 min-w-0">
								<p className="text-sm font-medium text-neutral-800">
									{s.trade}{s.contractorName ? ` · ${s.contractorName}` : ""}
								</p>
								<p className="text-xs text-neutral-400">{s.startDate} → {s.endDate}{s.notes ? ` · ${s.notes}` : ""}</p>
							</div>
							<select
								value={statusOf(s.progress)}
								onChange={(e) => {
									const v = e.target.value
									setProgress(s.id, v === "done" ? 100 : v === "in-progress" ? 50 : 0)
								}}
								className={`shrink-0 rounded-md border px-2 py-1 text-xs font-medium ${
									s.progress >= 100
										? "border-green-200 bg-green-50 text-green-700"
										: s.progress > 0
											? "border-amber-200 bg-amber-50 text-amber-700"
											: "border-neutral-200 bg-white text-neutral-500"
								}`}
								title="Phase status"
							>
								<option value="not-started">Not started</option>
								<option value="in-progress">In progress</option>
								<option value="done">Done</option>
							</select>
							<button onClick={() => remove(s.id)} className="text-neutral-300 hover:text-red-500 transition-colors text-lg leading-none" title="Delete">×</button>
						</li>
					))}
				</ul>
			)}
		</>
	)

	if (embedded) return <div>{inner}</div>

	return (
		<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
			<div className="px-5 py-4 border-b border-neutral-200">
				<h2 className="font-semibold text-neutral-900">Trade Schedule</h2>
			</div>
			{inner}
		</div>
	)
}
