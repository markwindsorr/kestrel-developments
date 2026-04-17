"use client"

import { CURRENT_USER_ID } from "@/lib/constants"
import { getUserById } from "@/lib/mock-data"

interface HeaderProps {
	onMenuToggle: () => void
}

export function Header({ onMenuToggle }: HeaderProps) {
	const user = getUserById(CURRENT_USER_ID)

	return (
		<header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-neutral-200 bg-white px-4 sm:px-6 lg:px-8">
			<button
				onClick={onMenuToggle}
				className="rounded-lg p-2 text-neutral-600 hover:bg-neutral-100 lg:hidden"
				aria-label="Open menu"
			>
				<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
					<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
				</svg>
			</button>
			<div className="hidden lg:block" />
			<div className="flex items-center gap-3">
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-medium text-white">
					{user?.name
						.split(" ")
						.map(n => n[0])
						.join("")}
				</div>
				<span className="hidden text-sm font-medium text-neutral-700 sm:block">{user?.name}</span>
			</div>
		</header>
	)
}
