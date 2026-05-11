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
