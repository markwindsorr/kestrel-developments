export type UserRole = "admin" | "foreman" | "worker"

export interface User {
	id: string
	name: string
	email: string
	role: UserRole
	avatarUrl?: string
}

export type JobStatus = "active" | "on-hold" | "completed"

export interface Job {
	id: string
	name: string
	address: string
	status: JobStatus
	clientName: string
	color: string
}

export interface TimeEntry {
	id: string
	userId: string
	jobId: string
	clockIn: string
	clockOut: string | null
	notes?: string
}

export interface TimeEntryWithDetails extends TimeEntry {
	user: User
	job: Job
	duration: number | null
}

export interface ActiveClockSession {
	timeEntry: TimeEntry
	job: Job
	elapsedMinutes: number
}

export interface NavItem {
	label: string
	href: string
	icon: string
}
