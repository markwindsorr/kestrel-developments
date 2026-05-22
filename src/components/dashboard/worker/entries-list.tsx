"use client"

import { useActionState, useEffect, useState } from "react"

import type { Job } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
	deleteTimeEntry,
	updateTimeEntry,
} from "@/app/dashboard/time-tracking/actions"

interface Entry {
	id: string
	jobId: string
	workDate: string
	hours: number
	dailyTask: string | null
}

interface EntriesListProps {
	entries: Entry[]
	jobs: Job[]
}

const fmtDate = (iso: string) =>
	new Date(iso + "T00:00:00").toLocaleDateString("en-CA", {
		weekday: "short",
		month: "short",
		day: "numeric",
	})

export function EntriesList({ entries, jobs }: EntriesListProps) {
	if (entries.length === 0) {
		return (
			<div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
				<h2 className="mb-2 text-base font-semibold text-neutral-900">
					Recent hours
				</h2>
				<p className="text-sm text-neutral-400">
					No hours logged yet. Use the form to log your first day.
				</p>
			</div>
		)
	}

	const grouped = new Map<string, Entry[]>()
	for (const e of entries) {
		const arr = grouped.get(e.workDate) ?? []
		arr.push(e)
		grouped.set(e.workDate, arr)
	}
	const dates = Array.from(grouped.keys()).sort((a, b) => (a < b ? 1 : -1))

	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
			<h2 className="mb-3 text-base font-semibold text-neutral-900">
				Recent hours
			</h2>
			<div className="space-y-4">
				{dates.map((date) => {
					const rows = grouped.get(date)!
					const dayTotal = rows.reduce((s, r) => s + r.hours, 0)
					return (
						<div key={date}>
							<div className="mb-1.5 flex items-baseline justify-between border-b border-neutral-100 pb-1">
								<p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
									{fmtDate(date)}
								</p>
								<p className="text-xs font-medium text-neutral-600 tabular-nums">
									{dayTotal.toFixed(1)}h
								</p>
							</div>
							<ul className="space-y-1.5">
								{rows.map((row) => (
									<EntryRow key={row.id} entry={row} jobs={jobs} />
								))}
							</ul>
						</div>
					)
				})}
			</div>
		</div>
	)
}

function EntryRow({ entry, jobs }: { entry: Entry; jobs: Job[] }) {
	const [isEditing, setIsEditing] = useState(false)
	const job = jobs.find((j) => j.id === entry.jobId)

	if (isEditing) {
		return (
			<li>
				<EditForm
					entry={entry}
					jobs={jobs}
					onDone={() => setIsEditing(false)}
				/>
			</li>
		)
	}

	return (
		<li className="group flex items-center gap-3 rounded-lg border border-neutral-100 px-3 py-2 hover:bg-neutral-50">
			<span
				className="h-2.5 w-2.5 shrink-0 rounded-full"
				style={{ backgroundColor: job?.color ?? "#888" }}
			/>
			<div className="min-w-0 flex-1">
				<p className="text-sm font-medium text-neutral-900 truncate">
					{job?.name ?? "Unknown job"}
				</p>
				{entry.dailyTask && (
					<p className="text-xs text-neutral-500 truncate">{entry.dailyTask}</p>
				)}
			</div>
			<span className="text-sm font-semibold text-neutral-700 tabular-nums">
				{entry.hours.toFixed(1)}h
			</span>
			<div className="flex items-center opacity-0 transition-opacity group-hover:opacity-100">
				<button
					type="button"
					onClick={() => setIsEditing(true)}
					className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
					aria-label="Edit entry"
				>
					<svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
						<path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
					</svg>
				</button>
				<form action={deleteTimeEntry}>
					<input type="hidden" name="id" value={entry.id} />
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
		</li>
	)
}

function EditForm({
	entry,
	jobs,
	onDone,
}: {
	entry: Entry
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

	// Close the edit form only after a confirmed successful save.
	useEffect(() => {
		if (state.savedAt) onDone()
	}, [state.savedAt, onDone])

	return (
		<form
			action={formAction}
			className="rounded-lg border border-brand-200 bg-brand-50/40 p-3"
		>
			<input type="hidden" name="id" value={entry.id} />
			{state.error !== "" && (
				<div className="mb-2 rounded bg-danger/10 px-2 py-1 text-xs text-danger">
					{state.error}
				</div>
			)}
			<div className="grid gap-2 sm:grid-cols-[1fr_110px_110px]">
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
				placeholder="What did you do?"
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
	)
}
