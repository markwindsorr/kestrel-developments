import { createClient } from "@/lib/supabase/server"
import type { DbTimeEntry, DbProfile, DbJob } from "@/lib/types"

export interface TimeEntryRow extends DbTimeEntry {
	profiles: DbProfile
	jobs: DbJob
}

const mapEntryWithDetails = (entry: TimeEntryRow) => ({
	id: entry.id,
	userId: entry.user_id,
	jobId: entry.job_id,
	workDate: entry.work_date,
	hours: Number(entry.hours),
	notes: entry.notes,
	dailyTask: entry.daily_task,
	user: {
		id: entry.profiles.id,
		name: entry.profiles.name,
		email: entry.profiles.email,
	},
	job: {
		id: entry.jobs.id,
		name: entry.jobs.name,
		address: entry.jobs.address,
		status: entry.jobs.status,
		clientName: entry.jobs.client_name,
		color: entry.jobs.color,
	},
})

export const getTimeEntriesWithDetails = async (orgId: string, limit = 50) => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("time_entries")
		.select("*, profiles(*), jobs(*)")
		.eq("org_id", orgId)
		.order("work_date", { ascending: false })
		.order("created_at", { ascending: false })
		.limit(limit)

	if (error) throw error
	return (data as TimeEntryRow[]).map(mapEntryWithDetails)
}

export const getTimeEntriesByJob = async (jobId: string) => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("time_entries")
		.select("*, profiles(*)")
		.eq("job_id", jobId)
		.order("work_date", { ascending: false })
		.limit(20)

	if (error) throw error

	return (data as (DbTimeEntry & { profiles: DbProfile })[]).map((entry) => ({
		id: entry.id,
		userId: entry.user_id,
		jobId: entry.job_id,
		workDate: entry.work_date,
		hours: Number(entry.hours),
		notes: entry.notes,
		dailyTask: entry.daily_task,
		user: {
			id: entry.profiles.id,
			name: entry.profiles.name,
			email: entry.profiles.email,
		},
	}))
}

export const getEntriesForUserOnDate = async (
	userId: string,
	workDate: string
) => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("time_entries")
		.select("*")
		.eq("user_id", userId)
		.eq("work_date", workDate)
		.order("created_at", { ascending: true })

	if (error) throw error
	return (data as DbTimeEntry[]).map((entry) => ({
		id: entry.id,
		jobId: entry.job_id,
		workDate: entry.work_date,
		hours: Number(entry.hours),
		dailyTask: entry.daily_task,
	}))
}

export const getEntriesForUserSince = async (
	userId: string,
	sinceDate: string
) => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("time_entries")
		.select("*")
		.eq("user_id", userId)
		.gte("work_date", sinceDate)
		.order("work_date", { ascending: false })
		.order("created_at", { ascending: false })

	if (error) throw error
	return (data as DbTimeEntry[]).map((entry) => ({
		id: entry.id,
		jobId: entry.job_id,
		workDate: entry.work_date,
		hours: Number(entry.hours),
		dailyTask: entry.daily_task,
	}))
}

export const getWeeklyStats = async (orgId: string) => {
	const supabase = await createClient()

	const now = new Date()
	const dayOfWeek = now.getDay()
	const monday = new Date(now)
	monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
	const mondayStr = monday.toISOString().slice(0, 10)

	const { data, error } = await supabase
		.from("time_entries")
		.select("hours, work_date, user_id")
		.eq("org_id", orgId)
		.gte("work_date", mondayStr)

	if (error) throw error

	const today = new Date().toISOString().slice(0, 10)
	let totalHours = 0
	const todaysUsers = new Set<string>()
	for (const entry of data ?? []) {
		totalHours += Number(entry.hours)
		if (entry.work_date === today) todaysUsers.add(entry.user_id)
	}

	return {
		totalHours: Math.round(totalHours * 10) / 10,
		todaysUserCount: todaysUsers.size,
	}
}

export const insertTimeEntries = async (
	rows: Array<{
		user_id: string
		job_id: string
		org_id: string
		work_date: string
		hours: number
		daily_task: string | null
		notes: string | null
	}>
) => {
	if (rows.length === 0) return
	const supabase = await createClient()
	const { error } = await supabase.from("time_entries").insert(rows)
	if (error) throw error
}

export const updateTimeEntry = async (
	id: string,
	fields: { job_id: string; work_date: string; hours: number; daily_task: string | null }
) => {
	const supabase = await createClient()
	const { error } = await supabase.from("time_entries").update(fields).eq("id", id)
	if (error) throw error
}

export const deleteTimeEntry = async (id: string) => {
	const supabase = await createClient()
	const { error } = await supabase.from("time_entries").delete().eq("id", id)
	if (error) throw error
}

export const getHoursByJob = async (
	orgId: string,
	jobIds: string[]
): Promise<Record<string, number>> => {
	if (jobIds.length === 0) return {}
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("time_entries")
		.select("job_id, hours")
		.eq("org_id", orgId)
		.in("job_id", jobIds)

	if (error) return {}

	const hoursByJob: Record<string, number> = {}
	for (const row of data ?? []) {
		hoursByJob[row.job_id] = (hoursByJob[row.job_id] ?? 0) + Number(row.hours)
	}
	for (const [jobId, hours] of Object.entries(hoursByJob)) {
		hoursByJob[jobId] = Math.round(hours * 100) / 100
	}
	return hoursByJob
}

export const getRecentJobsForUser = async (
	userId: string,
	limit = 5
): Promise<string[]> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("time_entries")
		.select("job_id, work_date")
		.eq("user_id", userId)
		.order("work_date", { ascending: false })
		.limit(50)

	if (error || !data) return []
	const seen = new Set<string>()
	const ordered: string[] = []
	for (const row of data) {
		if (seen.has(row.job_id)) continue
		seen.add(row.job_id)
		ordered.push(row.job_id)
		if (ordered.length >= limit) break
	}
	return ordered
}

export interface TodayActivityRow {
	userId: string
	name: string
	jobId: string
	jobName: string
	jobColor: string
	hours: number
}

export async function getTodayActivity(): Promise<TodayActivityRow[]> {
	try {
		const supabase = await createClient()
		const today = new Date().toISOString().slice(0, 10)
		const { data, error } = await supabase
			.from("time_entries")
			.select("user_id, job_id, hours, profiles(name), jobs(name, color)")
			.eq("work_date", today)
		if (error) return []

		const rows = (data ?? []).map((r) => ({
			userId: r.user_id as string,
			name:
				(r.profiles as unknown as { name: string } | null)?.name ?? "Unknown",
			jobId: r.job_id as string,
			jobName:
				(r.jobs as unknown as { name: string } | null)?.name ?? "Unknown Job",
			jobColor:
				(r.jobs as unknown as { color: string } | null)?.color ?? "#666",
			hours: Number(r.hours),
		}))

		const grouped = new Map<string, TodayActivityRow>()
		for (const r of rows) {
			const key = `${r.userId}|${r.jobId}`
			const existing = grouped.get(key)
			if (existing) {
				existing.hours += r.hours
			} else {
				grouped.set(key, { ...r })
			}
		}
		for (const v of grouped.values()) {
			v.hours = Math.round(v.hours * 100) / 100
		}
		return Array.from(grouped.values()).sort((a, b) =>
			a.name.localeCompare(b.name)
		)
	} catch {
		return []
	}
}
