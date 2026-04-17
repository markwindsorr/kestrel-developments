"use client"

import Link from "next/link"

import { cn } from "@/lib/utils"
import type { NavItem } from "@/lib/types"

const icons: Record<string, React.ReactNode> = {
	home: (
		<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
			/>
		</svg>
	),
	clock: (
		<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	)
}

interface SidebarNavItemProps {
	item: NavItem
	isActive: boolean
}

export function SidebarNavItem({ item, isActive }: SidebarNavItemProps) {
	return (
		<Link
			href={item.href}
			className={cn(
				"mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
				isActive
					? "bg-brand-600/20 text-brand-200"
					: "text-neutral-400 hover:bg-neutral-800 hover:text-white"
			)}
		>
			{icons[item.icon]}
			{item.label}
		</Link>
	)
}
