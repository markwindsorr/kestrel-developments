import Link from "next/link"

export interface RiskItem {
	severity: "critical" | "high" | "watch"
	title: string
	detail: string
	href: string
}

const sevStyle: Record<RiskItem["severity"], { dot: string; label: string }> = {
	critical: { dot: "bg-danger", label: "text-danger" },
	high: { dot: "bg-amber-500", label: "text-amber-700" },
	watch: { dot: "bg-blue-500", label: "text-blue-700" },
}

export function RiskRadar({ items }: { items: RiskItem[] }) {
	const order = { critical: 0, high: 1, watch: 2 }
	const sorted = [...items].sort(
		(a, b) => order[a.severity] - order[b.severity]
	)

	return (
		<div className="flex h-full flex-col rounded-xl border border-neutral-200 bg-white">
			<div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
				<div>
					<h2 className="font-semibold text-neutral-900">Risk Radar</h2>
					<p className="mt-0.5 text-xs text-neutral-500">
						{items.length === 0
							? "All clear"
							: `${items.length} item${items.length !== 1 ? "s" : ""} need attention`}
					</p>
				</div>
				{items.length > 0 && (
					<span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-bold text-danger">
						{items.filter((i) => i.severity === "critical").length} critical
					</span>
				)}
			</div>

			{sorted.length === 0 ? (
				<div className="flex flex-1 items-center justify-center px-5 py-10">
					<p className="text-sm text-neutral-400">
						Nothing on fire. Everything tracking within plan. ✓
					</p>
				</div>
			) : (
				<div className="flex-1 divide-y divide-neutral-100 overflow-y-auto">
					{sorted.map((item, i) => {
						const s = sevStyle[item.severity]
						return (
							<Link
								key={i}
								href={item.href}
								className="flex items-start gap-3 px-5 py-3 transition-colors hover:bg-neutral-50"
							>
								<span
									className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`}
								/>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm font-medium text-neutral-900">
										{item.title}
									</p>
									<p className="truncate text-xs text-neutral-500">
										{item.detail}
									</p>
								</div>
								<span
									className={`shrink-0 text-[10px] font-bold uppercase tracking-wide ${s.label}`}
								>
									{item.severity}
								</span>
							</Link>
						)
					})}
				</div>
			)}
		</div>
	)
}
