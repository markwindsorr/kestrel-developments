import type { Job, TimeEntry, TimeEntryWithDetails, ActiveClockSession, User } from "@/lib/types"

export const mockUsers: User[] = [
	{
		id: "user-1",
		name: "Mark Windsor",
		email: "mark@kestraldev.com",
		role: "admin"
	},
	{
		id: "user-2",
		name: "Jake Morrison",
		email: "jake@kestraldev.com",
		role: "foreman"
	},
	{
		id: "user-3",
		name: "Carlos Ruiz",
		email: "carlos@kestraldev.com",
		role: "worker"
	},
	{
		id: "user-4",
		name: "Sarah Chen",
		email: "sarah@kestraldev.com",
		role: "worker"
	}
]

export const mockJobs: Job[] = [
	{
		id: "job-1",
		name: "Riverside Custom Home",
		address: "142 Riverside Dr",
		status: "active",
		clientName: "Thompson Family",
		color: "#b33a3a"
	},
	{
		id: "job-2",
		name: "Oak Park Kitchen Reno",
		address: "88 Oak Park Ave",
		status: "active",
		clientName: "Davis & Co",
		color: "#2563eb"
	},
	{
		id: "job-3",
		name: "Lakewood New Build",
		address: "310 Lakewood Blvd",
		status: "active",
		clientName: "Meridian Holdings",
		color: "#16a34a"
	},
	{
		id: "job-4",
		name: "Pine Street Addition",
		address: "27 Pine St",
		status: "on-hold",
		clientName: "Roberts Family",
		color: "#ca8a04"
	}
]

function getMonday(): Date {
	const now = new Date()
	const day = now.getDay()
	const diff = now.getDate() - day + (day === 0 ? -6 : 1)
	const monday = new Date(now)
	monday.setDate(diff)
	monday.setHours(0, 0, 0, 0)
	return monday
}

function dayOffset(base: Date, days: number, hours: number, minutes: number = 0): string {
	const d = new Date(base)
	d.setDate(d.getDate() + days)
	d.setHours(hours, minutes, 0, 0)
	return d.toISOString()
}

const monday = getMonday()

export const mockTimeEntries: TimeEntry[] = [
	{
		id: "entry-1",
		userId: "user-1",
		jobId: "job-1",
		clockIn: dayOffset(monday, 0, 7, 0),
		clockOut: dayOffset(monday, 0, 15, 30),
		notes: "Foundation inspection completed"
	},
	{
		id: "entry-2",
		userId: "user-2",
		jobId: "job-1",
		clockIn: dayOffset(monday, 0, 7, 0),
		clockOut: dayOffset(monday, 0, 16, 0)
	},
	{
		id: "entry-3",
		userId: "user-3",
		jobId: "job-2",
		clockIn: dayOffset(monday, 0, 8, 0),
		clockOut: dayOffset(monday, 0, 16, 30),
		notes: "Cabinet demolition"
	},
	{
		id: "entry-4",
		userId: "user-1",
		jobId: "job-2",
		clockIn: dayOffset(monday, 1, 7, 30),
		clockOut: dayOffset(monday, 1, 15, 0),
		notes: "Plumbing rough-in review"
	},
	{
		id: "entry-5",
		userId: "user-4",
		jobId: "job-3",
		clockIn: dayOffset(monday, 1, 6, 30),
		clockOut: dayOffset(monday, 1, 15, 0)
	},
	{
		id: "entry-6",
		userId: "user-2",
		jobId: "job-3",
		clockIn: dayOffset(monday, 1, 7, 0),
		clockOut: dayOffset(monday, 1, 16, 0),
		notes: "Framing crew supervision"
	},
	{
		id: "entry-7",
		userId: "user-3",
		jobId: "job-2",
		clockIn: dayOffset(monday, 2, 7, 0),
		clockOut: dayOffset(monday, 2, 15, 30)
	},
	{
		id: "entry-8",
		userId: "user-1",
		jobId: "job-1",
		clockIn: dayOffset(monday, 2, 8, 0),
		clockOut: dayOffset(monday, 2, 16, 0),
		notes: "Electrical walk-through"
	},
	{
		id: "entry-9",
		userId: "user-4",
		jobId: "job-1",
		clockIn: dayOffset(monday, 2, 7, 0),
		clockOut: dayOffset(monday, 2, 14, 0)
	},
	{
		id: "entry-10",
		userId: "user-1",
		jobId: "job-3",
		clockIn: dayOffset(monday, 3, 7, 0),
		clockOut: null,
		notes: "Roof truss delivery"
	}
]

export function getUserById(id: string): User | undefined {
	return mockUsers.find(u => u.id === id)
}

export function getJobById(id: string): Job | undefined {
	return mockJobs.find(j => j.id === id)
}

export function getTimeEntriesWithDetails(): TimeEntryWithDetails[] {
	return mockTimeEntries
		.map(entry => {
			const user = getUserById(entry.userId)
			const job = getJobById(entry.jobId)
			if (!user || !job) return null

			let duration: number | null = null
			if (entry.clockOut) {
				duration = Math.round((new Date(entry.clockOut).getTime() - new Date(entry.clockIn).getTime()) / 60000)
			}

			return { ...entry, user, job, duration }
		})
		.filter((e): e is TimeEntryWithDetails => e !== null)
		.sort((a, b) => new Date(b.clockIn).getTime() - new Date(a.clockIn).getTime())
}

export function getActiveSession(userId: string): ActiveClockSession | null {
	const active = mockTimeEntries.find(e => e.userId === userId && e.clockOut === null)
	if (!active) return null

	const job = getJobById(active.jobId)
	if (!job) return null

	const elapsed = Math.floor((Date.now() - new Date(active.clockIn).getTime()) / 60000)
	return { timeEntry: active, job, elapsedMinutes: elapsed }
}
