"use client"

import { useActionState, useState } from "react"
import { removeMemberAction } from "@/app/dashboard/team/actions"

interface RemoveMemberButtonProps {
	userId: string
	memberName: string
}

export const RemoveMemberButton = ({ userId, memberName }: RemoveMemberButtonProps) => {
	const [showConfirm, setShowConfirm] = useState(false)
	const [state, formAction, pending] = useActionState(removeMemberAction, null)

	if (!showConfirm) {
		return (
			<button
				type="button"
				onClick={() => setShowConfirm(true)}
				className="rounded-lg px-2 py-1 text-sm text-neutral-400 transition-colors hover:text-danger"
			>
				Remove
			</button>
		)
	}

	return (
		<div className="flex items-center gap-2">
			<form action={formAction}>
				<input type="hidden" name="userId" value={userId} />
				<button
					type="submit"
					disabled={pending}
					className="rounded-lg bg-danger px-2.5 py-1 text-sm font-medium text-white transition-colors hover:bg-danger/90 disabled:opacity-50"
				>
					{pending ? "Removing…" : `Remove ${memberName.split(" ")[0]}`}
				</button>
			</form>
			<button
				type="button"
				onClick={() => setShowConfirm(false)}
				className="rounded-lg px-2 py-1 text-sm text-neutral-500 transition-colors hover:text-neutral-700"
			>
				Cancel
			</button>
			{state?.error && (
				<span className="text-xs text-danger">{state.error}</span>
			)}
		</div>
	)
}