import type { TimeEntryWithDetails } from "@/lib/types"
import { formatDate, formatTime, formatDuration } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface TimeLogTableProps {
	entries: TimeEntryWithDetails[]
}

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
				<h2 className="text-lg font-semibold text-neutral-900">Time Log</h2>
			</div>

			{/* Mobile card view */}
			<div className="divide-y divide-neutral-100 sm:hidden">
				{entries.map(entry => (
					<div key={entry.id} className="p-4 space-y-2">
						<div className="flex items-center justify-between">
							<div className="flex items-center gap-2">
								<span
									className="inline-block h-2.5 w-2.5 rounded-full"
									style={{ backgroundColor: entry.job.color }}
								/>
								<span className="font-medium text-neutral-900">{entry.job.name}</span>
							</div>
							{entry.clockOut ? (
								<span className="text-sm font-medium text-neutral-900">
									{entry.duration !== null ? formatDuration(entry.duration) : "—"}
								</span>
							) : (
								<Badge variant="success">In Progress</Badge>
							)}
						</div>
						<div className="flex items-center justify-between text-sm text-neutral-500">
							<span>{formatDate(entry.clockIn)}</span>
							<span>
								{formatTime(entry.clockIn)}
								{entry.clockOut ? ` — ${formatTime(entry.clockOut)}` : ""}
							</span>
						</div>
						<div className="flex items-center justify-between text-sm">
							<span className="text-neutral-500">{entry.user.name}</span>
							{entry.notes && (
								<span className="truncate max-w-[150px] text-neutral-400">{entry.notes}</span>
							)}
						</div>
					</div>
				))}
			</div>

			{/* Desktop table view */}
			<div className="hidden overflow-x-auto sm:block">
				<table className="w-full">
					<thead>
						<tr className="border-b border-neutral-100 bg-neutral-50 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
							<th className="px-6 py-3">Date</th>
							<th className="px-6 py-3">Job</th>
							<th className="px-6 py-3">Employee</th>
							<th className="px-6 py-3">Clock In</th>
							<th className="px-6 py-3">Clock Out</th>
							<th className="px-6 py-3">Duration</th>
							<th className="px-6 py-3">Notes</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-neutral-100">
						{entries.map(entry => (
							<tr key={entry.id} className="text-sm hover:bg-neutral-50">
								<td className="whitespace-nowrap px-6 py-4 text-neutral-700">
									{formatDate(entry.clockIn)}
								</td>
								<td className="whitespace-nowrap px-6 py-4">
									<div className="flex items-center gap-2">
										<span
											className="inline-block h-2.5 w-2.5 rounded-full"
											style={{ backgroundColor: entry.job.color }}
										/>
										<span className="font-medium text-neutral-900">{entry.job.name}</span>
									</div>
								</td>
								<td className="whitespace-nowrap px-6 py-4 text-neutral-700">{entry.user.name}</td>
								<td className="whitespace-nowrap px-6 py-4 text-neutral-700">
									{formatTime(entry.clockIn)}
								</td>
								<td className="whitespace-nowrap px-6 py-4 text-neutral-700">
									{entry.clockOut ? formatTime(entry.clockOut) : <Badge variant="success">In Progress</Badge>}
								</td>
								<td className="whitespace-nowrap px-6 py-4 font-medium text-neutral-900">
									{entry.duration !== null ? formatDuration(entry.duration) : "—"}
								</td>
								<td className="max-w-[200px] truncate px-6 py-4 text-neutral-500">
									{entry.notes ?? "—"}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	)
}
