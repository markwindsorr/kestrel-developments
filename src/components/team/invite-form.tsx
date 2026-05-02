"use client"

import { useActionState } from "react"
import { createInviteAction } from "@/app/dashboard/team/invites/actions"
import { Button } from "@/components/ui/button"
import { CopyLinkButton } from "@/components/team/copy-link-button"

export const InviteForm = () => {
	const [state, formAction, pending] = useActionState(createInviteAction, {
		error: "",
		token: "",
	})

	return (
		<div className="space-y-4">
			<form action={formAction} className="flex flex-wrap items-end gap-3">
				<div>
					<label
						htmlFor="role"
						className="mb-1 block text-sm font-medium text-neutral-700"
					>
						Role
					</label>
					<select
						id="role"
						name="role"
						defaultValue="worker"
						className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
					>
						<option value="worker">Worker</option>
						<option value="foreman">Foreman</option>
						<option value="admin">Admin</option>
					</select>
				</div>

				<div className="flex-1">
					<label
						htmlFor="email"
						className="mb-1 block text-sm font-medium text-neutral-700"
					>
						Email <span className="text-neutral-400">(optional)</span>
					</label>
					<input
						id="email"
						name="email"
						type="email"
						placeholder="Lock to specific email"
						className="w-full min-w-48 rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
					/>
				</div>

				<Button type="submit" variant="primary" size="md" disabled={pending}>
					{pending ? "Creating..." : "Create Invite"}
				</Button>
			</form>

			{state.error && (
				<div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
					{state.error}
				</div>
			)}

			{state.token && (
				<div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
					<p className="flex-1 text-sm text-green-800">
						Invite created! Share this link:
					</p>
					<CopyLinkButton token={state.token} />
				</div>
			)}
		</div>
	)
}
