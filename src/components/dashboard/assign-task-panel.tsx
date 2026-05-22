"use client"

import { useActionState, useRef } from "react"

import type { OrgMember } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { assignTodo } from "@/app/dashboard/todos/actions"

interface AssignTaskPanelProps {
	workers: OrgMember[]
	jobs: { id: string; name: string }[]
}

export const AssignTaskPanel = ({ workers, jobs }: AssignTaskPanelProps) => {
	const [state, formAction, pending] = useActionState(assignTodo, { error: "" })
	const formRef = useRef<HTMLFormElement>(null)

	return (
		<div className="relative z-10 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
			<h2 className="mb-3 text-base font-semibold text-neutral-900">
				Assign Task
			</h2>

			<form
				ref={formRef}
				action={(formData) => {
					formAction(formData)
					formRef.current?.reset()
				}}
				className="space-y-3"
			>
				<div className="grid gap-3 sm:grid-cols-2">
					<select
						name="assigneeId"
						required
						className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
					>
						<option value="">Select worker...</option>
						{workers.map((w) => (
							<option key={w.id} value={w.id}>
								{w.name}
							</option>
						))}
					</select>

					<select
						name="jobId"
						className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
					>
						<option value="">No job (general)</option>
						{jobs.map((j) => (
							<option key={j.id} value={j.id}>
								{j.name}
							</option>
						))}
					</select>
				</div>

				<div className="flex gap-2">
					<input
						name="label"
						type="text"
						required
						placeholder="Task description..."
						className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
					/>
					<input
						name="dueDate"
						type="date"
						className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
					/>
					<Button type="submit" variant="primary" size="md" disabled={pending}>
						Assign
					</Button>
				</div>
			</form>

			{state.error !== "" && (
				<div className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
					{state.error}
				</div>
			)}
		</div>
	)
}
