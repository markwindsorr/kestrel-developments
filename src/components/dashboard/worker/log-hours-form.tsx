"use client"

import { useActionState, useEffect, useRef, useState } from "react"

import type { Job } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { logHours } from "@/app/dashboard/time-tracking/actions"

interface LogHoursFormProps {
	jobs: Job[]
	defaultDate: string
}

interface Row {
	id: string
	jobId: string
	hours: string
	dailyTask: string
}

const newRow = (): Row => ({
	id: Math.random().toString(36).slice(2),
	jobId: "",
	hours: "",
	dailyTask: "",
})

export function LogHoursForm({ jobs, defaultDate }: LogHoursFormProps) {
	const [workDate, setWorkDate] = useState(defaultDate)
	const [rows, setRows] = useState<Row[]>([newRow()])
	const [state, formAction, pending] = useActionState(logHours, { error: "" })
	const lastSavedRef = useRef<string | undefined>(undefined)

	useEffect(() => {
		// Reset the form whenever a new successful save happens (unique savedAt).
		if (state.savedAt && state.savedAt !== lastSavedRef.current) {
			lastSavedRef.current = state.savedAt
			setRows([newRow()])
		}
	}, [state.savedAt])

	const totalHours = rows.reduce((sum, r) => {
		const h = parseFloat(r.hours)
		return sum + (Number.isFinite(h) && h > 0 ? h : 0)
	}, 0)

	const updateRow = (id: string, patch: Partial<Row>) => {
		setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))
	}

	const removeRow = (id: string) => {
		setRows((rs) => (rs.length === 1 ? rs : rs.filter((r) => r.id !== id)))
	}

	const addRow = () => setRows((rs) => [...rs, newRow()])

	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
			<div className="mb-4 flex items-baseline justify-between">
				<h2 className="text-base font-semibold text-neutral-900">Log hours</h2>
				<p className="text-xs text-neutral-400 tabular-nums">
					{totalHours > 0 ? `${totalHours.toFixed(1)}h total` : ""}
				</p>
			</div>

			{state.error !== "" && (
				<div className="mb-4 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
					{state.error}
				</div>
			)}

			{state.error === "" && state.savedAt && (
				<div className="mb-4 rounded-lg bg-green-50 px-3 py-2 text-sm font-medium text-green-700">
					Logged {state.savedCount} entr{state.savedCount === 1 ? "y" : "ies"} ·{" "}
					{state.savedHours}h saved.
				</div>
			)}

			<form action={formAction} className="space-y-4">
				<div>
					<label
						htmlFor="log-hours-date"
						className="mb-1 block text-sm font-medium text-neutral-700"
					>
						Date
					</label>
					<input
						id="log-hours-date"
						name="workDate"
						type="date"
						required
						value={workDate}
						onChange={(e) => setWorkDate(e.target.value)}
						max={defaultDate}
						className="block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
					/>
				</div>

				<div className="space-y-3">
					{rows.map((row, idx) => (
						<div
							key={row.id}
							className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-3"
						>
							<div className="mb-2 flex items-center justify-between">
								<p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
									Job {idx + 1}
								</p>
								{rows.length > 1 && (
									<button
										type="button"
										onClick={() => removeRow(row.id)}
										className="text-xs font-medium text-neutral-400 hover:text-danger"
									>
										Remove
									</button>
								)}
							</div>

							<div className="grid gap-2 sm:grid-cols-[1fr_90px]">
								<select
									name={`row[${idx}][jobId]`}
									required
									value={row.jobId}
									onChange={(e) => updateRow(row.id, { jobId: e.target.value })}
									className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
								>
									<option value="">— Choose a job —</option>
									{jobs.map((j) => (
										<option key={j.id} value={j.id}>
											{j.name}
										</option>
									))}
								</select>
								<input
									name={`row[${idx}][hours]`}
									type="number"
									step="0.25"
									min="0.25"
									max="24"
									required
									value={row.hours}
									onChange={(e) => updateRow(row.id, { hours: e.target.value })}
									placeholder="Hours"
									className="block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
								/>
							</div>

							<input
								name={`row[${idx}][dailyTask]`}
								type="text"
								required
								value={row.dailyTask}
								onChange={(e) => updateRow(row.id, { dailyTask: e.target.value })}
								placeholder="What did you do? e.g. Framing east wall"
								className="mt-2 block w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
							/>
						</div>
					))}
				</div>

				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={addRow}
						className="text-sm font-medium text-brand-600 hover:underline"
					>
						+ Add another job
					</button>
					<div className="ml-auto">
						<Button type="submit" variant="primary" disabled={pending}>
							{pending ? "Saving..." : "Log hours"}
						</Button>
					</div>
				</div>
			</form>
		</div>
	)
}
