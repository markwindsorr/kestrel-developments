import Link from "next/link"
import type { TradeSchedule } from "@/lib/db/trade-schedules"

interface ScheduleWithJob extends TradeSchedule {
	jobName: string
	jobColor: string
}

function getWeekBounds() {
	const now = new Date()
	const day = now.getDay()
	const monday = new Date(now)
	monday.setDate(now.getDate() - ((day + 6) % 7))
	monday.setHours(0, 0, 0, 0)
	const sunday = new Date(monday)
	sunday.setDate(monday.getDate() + 6)
	sunday.setHours(23, 59, 59, 999)
	return { monday, sunday }
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function toLocal(dateStr: string) {
	const [y, m, d] = dateStr.split("-").map(Number)
	return new Date(y, m - 1, d)
}

function fmtDate(d: Date) {
	return d.toLocaleDateString("en-CA", { month: "short", day: "numeric" })
}

const TRADE_COLORS: Record<string, string> = {
	"Excavation": "bg-amber-100 text-amber-800 border-amber-200",
	"Foundation": "bg-orange-100 text-orange-800 border-orange-200",
	"Framing": "bg-blue-100 text-blue-800 border-blue-200",
	"Roofing": "bg-sky-100 text-sky-800 border-sky-200",
	"Electrical": "bg-yellow-100 text-yellow-800 border-yellow-200",
	"Plumbing": "bg-cyan-100 text-cyan-800 border-cyan-200",
	"HVAC": "bg-teal-100 text-teal-800 border-teal-200",
	"Insulation": "bg-purple-100 text-purple-800 border-purple-200",
	"Drywall": "bg-rose-100 text-rose-800 border-rose-200",
	"Painting": "bg-pink-100 text-pink-800 border-pink-200",
	"Flooring": "bg-indigo-100 text-indigo-800 border-indigo-200",
	"Trim": "bg-violet-100 text-violet-800 border-violet-200",
}

function tradeColor(trade: string) {
	return TRADE_COLORS[trade] ?? "bg-neutral-100 text-neutral-700 border-neutral-200"
}

export function WeeklySchedule({ schedules }: { schedules: ScheduleWithJob[] }) {
	const { monday, sunday } = getWeekBounds()

	const thisWeek = schedules.filter(s => {
		const start = toLocal(s.startDate)
		const end = toLocal(s.endDate)
		return start <= sunday && end >= monday
	})

	// Group by day of week (which days does each phase touch this week?)
	const today = new Date()
	today.setHours(0, 0, 0, 0)

	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-5">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="font-semibold text-neutral-900">This Week&apos;s Schedule</h2>
					<p className="text-xs text-neutral-500 mt-0.5">
						{fmtDate(monday)} – {fmtDate(sunday)} · {thisWeek.length} phase{thisWeek.length !== 1 ? "s" : ""} active
					</p>
				</div>
			</div>

			{thisWeek.length === 0 ? (
				<p className="text-sm text-neutral-400 py-4 text-center">No trade phases scheduled this week</p>
			) : (
				<div className="space-y-2">
					{thisWeek.map(s => {
						const start = toLocal(s.startDate)
						const end = toLocal(s.endDate)
						const isActive = start <= today && end >= today
						const isStartingToday = start.toDateString() === today.toDateString()

						// Which days this week does it span?
						const spanStart = start < monday ? monday : start
						const spanEnd = end > sunday ? sunday : end
						const startDayIdx = (spanStart.getDay() + 6) % 7
						const endDayIdx = (spanEnd.getDay() + 6) % 7

						return (
							<div key={s.id} className={`rounded-lg border p-3 ${isActive ? "border-green-200 bg-green-50/50" : "border-neutral-100"}`}>
								<div className="flex items-start gap-2 flex-wrap">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 flex-wrap">
											<div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.jobColor }} />
											<p className="text-sm font-medium text-neutral-900">{s.jobName}</p>
											<span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${tradeColor(s.trade)}`}>
												{s.trade}
											</span>
											{isActive && (
												<span className="rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-semibold text-green-700">
													Active now
												</span>
											)}
											{isStartingToday && !isActive && (
												<span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">
													Starts today
												</span>
											)}
										</div>
										<p className="text-xs text-neutral-400 mt-1 ml-4">
											{fmtDate(start)} → {fmtDate(end)}
											{s.contractorName && <span> · {s.contractorName}</span>}
										</p>
									</div>
									{/* Day dots for the week */}
									<div className="flex gap-1 shrink-0">
										{DAY_LABELS.map((day, i) => {
											const inRange = i >= startDayIdx && i <= endDayIdx
											const isToday = i === (today.getDay() + 6) % 7
											return (
												<div
													key={day}
													title={day}
													className={`h-5 w-5 rounded text-xs flex items-center justify-center font-medium ${
														inRange && isToday ? "bg-green-500 text-white" :
														inRange ? "bg-neutral-800 text-white" :
														"bg-neutral-100 text-neutral-300"
													}`}
												>
													{day[0]}
												</div>
											)
										})}
									</div>
								</div>
							</div>
						)
					})}
				</div>
			)}

			<div className="mt-3 pt-3 border-t border-neutral-100">
				<Link href="/dashboard/jobs" className="text-xs font-medium text-brand-600 hover:underline">
					Manage job schedules →
				</Link>
			</div>
		</div>
	)
}
