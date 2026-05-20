import type { TimeEntryWithDetails } from "@/lib/types"

interface TimeLogTableProps {
	entries: TimeEntryWithDetails[]
}

const fmtDate = (iso: string) =>
	new Date(iso + "T00:00:00").toLocaleDateString("en-CA", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})

export function TimeLogTable({ entries }: TimeLogTableProps) {
	if (entries.length === 0) {
		return (
			<div className="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-sm">
				<p className="text-neutral-400">No time entries yet.</p>
			</div>
		)
	}

	return (
		<div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
			<div className="border-b border-neutral-200 px-4 py-4 sm:px-6">
				<h2 className="text-lg font-semibold text-neutral-900">Team time log</h2>
			</div>

			<div className="divide-y divide-neutral-100 sm:hidden">
				{entries.map((entry) => (
					<div key={entry.id} className="p-4 space-y-1">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2 min-w-0">
								<span
									className="inline-block h-2.5 w-2.5 rounded-full shrink-0"
									style={{ backgroundColor: entry.job.color }}
								/>
								<span className="font-medium text-neutral-900 truncate">
									{entry.job.name}
								</span>
							</div>
							<span className="text-sm font-semibold text-neutral-900 tabular-nums">
								{entry.hours.toFixed(1)}h
							</span>
						</div>
						<div className="flex items-center justify-between text-sm text-neutral-500">
							<span>{fmtDate(entry.workDate)}</span>
							<span>{entry.user.name}</span>
						</div>
						{entry.dailyTask && (
							<p className="text-sm text-neutral-600 truncate">{entry.dailyTask}</p>
						)}
					</div>
				))}
			</div>

			<div className="hidden overflow-x-auto sm:block">
				<table className="w-full">
					<thead>
						<tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
							<th className="px-6 py-3">Date</th>
							<th className="px-6 py-3">Job</th>
							<th className="px-6 py-3">Employee</th>
							<th className="px-6 py-3 text-right">Hours</th>
							<th className="px-6 py-3">Description</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-neutral-100">
						{entries.map((entry) => (
							<tr key={entry.id} className="text-sm hover:bg-neutral-50">
								<td className="whitespace-nowrap px-6 py-4 text-neutral-700">
									{fmtDate(entry.workDate)}
								</td>
								<td className="whitespace-nowrap px-6 py-4">
									<div className="flex items-center gap-2">
										<span
											className="inline-block h-2.5 w-2.5 rounded-full"
											style={{ backgroundColor: entry.job.color }}
										/>
										<span className="font-medium text-neutral-900">
											{entry.job.name}
										</span>
									</div>
								</td>
								<td className="whitespace-nowrap px-6 py-4 text-neutral-700">
									{entry.user.name}
								</td>
								<td className="whitespace-nowrap px-6 py-4 text-right font-medium text-neutral-900 tabular-nums">
									{entry.hours.toFixed(1)}h
								</td>
								<td className="max-w-[300px] truncate px-6 py-4 text-neutral-600">
									{entry.dailyTask ?? "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
