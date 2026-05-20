import Link from "next/link"
import type { BudgetSnapshot, DbJob } from "@/lib/types"
import { RagBadge } from "./rag-badge"

interface WorkerJobCardProps {
	job: DbJob
	checklist: { total: number; completed: number }
	budget: BudgetSnapshot
	openTodos: number
}

export function WorkerJobCard({ job, checklist, budget, openTodos }: WorkerJobCardProps) {
	const pct =
		checklist.total > 0
			? Math.round((checklist.completed / checklist.total) * 100)
			: 0
	const barColor = pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-blue-500" : "bg-amber-400"

	return (
		<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden transition-shadow hover:shadow-md">
			<div className="flex items-start gap-2.5 px-4 py-3 border-b border-neutral-100">
				<div
					className="mt-1 h-3 w-3 rounded-full shrink-0"
					style={{ backgroundColor: job.color }}
				/>
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold text-neutral-900 truncate">
						{job.name}
					</p>
					<p className="text-xs text-neutral-400 truncate">
						{job.client_name}
						{job.address ? ` · ${job.address}` : ""}
					</p>
				</div>
			</div>

			<div className="px-4 py-3 space-y-3">
				<div>
					<RagBadge budget={budget} />
					{budget.status !== "unset" && (
						<p className="mt-1.5 text-xs text-neutral-500 tabular-nums">
							{budget.hoursLogged.toFixed(1)}h logged of {budget.budgetHours}h budgeted
						</p>
					)}
				</div>

				<div>
					<div className="flex items-center justify-between mb-1">
						<p className="text-xs text-neutral-500">Checklist</p>
						<p className="text-xs font-semibold text-neutral-700">
							{pct}% · {checklist.completed}/{checklist.total}
						</p>
					</div>
					<div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
						<div
							className={`h-full rounded-full ${barColor}`}
							style={{ width: `${pct}%` }}
						/>
					</div>
				</div>

				{openTodos > 0 && (
					<p className="text-xs font-medium text-brand-700">
						{openTodos} task{openTodos > 1 ? "s" : ""} for you on this job
					</p>
				)}
			</div>

			<div className="grid grid-cols-3 divide-x divide-neutral-100 border-t border-neutral-100 bg-neutral-50/50 text-center">
				<Link
					href={`/dashboard/jobs/${job.id}`}
					className="px-2 py-2.5 text-xs font-semibold text-brand-600 hover:bg-neutral-100"
				>
					Open
				</Link>
				<Link
					href={`/dashboard/jobs/${job.id}?tab=plans-specs`}
					className="px-2 py-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
				>
					Plans & Specs
				</Link>
				<Link
					href={`/dashboard/jobs/${job.id}?tab=checklist`}
					className="px-2 py-2.5 text-xs font-medium text-neutral-600 hover:bg-neutral-100"
				>
					Checklist
				</Link>
			</div>
		</div>
	)
}
