"use client"

import { useActionState, useRef } from "react"

import type { TodoItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
	addTodo,
	toggleTodo,
	deleteTodo,
} from "@/app/dashboard/todos/actions"

interface MyTodosPanelProps {
	todos: TodoItem[]
}

export function MyTodosPanel({ todos }: MyTodosPanelProps) {
	const [state, formAction, pending] = useActionState(addTodo, { error: "" })
	const formRef = useRef<HTMLFormElement>(null)

	const open = todos.filter((t) => !t.isCompleted)
	const done = todos.filter((t) => t.isCompleted)

	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
			<div className="mb-3 flex items-baseline justify-between">
				<h2 className="text-base font-semibold text-neutral-900">My tasks</h2>
				<p className="text-xs text-neutral-400">
					{open.length} open
					{done.length > 0 && ` · ${done.length} done`}
				</p>
			</div>

			<form
				ref={formRef}
				action={async (formData) => {
					await formAction(formData)
					formRef.current?.reset()
				}}
				className="mb-4 flex gap-2"
			>
				<input
					name="label"
					type="text"
					required
					placeholder="Add a task for yourself..."
					className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
				/>
				<Button type="submit" variant="primary" size="md" disabled={pending}>
					Add
				</Button>
			</form>

			{state.error !== "" && (
				<div className="mb-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
					{state.error}
				</div>
			)}

			{todos.length === 0 ? (
				<p className="py-4 text-center text-sm text-neutral-400">
					No tasks yet. Add one above to get started.
				</p>
			) : (
				<ul className="space-y-1.5">
					{[...open, ...done].map((todo) => (
						<TodoRow key={todo.id} todo={todo} />
					))}
				</ul>
			)}
		</div>
	)
}

function TodoRow({ todo }: { todo: TodoItem }) {
	return (
		<li className="group flex items-center gap-3 rounded-lg border border-neutral-100 px-3 py-2 hover:bg-neutral-50">
			<form action={toggleTodo}>
				<input type="hidden" name="id" value={todo.id} />
				<input
					type="hidden"
					name="isCompleted"
					value={String(!todo.isCompleted)}
				/>
				<button
					type="submit"
					aria-label={todo.isCompleted ? "Mark incomplete" : "Mark complete"}
					className={`h-5 w-5 shrink-0 rounded border ${
						todo.isCompleted
							? "border-brand-600 bg-brand-600 text-white"
							: "border-neutral-300 hover:border-brand-500"
					} flex items-center justify-center`}
				>
					{todo.isCompleted && (
						<svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
							<path
								fillRule="evenodd"
								d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42L8.5 12.08l6.79-6.79a1 1 0 011.42 0z"
								clipRule="evenodd"
							/>
						</svg>
					)}
				</button>
			</form>

			<div className="min-w-0 flex-1">
				<p
					className={`text-sm ${
						todo.isCompleted
							? "text-neutral-400 line-through"
							: "text-neutral-800"
					}`}
				>
					{todo.label}
				</p>
				<div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs">
					<span
						className={`rounded-full px-1.5 py-0.5 font-medium ${
							todo.source === "self"
								? "bg-neutral-100 text-neutral-500"
								: "bg-brand-50 text-brand-700"
						}`}
					>
						{todo.source === "self"
							? "Personal"
							: `From ${todo.createdByName}`}
					</span>
					{todo.jobName && (
						<span className="rounded-full bg-blue-50 px-1.5 py-0.5 font-medium text-blue-700">
							{todo.jobName}
						</span>
					)}
					{todo.dueDate && (
						<span className="text-neutral-400">
							Due {new Date(todo.dueDate + "T00:00:00").toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
						</span>
					)}
				</div>
			</div>

			<form action={deleteTodo}>
				<input type="hidden" name="id" value={todo.id} />
				<button
					type="submit"
					aria-label="Delete task"
					className="rounded p-1 text-neutral-300 opacity-0 hover:bg-neutral-100 hover:text-neutral-600 group-hover:opacity-100"
				>
					<svg
						viewBox="0 0 20 20"
						fill="currentColor"
						className="h-4 w-4"
					>
						<path
							fillRule="evenodd"
							d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 100 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
							clipRule="evenodd"
						/>
					</svg>
				</button>
			</form>
		</li>
	)
}
