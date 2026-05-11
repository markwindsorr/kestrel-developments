import { formatDuration } from "@/lib/utils"

interface Session {
	name: string
	jobName: string
	jobColor: string
	clockIn: string
}

export function TeamActivity({ sessions, weeklyMinutes }: { sessions: Session[]; weeklyMinutes: number }) {
	const elapsed = (clockIn: string) => {
		const mins = Math.round((Date.now() - new Date(clockIn).getTime()) / 60000)
		return formatDuration(mins)
	}

	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-5">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="font-semibold text-neutral-900">Team Activity</h2>
					<p className="text-xs text-neutral-500 mt-0.5">{formatDuration(weeklyMinutes)} logged this week</p>
				</div>
				<div className="flex items-center gap-1.5">
					{sessions.length > 0 && (
						<span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
					)}
					<span className="text-xs font-medium text-neutral-500">
						{sessions.length} clocked in
					</span>
				</div>
			</div>

			{sessions.length === 0 ? (
				<p className="text-sm text-neutral-400">No one is currently clocked in.</p>
			) : (
				<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{sessions.map((s, i) => (
						<div key={i} className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2.5">
							<div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.jobColor }} />
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium text-neutral-900 truncate">{s.name}</p>
								<p className="text-xs text-neutral-500 truncate">{s.jobName}</p>
							</div>
							<span className="text-xs font-mono text-green-600 shrink-0">{elapsed(s.clockIn)}</span>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
