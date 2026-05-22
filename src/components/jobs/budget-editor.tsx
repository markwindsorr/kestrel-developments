"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { updateJobBudget } from "@/app/dashboard/jobs/actions"
import { computeBudgetStatus } from "@/lib/budget"

interface BudgetEditorProps {
	jobId: string
	initial: {
		budgetDays: number | null
		budgetHoursPerDay: number | null
		budgetWorkers: number | null
		plannedStartDate: string | null
		plannedEndDate: string | null
	}
	hoursLogged: number
	canEdit: boolean
}

const toStr = (n: number | null) => (n === null ? "" : String(n))

export function BudgetEditor({
	jobId,
	initial,
	hoursLogged,
	canEdit,
}: BudgetEditorProps) {
	const [state, formAction, pending] = useActionState(updateJobBudget, {
		error: "",
	})

	const [days, setDays] = useState(toStr(initial.budgetDays))
	const [hpd, setHpd] = useState(toStr(initial.budgetHoursPerDay))
	const [workers, setWorkers] = useState(toStr(initial.budgetWorkers))
	const [startDate, setStartDate] = useState(initial.plannedStartDate ?? "")
	const [endDate, setEndDate] = useState(initial.plannedEndDate ?? "")

	const d = parseFloat(days)
	const h = parseFloat(hpd)
	const w = parseFloat(workers)
	const totalHours =
		Number.isFinite(d) && Number.isFinite(h) && Number.isFinite(w)
			? d * h * w
			: null

	const budget = computeBudgetStatus({
		hoursLogged,
		budgetHours: totalHours,
	})

	const statusColor: Record<string, string> = {
		green: "bg-green-100 text-green-700",
		yellow: "bg-amber-100 text-amber-700",
		red: "bg-danger/10 text-danger",
		unset: "bg-neutral-100 text-neutral-500",
	}
	const statusLabel: Record<string, string> = {
		green: "On track",
		yellow: "Watch",
		red: "Over budget",
		unset: "Not set",
	}

	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-5">
			<div className="mb-3 flex items-center justify-between">
				<h2 className="font-semibold text-neutral-900">Budget</h2>
				<span
					className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusColor[budget.status]}`}
				>
					{statusLabel[budget.status]}
					{budget.pct !== null ? ` · ${budget.pct}%` : ""}
				</span>
			</div>

			<form action={formAction} className="space-y-3">
				<input type="hidden" name="id" value={jobId} />

				{state.error !== "" && (
					<div className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
						{state.error}
					</div>
				)}

				<div className="grid grid-cols-3 gap-2">
					<div>
						<label
							htmlFor="budget-days"
							className="mb-1 block text-xs font-medium text-neutral-600"
						>
							Days
						</label>
						<input
							id="budget-days"
							name="budgetDays"
							type="number"
							step="0.25"
							min="0"
							value={days}
							onChange={(e) => setDays(e.target.value)}
							disabled={!canEdit}
							placeholder="12.5"
							className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm tabular-nums disabled:bg-neutral-50 disabled:text-neutral-400"
						/>
					</div>
					<div>
						<label
							htmlFor="budget-hpd"
							className="mb-1 block text-xs font-medium text-neutral-600"
						>
							Hours / day
						</label>
						<input
							id="budget-hpd"
							name="budgetHoursPerDay"
							type="number"
							step="0.25"
							min="0"
							value={hpd}
							onChange={(e) => setHpd(e.target.value)}
							disabled={!canEdit}
							placeholder="8"
							className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm tabular-nums disabled:bg-neutral-50 disabled:text-neutral-400"
						/>
					</div>
					<div>
						<label
							htmlFor="budget-workers"
							className="mb-1 block text-xs font-medium text-neutral-600"
						>
							Workers
						</label>
						<input
							id="budget-workers"
							name="budgetWorkers"
							type="number"
							step="1"
							min="0"
							value={workers}
							onChange={(e) => setWorkers(e.target.value)}
							disabled={!canEdit}
							placeholder="2"
							className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm tabular-nums disabled:bg-neutral-50 disabled:text-neutral-400"
						/>
					</div>
				</div>

				<div className="grid grid-cols-3 gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-xs">
					<div>
						<p className="text-neutral-500">Total budget</p>
						<p className="font-semibold text-neutral-900 tabular-nums">
							{totalHours !== null && totalHours > 0
								? `${totalHours.toFixed(1)}h`
								: "—"}
						</p>
					</div>
					<div>
						<p className="text-neutral-500">Hours logged</p>
						<p className="font-semibold text-neutral-900 tabular-nums">
							{hoursLogged.toFixed(1)}h
						</p>
					</div>
					<div>
						<p className="text-neutral-500">Remaining</p>
						<p className="font-semibold text-neutral-900 tabular-nums">
							{budget.remainingHours !== null
								? `${budget.remainingHours}h`
								: "—"}
						</p>
					</div>
				</div>

				<div className="grid grid-cols-2 gap-2">
					<div>
						<label
							htmlFor="budget-start"
							className="mb-1 block text-xs font-medium text-neutral-600"
						>
							Planned start
						</label>
						<input
							id="budget-start"
							name="plannedStartDate"
							type="date"
							value={startDate}
							onChange={(e) => setStartDate(e.target.value)}
							disabled={!canEdit}
							className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm disabled:bg-neutral-50 disabled:text-neutral-400"
						/>
					</div>
					<div>
						<label
							htmlFor="budget-end"
							className="mb-1 block text-xs font-medium text-neutral-600"
						>
							Planned end
						</label>
						<input
							id="budget-end"
							name="plannedEndDate"
							type="date"
							value={endDate}
							onChange={(e) => setEndDate(e.target.value)}
							disabled={!canEdit}
							className="w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm disabled:bg-neutral-50 disabled:text-neutral-400"
						/>
					</div>
				</div>

				{canEdit && (
					<div className="flex justify-end">
						<Button type="submit" variant="primary" size="sm" disabled={pending}>
							{pending ? "Saving..." : "Save budget"}
						</Button>
					</div>
				)}
			</form>
		</div>
	)
}
