import Link from "next/link"

import { CURRENT_USER_ID } from "@/lib/constants"
import { getUserById, mockJobs, mockUsers, getTimeEntriesWithDetails } from "@/lib/mock-data"
import { formatDuration } from "@/lib/utils"
import { Card } from "@/components/ui/card"

export default function DashboardPage() {
	const user = getUserById(CURRENT_USER_ID)
	const entries = getTimeEntriesWithDetails()
	const activeJobs = mockJobs.filter(j => j.status === "active")

	const now = new Date()
	const monday = new Date(now)
	const day = monday.getDay()
	monday.setDate(monday.getDate() - day + (day === 0 ? -6 : 1))
	monday.setHours(0, 0, 0, 0)

	const weekEntries = entries.filter(e => new Date(e.clockIn) >= monday)
	const totalMinutes = weekEntries.reduce((sum, e) => sum + (e.duration ?? 0), 0)
	const activeCount = entries.filter(e => e.clockOut === null).length

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-neutral-900">Welcome back, {user?.name.split(" ")[0]}</h1>
				<p className="mt-1 text-neutral-500">Here&apos;s what&apos;s happening across your jobs this week.</p>
			</div>

			<div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
							<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M2.25 21h19.5M3.75 3v18m16.5-18v18M5.25 3h13.5M5.25 21V6.75c0-.621.504-1.125 1.125-1.125h3.375c.621 0 1.125.504 1.125 1.125V21m4.5-15v15m-1.125-15h3.375c.621 0 1.125.504 1.125 1.125v12.75"
								/>
							</svg>
						</div>
						<div>
							<p className="text-2xl font-bold text-neutral-900">{activeJobs.length}</p>
							<p className="text-sm text-neutral-500">Active Jobs</p>
						</div>
					</div>
				</Card>

				<Card>
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-info">
							<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
								/>
							</svg>
						</div>
						<div>
							<p className="text-2xl font-bold text-neutral-900">{mockUsers.length}</p>
							<p className="text-sm text-neutral-500">Team Members</p>
						</div>
					</div>
				</Card>

				<Card>
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-50 text-success">
							<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
						</div>
						<div>
							<p className="text-2xl font-bold text-neutral-900">{formatDuration(totalMinutes)}</p>
							<p className="text-sm text-neutral-500">Hours This Week</p>
						</div>
					</div>
				</Card>

				<Card>
					<div className="flex items-center gap-4">
						<div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-50 text-warning">
							<svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
								/>
							</svg>
						</div>
						<div>
							<p className="text-2xl font-bold text-neutral-900">{activeCount}</p>
							<p className="text-sm text-neutral-500">Clocked In Now</p>
						</div>
					</div>
				</Card>
			</div>

			<Card title="Quick Actions">
				<div className="flex flex-wrap gap-3">
					<Link
						href="/dashboard/time-tracking"
						className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
					>
						<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
							/>
						</svg>
						Time Tracking
					</Link>
				</div>
			</Card>
		</div>
	)
}
