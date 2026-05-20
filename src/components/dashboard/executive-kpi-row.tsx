interface Kpi {
	label: string
	value: string
	sub: string
	tone: "neutral" | "good" | "warn" | "bad"
	accent?: boolean
}

const toneDot: Record<Kpi["tone"], string> = {
	neutral: "bg-neutral-300",
	good: "bg-green-500",
	warn: "bg-amber-400",
	bad: "bg-danger",
}

export function ExecutiveKpiRow({ kpis }: { kpis: Kpi[] }) {
	return (
		<div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
			{kpis.map((k) => (
				<div
					key={k.label}
					className={`rounded-xl border px-4 py-3.5 ${
						k.accent
							? "border-brand-200 bg-brand-50/40"
							: "border-neutral-200 bg-white"
					}`}
				>
					<div className="mb-1 flex items-center gap-2">
						<span
							className={`h-2 w-2 shrink-0 rounded-full ${toneDot[k.tone]}`}
						/>
						<p className="text-xs font-medium text-neutral-500">{k.label}</p>
					</div>
					<p className="text-2xl font-bold tabular-nums text-neutral-900">
						{k.value}
					</p>
					<p className="mt-0.5 text-xs text-neutral-500">{k.sub}</p>
				</div>
			))}
		</div>
	)
}
