"use client"

import Link from "next/link"

const TABS = [
	{ key: "overview", label: "Overview" },
	{ key: "schedule", label: "Schedule" },
	{ key: "change-orders", label: "Change Orders" },
	{ key: "selections", label: "Selections" },
	{ key: "warranty", label: "Warranty" },
	{ key: "plans-specs", label: "Plans & Specs" },
	{ key: "photos", label: "Photos & Video" },
]

interface JobTabsProps {
	active: string
	jobId: string
	counts?: Partial<Record<string, number>>
}

export function JobTabs({ active, jobId, counts = {} }: JobTabsProps) {
	return (
		<div className="flex gap-0 border-b border-neutral-200 mb-6 overflow-x-auto">
			{TABS.map(tab => (
				<Link
					key={tab.key}
					href={`/dashboard/jobs/${jobId}?tab=${tab.key}`}
					className={`shrink-0 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
						active === tab.key
							? "border-brand-600 text-brand-600"
							: "border-transparent text-neutral-500 hover:text-neutral-700 hover:border-neutral-300"
					}`}
				>
					{tab.label}
					{counts[tab.key] !== undefined && counts[tab.key]! > 0 && (
						<span className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
							active === tab.key ? "bg-brand-100 text-brand-700" : "bg-neutral-100 text-neutral-500"
						}`}>
							{counts[tab.key]}
						</span>
					)}
				</Link>
			))}
		</div>
	)
}
