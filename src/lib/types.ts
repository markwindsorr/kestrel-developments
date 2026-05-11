export type UserRole = "admin" | "foreman" | "worker"

export interface User {
	id: string
	name: string
	email: string
	avatarUrl?: string
}

export interface OrgMember extends User {
	role: UserRole
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

export interface DbOrganization {
	id: string
	name: string
	created_by: string
	created_at: string
}

export interface DbOrgMembership {
	id: string
	org_id: string
	user_id: string
	role: UserRole
	created_at: string
}

export interface DbProfile {
	id: string
	name: string
	email: string
	avatar_url: string | null
	created_at: string
}

export interface DbJob {
	id: string
	org_id: string
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
	completed_at: string | null
	completed_by: string | null
	notes: string | null
	sort_order: number
	created_at: string
}

export interface DbTimeEntry {
	id: string
	org_id: string
	user_id: string
	job_id: string
	clock_in: string
	clock_out: string | null
	notes: string | null
	created_at: string
}

export interface DbChecklistTemplate {
	id: string
	org_id: string
	name: string
	is_default: boolean
	created_by: string
	created_at: string
}

export interface DbChecklistTemplateItem {
	id: string
	template_id: string
	section: string
	label: string
	sort_order: number
	created_at: string
}

export type InviteStatus = "pending" | "used" | "expired"

export interface DbInvite {
	id: string
	token: string
	role: UserRole
	email: string | null
	org_id: string
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
	orgId: string
	invitedBy: string
	usedBy: string | null
	usedAt: string | null
	expiresAt: string
	createdAt: string
	status: InviteStatus
}
