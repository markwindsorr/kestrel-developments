import type { DbJob, BudgetSnapshot } from "@/lib/types"
import { computeBudgetStatus } from "@/lib/budget"

export type ScheduleHealth = "on-track" | "behind" | "overdue" | "no-data"

export interface ProjectHealth {
	job: DbJob
	budget: BudgetSnapshot
	checklist: { total: number; completed: number; pct: number }
	schedule: {
		health: ScheduleHealth
		endDate: string | null
		plannedEnd: string | null
		slipDays: number
	}
	crewToday: { name: string; hours: number }[]
}

const daysBetween = (a: string, b: string): number => {
	const da = new Date(a + "T00:00:00").getTime()
	const db = new Date(b + "T00:00:00").getTime()
	return Math.round((db - da) / 86_400_000)
}

export function buildProjectHealth(params: {
	job: DbJob
	hoursLogged: number
	checklist: { total: number; completed: number }
	scheduleEndDate: string | null
	todayIso: string
	crewToday: { name: string; hours: number }[]
}): ProjectHealth {
	const { job, hoursLogged, checklist, scheduleEndDate, todayIso, crewToday } =
		params

	const budget = computeBudgetStatus({
		hoursLogged,
		budgetHours: job.budget_hours_total,
		startDate: job.planned_start_date,
		plannedEndDate: job.planned_end_date,
	})

	const pct =
		checklist.total > 0
			? Math.round((checklist.completed / checklist.total) * 100)
			: 0

	const plannedEnd = job.planned_end_date
	let health: ScheduleHealth = "no-data"
	let slipDays = 0

	if (plannedEnd) {
		if (scheduleEndDate && scheduleEndDate > plannedEnd) {
			health = "behind"
			slipDays = daysBetween(plannedEnd, scheduleEndDate)
		} else if (todayIso > plannedEnd) {
			health = "overdue"
			slipDays = daysBetween(plannedEnd, todayIso)
		} else {
			health = "on-track"
		}
	} else if (scheduleEndDate) {
		health = "on-track"
	}

	return {
		job,
		budget,
		checklist: { ...checklist, pct },
		schedule: {
			health,
			endDate: scheduleEndDate,
			plannedEnd: plannedEnd ?? null,
			slipDays,
		},
		crewToday,
	}
}
