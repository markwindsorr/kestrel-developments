"use client"

import { useTransition } from "react"
import { completeTaskAction } from "@/app/dashboard/actions"

interface Task {
	id: string
	label: string
	jobName: string
	jobColor: string
}

export function TodayTasks({ tasks }: { tasks: Task[] }) {
	return (
		<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
			<div className="px-5 py-4 border-b border-neutral-200">
				<h2 className="font-semibold text-neutral-900">Open Tasks</h2>
				<p className="text-xs text-neutral-500 mt-0.5">Pending checklist items across active jobs</p>
			</div>
			{tasks.length === 0 ? (
				<div className="px-5 py-8 text-center">
					<p className="text-sm font-medium text-green-700">All caught up</p>
					<p className="text-xs text-neutral-400 mt-1">No open checklist items</p>
				</div>
			) : (
				<ul className="divide-y divide-neutral-100">
					{tasks.map(task => (
						<TaskRow key={task.id} task={task} />
					))}
				</ul>
			)}
		</div>
	)
}

function TaskRow({ task }: { task: Task }) {
	const [pending, startTransition] = useTransition()

	const complete = () => {
		startTransition(async () => {
			await completeTaskAction(task.id)
		})
	}

	return (
		<li className={`flex items-start gap-3 px-5 py-3 transition-opacity ${pending ? "opacity-40" : ""}`}>
			<button
				onClick={complete}
				disabled={pending}
				className="mt-0.5 h-4 w-4 shrink-0 rounded border border-neutral-300 hover:border-brand-500 hover:bg-brand-50 transition-colors flex items-center justify-center"
				title="Mark complete"
			/>
			<div className="min-w-0 flex-1">
				<p className="text-sm text-neutral-800 leading-snug">{task.label}</p>
				<div className="flex items-center gap-1.5 mt-0.5">
					<div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: task.jobColor }} />
					<p className="text-xs text-neutral-400 truncate">{task.jobName}</p>
				</div>
			</div>
		</li>
	)
}
