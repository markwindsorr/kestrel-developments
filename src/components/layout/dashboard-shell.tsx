"use client"

import { useState, useCallback } from "react"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

export function DashboardShell({ children }: { children: React.ReactNode }) {
	const [sidebarOpen, setSidebarOpen] = useState(false)

	const onClose = useCallback(() => setSidebarOpen(false), [])
	const onToggle = useCallback(() => setSidebarOpen(prev => !prev), [])

	return (
		<div className="min-h-screen bg-neutral-50">
			<Sidebar open={sidebarOpen} onClose={onClose} />
			<div className="lg:ml-64">
				<Header onMenuToggle={onToggle} />
				<main className="p-4 sm:p-6 lg:p-8">{children}</main>
			</div>
		</div>
	)
}
