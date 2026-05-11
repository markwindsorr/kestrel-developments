"use client"

import { useActionState } from "react"
import { createTemplate } from "@/app/dashboard/checklists/actions"
import { Button } from "@/components/ui/button"

export const NewTemplateForm = () => {
	const [state, formAction, pending] = useActionState(createTemplate, {
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
					Template Name
				</label>
				<input
					id="name"
					name="name"
					type="text"
					required
					className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
					placeholder="e.g. Commercial Build Checklist"
				/>
			</div>

			<div className="flex gap-3 pt-2">
				<Button type="submit" variant="primary" disabled={pending}>
					{pending ? "Creating..." : "Create Template"}
				</Button>
			</div>
		</form>
	)
}
