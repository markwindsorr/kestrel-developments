"use client"

import { signOut } from "@/app/login/actions"

interface HeaderProps {
	onMenuToggle: () => void
	userName: string
	userRole: string
}

export function Header({ onMenuToggle, userName, userRole }: HeaderProps) {
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
				<div className="hidden text-right sm:block">
					<p className="text-sm font-medium text-neutral-700">{userName}</p>
					<p className="text-xs capitalize text-neutral-400">{userRole}</p>
				</div>
				<div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-sm font-medium text-white">
					{userName
						.split(" ")
						.map((n) => n[0])
						.join("")}
				</div>
				<form action={signOut}>
					<button
						type="submit"
						className="rounded-lg p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
						title="Sign out"
					>
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
						</svg>
					</button>
				</form>
			</div>
		</header>
	)
}
