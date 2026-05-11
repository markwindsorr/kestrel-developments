"use client"

import { useState } from "react"
import { deleteTemplateAction } from "@/app/dashboard/checklists/actions"
import { Button } from "@/components/ui/button"

interface DeleteTemplateButtonProps {
	templateId: string
	templateName: string
}

export const DeleteTemplateButton = ({ templateId, templateName }: DeleteTemplateButtonProps) => {
	const [showConfirm, setShowConfirm] = useState(false)
	const [confirmation, setConfirmation] = useState("")

	const isMatch = confirmation === templateName

	if (!showConfirm) {
		return (
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={() => setShowConfirm(true)}
				className="text-neutral-400 hover:text-danger"
			>
				Delete Template
			</Button>
		)
	}

	return (
		<div className="rounded-xl border border-danger/30 bg-danger/5 p-4">
			<p className="text-sm font-semibold text-danger">Delete this template?</p>
			<p className="mt-1 text-sm text-neutral-600">
				This will permanently delete the template and all its items. Jobs that
				used this template are not affected.
			</p>
			<p className="mt-3 text-sm text-neutral-700">
				Type <strong>{templateName}</strong> to confirm:
			</p>
			<form action={deleteTemplateAction} className="mt-2">
				<input type="hidden" name="id" value={templateId} />
				<input
					name="confirmation"
					type="text"
					value={confirmation}
					onChange={(e) => setConfirmation(e.target.value)}
					className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-danger focus:outline-none focus:ring-1 focus:ring-danger"
					placeholder={templateName}
					autoComplete="off"
				/>
				<div className="mt-3 flex gap-2">
					<Button
						type="submit"
						variant="danger"
						size="sm"
						disabled={!isMatch}
					>
						Permanently Delete
					</Button>
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onClick={() => {
							setShowConfirm(false)
							setConfirmation("")
						}}
					>
						Cancel
					</Button>
				</div>
			</form>
		</div>
	)
}
