"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"

import { NAV_ITEMS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { SidebarNavItem } from "@/components/layout/sidebar-nav-item"

interface SidebarProps {
	open: boolean
	onClose: () => void
}

export function Sidebar({ open, onClose }: SidebarProps) {
	const pathname = usePathname()

	return (
		<>
			{/* Backdrop overlay — mobile only */}
			{open && (
				<div
					className="fixed inset-0 z-40 bg-black/50 lg:hidden"
					onClick={onClose}
				/>
			)}

			{/* Sidebar panel */}
			<aside
				className={cn(
					"fixed left-0 top-0 bottom-0 z-50 flex w-64 flex-col bg-neutral-900 transition-transform duration-200 ease-in-out",
					"lg:z-30 lg:translate-x-0",
					open ? "translate-x-0" : "-translate-x-full"
				)}
			>
				{/* Logo + close button on mobile */}
				<div className="flex items-center justify-between border-b border-neutral-700 px-6 py-5">
					<div className="flex items-center gap-3">
						<Image
							src="/kestral-logo.jpeg"
							alt="Kestrel Developments"
							width={36}
							height={36}
							className="rounded"
						/>
						<span className="text-lg font-semibold text-white">Kestrel</span>
					</div>
					<button
						onClick={onClose}
						className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white lg:hidden"
						aria-label="Close sidebar"
					>
						<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				<nav className="flex-1 space-y-1 overflow-y-auto py-4">
					{NAV_ITEMS.map(item => (
						<div key={item.href} onClick={onClose}>
							<SidebarNavItem
								item={item}
								isActive={
									item.href === "/dashboard"
										? pathname === "/dashboard"
										: pathname.startsWith(item.href)
								}
							/>
						</div>
					))}
				</nav>

				<div className="border-t border-neutral-700 px-6 py-4">
					<p className="text-xs text-neutral-500">Kestrel Developments</p>
				</div>
			</aside>
		</>
	)
}
