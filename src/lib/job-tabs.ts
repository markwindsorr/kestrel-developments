import type { UserRole } from "@/lib/types"

export interface JobTabDef {
	key: string
	label: string
	/** Omit to allow all roles. */
	roles?: UserRole[]
}

// Single source of truth for the job-detail tabs and who can see each.
// Both the tab bar (JobTabs) and the server-side content guards read from this,
// so they can never drift apart.
export const JOB_TABS: JobTabDef[] = [
	{ key: "overview", label: "Overview" },
	{ key: "schedule", label: "Schedule", roles: ["admin"] },
	{ key: "change-orders", label: "Change Orders", roles: ["admin"] },
	{ key: "selections", label: "Selections", roles: ["admin"] },
	{ key: "warranty", label: "Warranty", roles: ["admin"] },
	{ key: "plans-specs", label: "Plans & Specs", roles: ["admin"] },
	{ key: "photos", label: "Photos & Video", roles: ["admin"] },
]

export function canViewJobTab(key: string, role: UserRole): boolean {
	const tab = JOB_TABS.find((t) => t.key === key)
	if (!tab) return false
	return !tab.roles || tab.roles.includes(role)
}

/** Resolve a requested tab to one the role may actually view (falls back to overview). */
export function resolveJobTab(requested: string, role: UserRole): string {
	return canViewJobTab(requested, role) ? requested : "overview"
}
