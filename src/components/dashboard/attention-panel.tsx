import Link from "next/link"
import type { ChangeOrder } from "@/lib/db/change-orders"
import type { WarrantyItem } from "@/lib/db/warranty-items"
import type { Lead } from "@/lib/db/leads"

interface AttentionItem {
	type: "co" | "warranty" | "lead"
	label: string
	sub: string
	href: string
	urgency: "red" | "amber" | "blue"
}

interface Props {
	pendingCOs: Array<ChangeOrder & { jobName: string }>
	urgentWarranty: Array<WarrantyItem & { jobName: string }>
	staleLeads: Lead[]
}

export function AttentionPanel({ pendingCOs, urgentWarranty, staleLeads }: Props) {
	const items: AttentionItem[] = []

	for (const co of pendingCOs.slice(0, 3)) {
		const abs = Math.abs(co.amount)
		const sign = co.amount >= 0 ? "+" : "−"
		items.push({
			type: "co",
			label: `CO pending: ${co.title}`,
			sub: `${co.jobName} · ${sign}$${Math.round(abs).toLocaleString("en-CA")}`,
			href: `/dashboard/jobs/${co.jobId}?tab=change-orders`,
			urgency: "amber",
		})
	}

	for (const w of urgentWarranty.slice(0, 3)) {
		items.push({
			type: "warranty",
			label: w.title,
			sub: `${w.jobName} · High priority warranty`,
			href: `/dashboard/jobs/${w.jobId}?tab=warranty`,
			urgency: "red",
		})
	}

	for (const l of staleLeads.slice(0, 3)) {
		const days = Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / 86_400_000)
		items.push({
			type: "lead",
			label: `${l.clientName} — no activity`,
			sub: `${l.stage} stage · ${days} days since update`,
			href: "/dashboard/sales",
			urgency: "blue",
		})
	}

	const urgencyDot: Record<string, string> = {
		red: "bg-red-500",
		amber: "bg-amber-400",
		blue: "bg-blue-400",
	}

	const urgencyBg: Record<string, string> = {
		red: "hover:bg-red-50",
		amber: "hover:bg-amber-50",
		blue: "hover:bg-blue-50",
	}

	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-5 h-full flex flex-col">
			<div className="flex items-center gap-2 mb-4">
				<h2 className="font-semibold text-neutral-900">Needs Attention</h2>
				{items.length > 0 && (
					<span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
						{items.length}
					</span>
				)}
			</div>

			{items.length === 0 ? (
				<div className="flex flex-col items-center justify-center flex-1 py-6">
					<div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center mb-2">
						<svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
							<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<p className="text-sm font-medium text-neutral-700">All clear</p>
					<p className="text-xs text-neutral-400 mt-0.5">Nothing needs your attention</p>
				</div>
			) : (
				<div className="space-y-1 flex-1">
					{items.map((item, i) => (
						<Link
							key={i}
							href={item.href}
							className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${urgencyBg[item.urgency]}`}
						>
							<div className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${urgencyDot[item.urgency]}`} />
							<div className="min-w-0">
								<p className="text-sm font-medium text-neutral-900 leading-tight">{item.label}</p>
								<p className="text-xs text-neutral-500 mt-0.5">{item.sub}</p>
							</div>
						</Link>
					))}
				</div>
			)}
		</div>
	)
}
