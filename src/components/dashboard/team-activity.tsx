interface Session {
	name: string
	jobName: string
	jobColor: string
	hours: number
}

interface TeamActivityProps {
	sessions: Session[]
	weeklyHours: number
}

export function TeamActivity({ sessions, weeklyHours }: TeamActivityProps) {
	const todayTotal = sessions.reduce((sum, s) => sum + s.hours, 0)

	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-5">
			<div className="flex items-center justify-between mb-4">
				<div>
					<h2 className="font-semibold text-neutral-900">Today&apos;s hours</h2>
					<p className="text-xs text-neutral-500 mt-0.5">
						{weeklyHours.toFixed(1)}h logged this week
					</p>
				</div>
				<span className="text-xs font-medium text-neutral-500 tabular-nums">
					{todayTotal.toFixed(1)}h today
				</span>
			</div>

			{sessions.length === 0 ? (
				<p className="text-sm text-neutral-400">
					No hours logged today yet.
				</p>
			) : (
				<div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
					{sessions.map((s, i) => (
						<div
							key={i}
							className="flex items-center gap-3 rounded-lg bg-neutral-50 px-3 py-2.5"
						>
							<div
								className="h-2.5 w-2.5 rounded-full shrink-0"
								style={{ backgroundColor: s.jobColor }}
							/>
							<div className="min-w-0 flex-1">
								<p className="text-sm font-medium text-neutral-900 truncate">
									{s.name}
								</p>
								<p className="text-xs text-neutral-500 truncate">{s.jobName}</p>
							</div>
							<span className="text-xs font-mono text-green-600 tabular-nums shrink-0">
								{s.hours.toFixed(1)}h
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
