import { createClient } from "@/lib/supabase/server"

export interface TradeSchedule {
	id: string
	jobId: string
	trade: string
	contractorName: string | null
	startDate: string
	endDate: string
	color: string
	notes: string | null
	progress: number
}

export interface ScheduleDependency {
	id: string
	fromId: string
	toId: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toSchedule = (r: any): TradeSchedule => ({
	id: r.id,
	jobId: r.job_id,
	trade: r.trade,
	contractorName: r.contractor_name ?? null,
	startDate: r.start_date,
	endDate: r.end_date,
	color: r.color ?? "#8b2c2c",
	notes: r.notes ?? null,
	progress: typeof r.progress === "number" ? r.progress : 0,
})

export async function getTradeSchedulesForJob(jobId: string): Promise<TradeSchedule[]> {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase
			.from("trade_schedules")
			.select("*")
			.eq("job_id", jobId)
			.order("start_date")
		if (error) return []
		return (data ?? []).map(toSchedule)
	} catch {
		return []
	}
}

export async function getAllTradeSchedules(_company?: string): Promise<(TradeSchedule & { jobName: string; jobColor: string })[]> {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase
			.from("trade_schedules")
			.select("*, jobs(name, color)")
			.order("start_date")
		if (error) return []
		return (data ?? [])
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			.map((r: any) => ({
				...toSchedule(r),
				jobName: r.jobs?.name ?? "Unknown Job",
				jobColor: r.jobs?.color ?? "#8b2c2c",
			}))
	} catch {
		return []
	}
}

export async function getAllDependencies(): Promise<ScheduleDependency[]> {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase.from("trade_schedule_dependencies").select("*")
		if (error) return []
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return (data ?? []).map((r: any) => ({ id: r.id, fromId: r.from_id, toId: r.to_id }))
	} catch {
		return []
	}
}

export async function insertTradeSchedule(fields: {
	jobId: string
	trade: string
	contractorName?: string
	startDate: string
	endDate: string
	color?: string
	notes?: string
}): Promise<string> {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("trade_schedules")
		.insert({
			job_id: fields.jobId,
			trade: fields.trade,
			contractor_name: fields.contractorName ?? null,
			start_date: fields.startDate,
			end_date: fields.endDate,
			color: fields.color ?? "#8b2c2c",
			notes: fields.notes ?? null,
		})
		.select("id")
		.single()
	if (error) throw new Error(error.message)
	return data.id
}

export async function updateTradeScheduleProgress(
	id: string,
	progress: number
): Promise<void> {
	const supabase = await createClient()
	const clamped = Math.max(0, Math.min(100, Math.round(progress)))
	const { error } = await supabase
		.from("trade_schedules")
		.update({ progress: clamped })
		.eq("id", id)
	if (error) throw error
}

export async function updateTradeSchedule(id: string, startDate: string, endDate: string): Promise<void> {
	try {
		const supabase = await createClient()
		await supabase.from("trade_schedules").update({ start_date: startDate, end_date: endDate }).eq("id", id)
	} catch {
		// ignore
	}
}

export async function addDependency(fromId: string, toId: string): Promise<string> {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("trade_schedule_dependencies")
		.insert({ from_id: fromId, to_id: toId })
		.select("id")
		.single()
	if (error) throw new Error(error.message)
	return data.id
}

export async function removeDependency(id: string): Promise<void> {
	try {
		const supabase = await createClient()
		await supabase.from("trade_schedule_dependencies").delete().eq("id", id)
	} catch {
		// ignore
	}
}

export async function deleteTradeSchedule(id: string): Promise<void> {
	try {
		const supabase = await createClient()
		await supabase.from("trade_schedules").delete().eq("id", id)
	} catch {
		// ignore
	}
}

export async function getScheduleJobId(scheduleId: string): Promise<string | null> {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("trade_schedules")
		.select("job_id")
		.eq("id", scheduleId)
		.maybeSingle()
	if (error || !data) return null
	return data.job_id as string
}

export async function getDependenciesForJob(jobId: string): Promise<ScheduleDependency[]> {
	const supabase = await createClient()
	const { data: schedules } = await supabase
		.from("trade_schedules")
		.select("id")
		.eq("job_id", jobId)
	const ids = (schedules ?? []).map((s) => s.id as string)
	if (ids.length === 0) return []
	const { data } = await supabase
		.from("trade_schedule_dependencies")
		.select("*")
		.in("from_id", ids)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return (data ?? []).map((r: any) => ({ id: r.id, fromId: r.from_id, toId: r.to_id }))
}

export async function bulkUpdateScheduleDates(
	updates: Array<{ id: string; start_date: string; end_date: string }>
): Promise<void> {
	if (updates.length === 0) return
	const supabase = await createClient()
	await Promise.all(
		updates.map((u) =>
			supabase
				.from("trade_schedules")
				.update({ start_date: u.start_date, end_date: u.end_date })
				.eq("id", u.id)
		)
	)
}

export async function deleteAllTradeSchedulesForJob(jobId: string): Promise<void> {
	const supabase = await createClient()
	const { error } = await supabase
		.from("trade_schedules")
		.delete()
		.eq("job_id", jobId)
	if (error) throw error
}

export async function insertTradeSchedulesBulk(
	rows: Array<{
		job_id: string
		trade: string
		contractor_name: string | null
		start_date: string
		end_date: string
		color: string
		notes: string | null
	}>
): Promise<Array<{ id: string; trade: string }>> {
	if (rows.length === 0) return []
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("trade_schedules")
		.insert(rows)
		.select("id, trade")
	if (error) throw error
	return (data ?? []) as Array<{ id: string; trade: string }>
}

export async function insertScheduleDependenciesBulk(
	pairs: Array<{ from_id: string; to_id: string }>
): Promise<void> {
	if (pairs.length === 0) return
	const supabase = await createClient()
	const { error } = await supabase
		.from("trade_schedule_dependencies")
		.insert(pairs)
	if (error) throw error
}
