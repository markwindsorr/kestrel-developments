import { createClient } from "@/lib/supabase/server"
import type { DbTimeEntry, DbProfile, DbJob } from "@/lib/types"

export interface TimeEntryRow extends DbTimeEntry {
	profiles: DbProfile
	jobs: DbJob
}

export const getActiveSession = async (userId: string) => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("time_entries")
		.select("*, jobs(*)")
		.eq("user_id", userId)
		.is("clock_out", null)
		.single()

	if (error && error.code !== "PGRST116") throw error
	if (!data) return null

	return {
		timeEntry: {
			id: data.id,
			userId: data.user_id,
			jobId: data.job_id,
			clockIn: data.clock_in,
			clockOut: data.clock_out,
			notes: data.notes,
		},
		job: {
			id: data.jobs.id,
			name: data.jobs.name,
			address: data.jobs.address,
			status: data.jobs.status,
			clientName: data.jobs.client_name,
			color: data.jobs.color,
		},
	}
}

export const getTimeEntriesWithDetails = async (limit = 50) => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("time_entries")
		.select("*, profiles(*), jobs(*)")
		.order("clock_in", { ascending: false })
		.limit(limit)

	if (error) throw error

	return (data as TimeEntryRow[]).map((entry) => {
		const clockIn = new Date(entry.clock_in)
		const clockOut = entry.clock_out ? new Date(entry.clock_out) : null
		const duration = clockOut
			? Math.round((clockOut.getTime() - clockIn.getTime()) / 60000)
			: null

		return {
			id: entry.id,
			userId: entry.user_id,
			jobId: entry.job_id,
			clockIn: entry.clock_in,
			clockOut: entry.clock_out,
			notes: entry.notes,
			user: {
				id: entry.profiles.id,
				name: entry.profiles.name,
				email: entry.profiles.email,
				role: entry.profiles.role,
			},
			job: {
				id: entry.jobs.id,
				name: entry.jobs.name,
				address: entry.jobs.address,
				status: entry.jobs.status,
				clientName: entry.jobs.client_name,
				color: entry.jobs.color,
			},
			duration,
		}
	})
}

export const getWeeklyStats = async () => {
	const supabase = await createClient()

	const now = new Date()
	const dayOfWeek = now.getDay()
	const monday = new Date(now)
	monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
	monday.setHours(0, 0, 0, 0)

	const { data, error } = await supabase
		.from("time_entries")
		.select("clock_in, clock_out")
		.gte("clock_in", monday.toISOString())

	if (error) throw error

	let totalMinutes = 0
	let activeCount = 0

	for (const entry of data) {
		if (!entry.clock_out) {
			activeCount++
			totalMinutes += Math.round(
				(Date.now() - new Date(entry.clock_in).getTime()) / 60000
			)
		} else {
			totalMinutes += Math.round(
				(new Date(entry.clock_out).getTime() -
					new Date(entry.clock_in).getTime()) /
					60000
			)
		}
	}

	return { totalMinutes, activeCount }
}

export const getTimeEntriesByJob = async (jobId: string) => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("time_entries")
		.select("*, profiles(*)")
		.eq("job_id", jobId)
		.order("clock_in", { ascending: false })
		.limit(20)

	if (error) throw error

	return (data as (DbTimeEntry & { profiles: DbProfile })[]).map((entry) => {
		const clockIn = new Date(entry.clock_in)
		const clockOut = entry.clock_out ? new Date(entry.clock_out) : null
		const duration = clockOut
			? Math.round((clockOut.getTime() - clockIn.getTime()) / 60000)
			: null

		return {
			id: entry.id,
			userId: entry.user_id,
			jobId: entry.job_id,
			clockIn: entry.clock_in,
			clockOut: entry.clock_out,
			notes: entry.notes,
			user: {
				id: entry.profiles.id,
				name: entry.profiles.name,
				email: entry.profiles.email,
				role: entry.profiles.role,
			},
			duration,
		}
	})
}

export const hasActiveSession = async (userId: string): Promise<boolean> => {
	const supabase = await createClient()
	const { data } = await supabase
		.from("time_entries")
		.select("id")
		.eq("user_id", userId)
		.is("clock_out", null)
		.single()

	return !!data
}

export const insertTimeEntry = async (fields: {
	user_id: string
	job_id: string
	notes: string | null
}) => {
	const supabase = await createClient()
	const { error } = await supabase.from("time_entries").insert(fields)
	if (error) throw error
}

export const clockOutActiveEntry = async (userId: string) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("time_entries")
		.update({ clock_out: new Date().toISOString() })
		.eq("user_id", userId)
		.is("clock_out", null)

	if (error) throw error
}
