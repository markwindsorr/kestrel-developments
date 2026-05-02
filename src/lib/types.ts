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
	notes: string | null
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
	roles?: UserRole[]
}

// Database row types (match Supabase schema)
export interface DbProfile {
	id: string
	name: string
	email: string
	role: UserRole
	avatar_url: string | null
	created_at: string
}

export interface DbJob {
	id: string
	name: string
	address: string
	status: JobStatus
	client_name: string
	color: string
	created_at: string
}

export interface DbChecklistItem {
	id: string
	job_id: string
	section: string
	label: string
	is_completed: boolean
	sort_order: number
	created_at: string
}

export interface DbTimeEntry {
	id: string
	user_id: string
	job_id: string
	clock_in: string
	clock_out: string | null
	notes: string | null
	created_at: string
}

export type InviteStatus = "pending" | "used" | "expired"

export interface DbInvite {
	id: string
	token: string
	role: UserRole
	email: string | null
	invited_by: string
	used_by: string | null
	used_at: string | null
	expires_at: string
	created_at: string
}

export interface Invite {
	id: string
	token: string
	role: UserRole
	email: string | null
	invitedBy: string
	usedBy: string | null
	usedAt: string | null
	expiresAt: string
	createdAt: string
	status: InviteStatus
}
