"use client"

import { useActionState } from "react"
import { createJob } from "@/app/dashboard/jobs/actions"
import { Button } from "@/components/ui/button"

export function JobForm() {
	const [state, formAction, pending] = useActionState(createJob, {
		error: "",
	})

	return (
		<form action={formAction} className="space-y-5">
			{state.error !== "" && (
				<div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
					{state.error}
				</div>
			)}

			<div>
				<label
					htmlFor="name"
					className="mb-1 block text-sm font-medium text-neutral-700"
				>
					Job Name
				</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
					placeholder="e.g. 123 Oak Street Build"
				/>
			</div>

			<div>
				<label
					htmlFor="address"
					className="mb-1 block text-sm font-medium text-neutral-700"
				>
					Address
				</label>
				<input
					id="address"
					name="address"
					type="text"
					required
					className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
					placeholder="123 Oak Street, Lot 14"
				/>
			</div>

			<div>
				<label
					htmlFor="clientName"
					className="mb-1 block text-sm font-medium text-neutral-700"
				>
					Client Name
				</label>
				<input
					id="clientName"
					name="clientName"
					type="text"
					required
					className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
					placeholder="Client or investor name"
				/>
			</div>

			<div className="grid grid-cols-2 gap-4">
				<div>
					<label
						htmlFor="status"
						className="mb-1 block text-sm font-medium text-neutral-700"
					>
						Status
					</label>
					<select
						id="status"
						name="status"
						defaultValue="active"
						className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
					>
						<option value="active">Active</option>
						<option value="on-hold">On Hold</option>
						<option value="completed">Completed</option>
					</select>
				</div>

				<div>
					<label
						htmlFor="color"
						className="mb-1 block text-sm font-medium text-neutral-700"
					>
						Color
					</label>
					<input
						id="color"
						name="color"
						type="color"
						defaultValue="#2563eb"
						className="h-[38px] w-full cursor-pointer rounded-lg border border-neutral-300 px-1 py-1"
					/>
				</div>
			</div>

			<div className="flex gap-3 pt-2">
				<Button type="submit" variant="primary" disabled={pending}>
					{pending ? "Creating..." : "Create Job"}
				</Button>
			</div>
		</form>
	)
}
