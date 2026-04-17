"use client"

import type { Job } from "@/lib/types"

interface JobSelectorProps {
	jobs: Job[]
	selectedJobId: string
	onSelect: (id: string) => void
	disabled?: boolean
}

export function JobSelector({ jobs, selectedJobId, onSelect, disabled }: JobSelectorProps) {
	return (
		<div>
			<label htmlFor="job-select" className="mb-1.5 block text-sm font-medium text-neutral-700">
				Select Job
			</label>
			<select
				id="job-select"
				value={selectedJobId}
				onChange={e => onSelect(e.target.value)}
				disabled={disabled}
				className="block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400"
			>
				<option value="">-- Choose a job --</option>
				{jobs.map(job => (
					<option key={job.id} value={job.id}>
						{job.name} — {job.address}
					</option>
				))}
			</select>
		</div>
	)
}
