import type { NavItem } from "@/lib/types"

export const NAV_ITEMS: NavItem[] = [
	{ label: "Dashboard", href: "/dashboard", icon: "home" },
	{ label: "Time Tracking", href: "/dashboard/time-tracking", icon: "clock" },
	{ label: "Jobs", href: "/dashboard/jobs", icon: "briefcase" },
	{ label: "Checklists", href: "/dashboard/checklists", icon: "clipboard", roles: ["admin", "foreman"] },
	{ label: "Team", href: "/dashboard/team", icon: "users", roles: ["admin", "foreman"] },
]
