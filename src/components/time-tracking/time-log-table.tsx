"use client"

import { useActionState, useEffect, useState } from "react"

import type { TimeEntryWithDetails, Job } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
	deleteTimeEntry,
	updateTimeEntry,
} from "@/app/dashboard/time-tracking/actions"

interface TimeLogTableProps {
	entries: TimeEntryWithDetails[]
	jobs: Job[]
}

const fmtDate = (iso: string) =>
	new Date(iso + "T00:00:00").toLocaleDateString("en-CA", {
		year: "numeric",
		month: "short",
		day: "numeric",
	})

export function TimeLogTable({ entries, jobs }: TimeLogTableProps) {
	const [editingId, setEditingId] = useState<string | null>(null)

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
				{entries.map((entry) =>
					editingId === entry.id ? (
						<EditRow
							key={entry.id}
							entry={entry}
							jobs={jobs}
							onDone={() => setEditingId(null)}
						/>
					) : (
						<div key={entry.id} className="group p-4 space-y-1">
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
								<div className="flex items-center gap-2">
									<span className="text-sm font-semibold text-neutral-900 tabular-nums">
										{entry.hours.toFixed(1)}h
									</span>
									<EntryActions
										entryId={entry.id}
										onEdit={() => setEditingId(entry.id)}
									/>
								</div>
							</div>
							<div className="flex items-center justify-between text-sm text-neutral-500">
								<span>{fmtDate(entry.workDate)}</span>
								<span>{entry.user.name}</span>
							</div>
							{entry.dailyTask && (
								<p className="text-sm text-neutral-600 truncate">{entry.dailyTask}</p>
							)}
						</div>
					)
				)}
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
							<th className="px-6 py-3 text-right">Actions</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-neutral-100">
						{entries.map((entry) =>
							editingId === entry.id ? (
								<EditTableRow
									key={entry.id}
									entry={entry}
									jobs={jobs}
									onDone={() => setEditingId(null)}
								/>
							) : (
								<tr key={entry.id} className="group text-sm hover:bg-neutral-50">
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
									<td className="whitespace-nowrap px-6 py-4 text-right">
										<EntryActions
											entryId={entry.id}
											onEdit={() => setEditingId(entry.id)}
										/>
									</td>
								</tr>
							)
						)}
					</tbody>
				</table>
			</div>
		</div>
	)
}

function EntryActions({
	entryId,
	onEdit,
}: {
	entryId: string
	onEdit: () => void
}) {
	return (
		<div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
			<button
				type="button"
				onClick={onEdit}
				className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
				aria-label="Edit entry"
			>
				<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
					<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
				</svg>
			</button>
			<form action={deleteTimeEntry}>
				<input type="hidden" name="id" value={entryId} />
				<button
					type="submit"
					className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-danger"
					aria-label="Delete entry"
				>
					<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
						<path
							fillRule="evenodd"
							d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 100 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
				</button>
			</form>
		</div>
	)
}

function EditRow({
	entry,
	jobs,
	onDone,
}: {
	entry: TimeEntryWithDetails
	jobs: Job[]
	onDone: () => void
}) {
	const [state, formAction, pending] = useActionState(updateTimeEntry, {
		error: "",
	})
	const [jobId, setJobId] = useState(entry.jobId)
	const [workDate, setWorkDate] = useState(entry.workDate)
	const [hours, setHours] = useState(String(entry.hours))
	const [dailyTask, setDailyTask] = useState(entry.dailyTask ?? "")

	useEffect(() => {
		if (state.savedAt) onDone()
	}, [state.savedAt, onDone])

	return (
		<div className="p-4">
			<form action={formAction} className="rounded-lg border border-brand-200 bg-brand-50/40 p-3">
				<input type="hidden" name="id" value={entry.id} />
				<p className="mb-2 text-xs font-medium text-neutral-500">
					Editing entry for {entry.user.name}
				</p>
				{state.error !== "" && (
					<div className="mb-2 rounded bg-danger/10 px-2 py-1 text-xs text-danger">
						{state.error}
					</div>
				)}
				<div className="grid gap-2 sm:grid-cols-[1fr_110px_80px]">
					<select
						name="jobId"
						value={jobId}
						onChange={(e) => setJobId(e.target.value)}
						required
						className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm"
					>
						{jobs.map((j) => (
							<option key={j.id} value={j.id}>
								{j.name}
							</option>
						))}
					</select>
					<input
						type="date"
						name="workDate"
						value={workDate}
						onChange={(e) => setWorkDate(e.target.value)}
						required
						className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm"
					/>
					<input
						type="number"
						name="hours"
						value={hours}
						onChange={(e) => setHours(e.target.value)}
						step="0.25"
						min="0.25"
						max="24"
						required
						className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm tabular-nums"
					/>
				</div>
				<input
					type="text"
					name="dailyTask"
					value={dailyTask}
					onChange={(e) => setDailyTask(e.target.value)}
					required
					placeholder="What did they do?"
					className="mt-2 block w-full rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm"
				/>
				<div className="mt-2 flex justify-end gap-2">
					<button
						type="button"
						onClick={onDone}
						className="text-xs font-medium text-neutral-500 hover:text-neutral-700"
					>
						Cancel
					</button>
					<Button type="submit" variant="primary" size="sm" disabled={pending}>
						{pending ? "Saving..." : "Save"}
					</Button>
				</div>
			</form>
		</div>
	)
}

function EditTableRow({
	entry,
	jobs,
	onDone,
}: {
	entry: TimeEntryWithDetails
	jobs: Job[]
	onDone: () => void
}) {
	const [state, formAction, pending] = useActionState(updateTimeEntry, {
		error: "",
	})
	const [jobId, setJobId] = useState(entry.jobId)
	const [workDate, setWorkDate] = useState(entry.workDate)
	const [hours, setHours] = useState(String(entry.hours))
	const [dailyTask, setDailyTask] = useState(entry.dailyTask ?? "")

	useEffect(() => {
		if (state.savedAt) onDone()
	}, [state.savedAt, onDone])

	return (
		<tr>
			<td colSpan={6} className="px-6 py-3">
				<form action={formAction} className="rounded-lg border border-brand-200 bg-brand-50/40 p-3">
					<input type="hidden" name="id" value={entry.id} />
					<p className="mb-2 text-xs font-medium text-neutral-500">
						Editing entry for {entry.user.name}
					</p>
					{state.error !== "" && (
						<div className="mb-2 rounded bg-danger/10 px-2 py-1 text-xs text-danger">
							{state.error}
						</div>
					)}
					<div className="grid gap-2 sm:grid-cols-[1fr_130px_80px_1fr]">
						<select
							name="jobId"
							value={jobId}
							onChange={(e) => setJobId(e.target.value)}
							required
							className="rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm"
						>
							{jobs.map((j) => (
								<option key={j.id} value={j.id}>
									{j.name}
								</option>
							))}
						</select>
						<input
							type="date"
							name="workDate"
							value={workDate}
							onChange={(e) => setWorkDate(e.target.value)}
							required
							className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm"
						/>
						<input
							type="number"
							name="hours"
							value={hours}
							onChange={(e) => setHours(e.target.value)}
							step="0.25"
							min="0.25"
							max="24"
							required
							className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm tabular-nums"
						/>
						<input
							type="text"
							name="dailyTask"
							value={dailyTask}
							onChange={(e) => setDailyTask(e.target.value)}
							required
							placeholder="What did they do?"
							className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-sm"
						/>
					</div>
					<div className="mt-2 flex justify-end gap-2">
						<button
							type="button"
							onClick={onDone}
							className="text-xs font-medium text-neutral-500 hover:text-neutral-700"
						>
							Cancel
						</button>
						<Button type="submit" variant="primary" size="sm" disabled={pending}>
							{pending ? "Saving..." : "Save"}
						</Button>
					</div>
				</form>
			</td>
		</tr>
	)
}
