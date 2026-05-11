import type { Lead, LeadStage } from "@/lib/db/leads"
import Link from "next/link"

const STAGES: { key: LeadStage; label: string; color: string }[] = [
	{ key: "lead",     label: "Lead",     color: "bg-neutral-400" },
	{ key: "bid",      label: "Bid",      color: "bg-blue-500" },
	{ key: "proposal", label: "Proposal", color: "bg-violet-500" },
	{ key: "won",      label: "Won",      color: "bg-green-500" },
]

function fmtVal(n: number) {
	if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
	if (n >= 1_000) return `$${Math.round(n / 1_000)}K`
	return `$${n.toLocaleString("en-CA")}`
}

export function PipelineSummary({ leads, company }: { leads: Lead[]; company: string }) {
	const active = leads.filter(l => l.stage !== "lost")
	const maxVal = Math.max(...STAGES.map(s => active.filter(l => l.stage === s.key).reduce((sum, l) => sum + (l.estimatedValue ?? 0), 0)), 1)
	const totalPipeline = active.filter(l => l.stage !== "won").reduce((s, l) => s + (l.estimatedValue ?? 0), 0)
	const wonValue = active.filter(l => l.stage === "won").reduce((s, l) => s + (l.estimatedValue ?? 0), 0)

	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-5 h-full flex flex-col">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="font-semibold text-neutral-900">Sales Pipeline</h2>
					<p className="text-xs text-neutral-500 mt-0.5">{fmtVal(totalPipeline)} active · {fmtVal(wonValue)} won</p>
				</div>
				<Link href="/dashboard/sales" className="text-xs font-medium text-brand-600 hover:underline">
					Manage →
				</Link>
			</div>

			<div className="space-y-3 flex-1">
				{STAGES.map(stage => {
					const stageleads = active.filter(l => l.stage === stage.key)
					const value = stageleads.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)
					const pct = maxVal > 0 ? Math.max((value / maxVal) * 100, stageleads.length > 0 ? 6 : 0) : 0

					return (
						<div key={stage.key} className="flex items-center gap-3">
							<p className="w-16 text-xs font-medium text-neutral-500 shrink-0">{stage.label}</p>
							<div className="flex-1 h-6 bg-neutral-100 rounded-md overflow-hidden">
								<div
									className={`h-full rounded-md transition-all ${stage.color} flex items-center px-2`}
									style={{ width: `${pct}%` }}
								/>
							</div>
							<div className="w-24 text-right shrink-0">
								<span className="text-xs font-bold text-neutral-700">{stageleads.length}</span>
								<span className="text-xs text-neutral-400 ml-1.5">{value > 0 ? fmtVal(value) : "—"}</span>
							</div>
						</div>
					)
				})}
			</div>

			{leads.length === 0 && (
				<p className="text-sm text-neutral-400 text-center py-4">No leads yet — <Link href="/dashboard/sales" className="text-brand-600 hover:underline">add one</Link></p>
			)}
		</div>
	)
}
