import { redirect } from "next/navigation"
import Link from "next/link"

import { getOrgContext } from "@/lib/db/org"

const TAKEOFF_TYPES = [
	{
		label: "Electrical Takeoff",
		href: "/dashboard/takeoff/electrical",
		description: "Estimate electrical materials and components.",
		icon: (
			<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
			</svg>
		),
	},
	{
		label: "House Takeoff",
		href: "/dashboard/takeoff/house",
		description: "Estimate materials for full house construction.",
		icon: (
			<svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
				<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
			</svg>
		),
	},
]

export default async function TakeoffPage() {
	const orgContext = await getOrgContext()
	if (!orgContext || orgContext.role === "worker") redirect("/dashboard")

	return (
		<div>
			<div className="mb-8">
				<h1 className="text-2xl font-bold text-neutral-900">Takeoff</h1>
				<p className="mt-1 text-neutral-500">
					Select a takeoff type to get started.
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2">
				{TAKEOFF_TYPES.map((type) => (
					<Link
						key={type.href}
						href={type.href}
						className="flex flex-col gap-4 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
					>
						<div className="flex h-14 w-14 items-center justify-center rounded-lg bg-brand-600/10 text-brand-600">
							{type.icon}
						</div>
						<div>
							<h2 className="text-lg font-semibold text-neutral-900">{type.label}</h2>
							<p className="mt-1 text-sm text-neutral-500">{type.description}</p>
						</div>
					</Link>
				))}
			</div>
		</div>
	)
}
