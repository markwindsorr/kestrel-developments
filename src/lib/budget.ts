import type { BudgetSnapshot, BudgetStatus } from "@/lib/types"

interface BudgetInput {
	hoursLogged: number
	budgetHours: number | null | undefined
	startDate?: string | null
	plannedEndDate?: string | null
}

export const computeBudgetStatus = (input: BudgetInput): BudgetSnapshot => {
	const { hoursLogged, budgetHours } = input

	if (!budgetHours || budgetHours <= 0) {
		return {
			status: "unset",
			pct: null,
			hoursLogged,
			budgetHours: null,
			remainingHours: null,
		}
	}

	const pct = (hoursLogged / budgetHours) * 100
	const status: BudgetStatus = pct < 70 ? "green" : pct <= 90 ? "yellow" : "red"

	return {
		status,
		pct: Math.round(pct),
		hoursLogged,
		budgetHours,
		remainingHours: Math.round((budgetHours - hoursLogged) * 10) / 10,
	}
}
