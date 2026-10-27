import type { NavItem } from "@/lib/types"

export const NAV_ITEMS: NavItem[] = [
	{ label: "Dashboard", href: "/dashboard", icon: "home" },
	{ label: "Sales", href: "/dashboard/sales", icon: "chart", roles: ["admin"] },
	{ label: "Jobs", href: "/dashboard/jobs", icon: "briefcase" },
	{ label: "Time Tracking", href: "/dashboard/time-tracking", icon: "clock", roles: ["admin", "foreman", "worker"] },
	{ label: "Checklists", href: "/dashboard/checklists", icon: "clipboard", roles: ["admin", "foreman", "worker"] },
	{ label: "Team", href: "/dashboard/team", icon: "users", roles: ["admin", "foreman"] },
	{ label: "Takeoff", href: "/dashboard/takeoff", icon: "ruler", roles: ["admin", "foreman"] },
]
