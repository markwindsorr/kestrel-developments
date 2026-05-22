import Link from "next/link"
import type { ProjectHealth, ScheduleHealth } from "@/lib/portfolio"

const ragBar: Record<string, string> = {
	green: "bg-green-500",
	yellow: "bg-amber-400",
	red: "bg-danger",
	unset: "bg-neutral-300",
}

const ragText: Record<string, string> = {
	green: "text-green-700",
	yellow: "text-amber-700",
	red: "text-danger",
	unset: "text-neutral-400",
}

const schedLabel: Record<ScheduleHealth, { text: string; cls: string }> = {
	"on-track": { text: "On schedule", cls: "bg-green-100 text-green-700" },
	behind: { text: "Behind", cls: "bg-amber-100 text-amber-700" },
	overdue: { text: "Overdue", cls: "bg-danger/10 text-danger" },
	"no-data": { text: "No schedule", cls: "bg-neutral-100 text-neutral-500" },
}

export function PortfolioHealth({ projects }: { projects: ProjectHealth[] }) {
	return (
		<div className="rounded-xl border border-neutral-200 bg-white">
			<div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
				<div>
					<h2 className="font-semibold text-neutral-900">Portfolio Health</h2>
					<p className="mt-0.5 text-xs text-neutral-500">
						{projects.length} active project{projects.length !== 1 ? "s" : ""}
					</p>
				</div>
				<Link
					href="/dashboard/jobs"
					className="text-xs font-medium text-brand-600 hover:underline"
				>
					All jobs →
				</Link>
			</div>

			{projects.length === 0 ? (
				<p className="px-5 py-10 text-center text-sm text-neutral-400">
					No active projects.
				</p>
			) : (
				<div className="divide-y divide-neutral-100">
					{projects.map(({ job, budget, checklist, schedule, crewToday }) => {
						const sched = schedLabel[schedule.health]
						const budgetPct = budget.pct ?? 0
						return (
							<Link
								key={job.id}
								href={`/dashboard/jobs/${job.id}`}
								className="block px-5 py-4 transition-colors hover:bg-neutral-50"
							>
								<div className="mb-2 flex items-center gap-2.5">
									<span
										className="h-3 w-3 shrink-0 rounded-full"
										style={{ backgroundColor: job.color }}
									/>
									<p className="flex-1 truncate text-sm font-semibold text-neutral-900">
										{job.name}
									</p>
									<span
										className={`rounded-full px-2 py-0.5 text-xs font-semibold ${sched.cls}`}
									>
										{sched.text}
										{schedule.slipDays > 0 ? ` ${schedule.slipDays}d` : ""}
									</span>
									{crewToday.length > 0 && (
										<span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
											<span className="h-1.5 w-1.5 rounded-full bg-green-500" />
											{crewToday.length} on site
										</span>
									)}
								</div>

								<div className="grid gap-3 sm:grid-cols-2">
									{/* Budget */}
									<div>
										<div className="mb-1 flex items-center justify-between text-xs">
											<span className="text-neutral-500">Budget</span>
											<span className={`font-semibold ${ragText[budget.status]}`}>
												{budget.status === "unset"
													? "Not set"
													: `${budgetPct}% · ${budget.hoursLogged.toFixed(0)}/${budget.budgetHours}h`}
											</span>
										</div>
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
											<div
												className={`h-full rounded-full ${ragBar[budget.status]}`}
												style={{ width: `${Math.min(100, budgetPct)}%` }}
											/>
										</div>
									</div>

									{/* Checklist */}
									<div>
										<div className="mb-1 flex items-center justify-between text-xs">
											<span className="text-neutral-500">Checklist</span>
											<span className="font-semibold text-neutral-700">
												{checklist.pct}% · {checklist.completed}/{checklist.total}
											</span>
										</div>
										<div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
											<div
												className="h-full rounded-full bg-blue-500"
												style={{ width: `${checklist.pct}%` }}
											/>
										</div>
									</div>
								</div>
							</Link>
						)
					})}
				</div>
			)}
		</div>
	)
}
