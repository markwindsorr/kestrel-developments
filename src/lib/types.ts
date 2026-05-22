export type UserRole = "admin" | "foreman" | "worker" | "subcontractor"

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
	budgetDays?: number | null
	budgetHoursPerDay?: number | null
	budgetWorkers?: number | null
	budgetHours?: number | null
	plannedStartDate?: string | null
	plannedEndDate?: string | null
}

export interface TimeEntry {
	id: string
	userId: string
	jobId: string
	workDate: string
	hours: number
	notes: string | null
	dailyTask: string | null
}

export interface TimeEntryWithDetails extends TimeEntry {
	user: User
	job: Job
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
	budget_days: number | null
	budget_hours_per_day: number | null
	budget_workers: number | null
	budget_hours_total: number | null
	planned_start_date: string | null
	planned_end_date: string | null
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
	work_date: string
	hours: number
	clock_in: string | null
	clock_out: string | null
	notes: string | null
	daily_task: string | null
	created_at: string
}

export interface DbTodoItem {
	id: string
	org_id: string
	assignee_id: string
	created_by: string
	job_id: string | null
	label: string
	is_completed: boolean
	completed_at: string | null
	due_date: string | null
	created_at: string
}

export interface TodoItem {
	id: string
	assigneeId: string
	createdBy: string
	createdByName: string
	jobId: string | null
	jobName: string | null
	label: string
	isCompleted: boolean
	completedAt: string | null
	dueDate: string | null
	createdAt: string
	source: "self" | "assigned"
}

export type BudgetStatus = "green" | "yellow" | "red" | "unset"

export interface BudgetSnapshot {
	status: BudgetStatus
	pct: number | null
	hoursLogged: number
	budgetHours: number | null
	remainingHours: number | null
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
