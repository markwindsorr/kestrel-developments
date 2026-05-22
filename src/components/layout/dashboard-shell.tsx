"use client"

import { useState, useCallback } from "react"

import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

interface DashboardShellProps {
	children: React.ReactNode
	userName: string
	userRole: string
}

export function DashboardShell({ children, userName, userRole }: DashboardShellProps) {
	const [sidebarOpen, setSidebarOpen] = useState(false)

	const onClose = useCallback(() => setSidebarOpen(false), [])
	const onToggle = useCallback(() => setSidebarOpen(prev => !prev), [])

	return (
		<div className="min-h-screen bg-neutral-50">
			<Sidebar open={sidebarOpen} onClose={onClose} userRole={userRole} />
			<div className="lg:ml-64">
				<Header onMenuToggle={onToggle} userName={userName} userRole={userRole} />
				<main className="p-4 sm:p-6 lg:p-8">{children}</main>
			</div>
		</div>
	)
}
