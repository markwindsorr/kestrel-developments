import type { NavItem } from "@/lib/types"

export const NAV_ITEMS: NavItem[] = [
	{ label: "Dashboard", href: "/dashboard", icon: "home" },
	{ label: "Sales", href: "/dashboard/sales", icon: "chart" },
	{ label: "Jobs", href: "/dashboard/jobs", icon: "briefcase" },
	{ label: "Time Tracking", href: "/dashboard/time-tracking", icon: "clock" },
	{ label: "Checklists", href: "/dashboard/checklists", icon: "clipboard", roles: ["admin", "foreman"] },
	{ label: "Team", href: "/dashboard/team", icon: "users", roles: ["admin", "foreman"] },
	{ label: "Takeoff", href: "/dashboard/takeoff", icon: "ruler" },
	{ label: "Cost Rates", href: "/dashboard/settings/rates", icon: "settings", roles: ["admin"] },
]
