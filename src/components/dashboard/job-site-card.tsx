import Link from "next/link"
import type { DbJob } from "@/lib/types"

interface SiteSession {
	name: string
	clockIn: string
}

interface TradePhase {
	trade: string
	startDate: string
	endDate: string
}

interface JobSiteCardProps {
	job: DbJob
	total: number
	completed: number
	crew: SiteSession[]
	currentPhase: TradePhase | null
	nextPhase: TradePhase | null
	openIssues: number
}

function elapsed(clockIn: string) {
	const mins = Math.round((Date.now() - new Date(clockIn).getTime()) / 60000)
	const h = Math.floor(mins / 60)
	const m = mins % 60
	return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function fmtDate(d: string) {
	return new Date(d + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" })
}

export function JobSiteCard({ job, total, completed, crew, currentPhase, nextPhase, openIssues }: JobSiteCardProps) {
	const pct = total > 0 ? Math.round((completed / total) * 100) : 0
	const barColor = pct >= 80 ? "bg-green-500" : pct >= 40 ? "bg-blue-500" : "bg-amber-400"
	const onSite = crew.length > 0

	return (
		<div className={`rounded-xl border bg-white overflow-hidden transition-shadow hover:shadow-md ${onSite ? "border-green-200" : "border-neutral-200"}`}>
			{/* Top bar */}
			<div className="flex items-center gap-2.5 px-4 py-3 border-b border-neutral-100">
				<div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: job.color }} />
				<div className="flex-1 min-w-0">
					<p className="text-sm font-semibold text-neutral-900 truncate">{job.name}</p>
					<p className="text-xs text-neutral-400 truncate">{job.client_name}{job.address ? ` · ${job.address}` : ""}</p>
				</div>
				{onSite && (
					<span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700 shrink-0">
						<span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
						{crew.length} on site
					</span>
				)}
				{openIssues > 0 && (
					<span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700 shrink-0">
						{openIssues} issue{openIssues > 1 ? "s" : ""}
					</span>
				)}
			</div>

			<div className="px-4 py-3 space-y-3">
				{/* Progress */}
				<div>
					<div className="flex items-center justify-between mb-1">
						<p className="text-xs text-neutral-500">Checklist</p>
						<p className="text-xs font-semibold text-neutral-700">{pct}% · {completed}/{total}</p>
					</div>
					<div className="h-1.5 w-full rounded-full bg-neutral-100 overflow-hidden">
						<div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
					</div>
				</div>

				{/* Current / Next phase */}
				{currentPhase && (
					<div className="flex items-center gap-2">
						<span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
						<p className="text-xs text-neutral-700">
							<span className="font-medium">{currentPhase.trade}</span>
							<span className="text-neutral-400"> · ends {fmtDate(currentPhase.endDate)}</span>
						</p>
					</div>
				)}
				{!currentPhase && nextPhase && (
					<div className="flex items-center gap-2">
						<span className="h-1.5 w-1.5 rounded-full bg-neutral-300 shrink-0" />
						<p className="text-xs text-neutral-500">
							Next: <span className="font-medium text-neutral-700">{nextPhase.trade}</span>
							<span> starts {fmtDate(nextPhase.startDate)}</span>
						</p>
					</div>
				)}

				{/* Crew */}
				{crew.length > 0 && (
					<div className="space-y-1">
						{crew.map((s, i) => (
							<div key={i} className="flex items-center justify-between">
								<p className="text-xs font-medium text-neutral-700">{s.name}</p>
								<p className="text-xs font-mono text-green-600">{elapsed(s.clockIn)}</p>
							</div>
						))}
					</div>
				)}
				{crew.length === 0 && (
					<p className="text-xs text-neutral-400 italic">No crew on site</p>
				)}
			</div>

			{/* Footer */}
			<div className="flex items-center justify-between px-4 py-2.5 border-t border-neutral-100 bg-neutral-50/50">
				<Link
					href={`/dashboard/jobs/${job.id}`}
					className="text-xs font-semibold text-brand-600 hover:underline"
				>
					Open job →
				</Link>
				<Link
					href={`/dashboard/jobs/${job.id}?tab=change-orders`}
					className="text-xs text-neutral-400 hover:text-neutral-600"
				>
					{openIssues > 0 ? `${openIssues} pending` : ""}
				</Link>
			</div>
		</div>
	)
}
