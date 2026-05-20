import type { BudgetSnapshot } from "@/lib/types"

interface RagBadgeProps {
	budget: BudgetSnapshot
}

const palette = {
	green: "bg-green-100 text-green-700 border-green-200",
	yellow: "bg-amber-100 text-amber-700 border-amber-200",
	red: "bg-danger/10 text-danger border-danger/20",
} as const

const dotPalette = {
	green: "bg-green-500",
	yellow: "bg-amber-500",
	red: "bg-danger",
} as const

const label = {
	green: "On track",
	yellow: "Watch",
	red: "Over budget",
} as const

export function RagBadge({ budget }: RagBadgeProps) {
	if (budget.status === "unset") {
		return (
			<span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-500">
				Budget not set
			</span>
		)
	}

	const remaining = budget.remainingHours ?? 0
	const remainingLabel =
		remaining >= 0 ? `${remaining}h left` : `${Math.abs(remaining)}h over`

	return (
		<span
			className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${palette[budget.status]}`}
		>
			<span className={`h-1.5 w-1.5 rounded-full ${dotPalette[budget.status]}`} />
			{label[budget.status]} · {budget.pct}% · {remainingLabel}
		</span>
	)
}
