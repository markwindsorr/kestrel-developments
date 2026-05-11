"use client"

import Image from "next/image"
import { useActionState } from "react"
import { createOrganization } from "@/app/dashboard/actions"
import { Button } from "@/components/ui/button"

export const NoOrgPage = () => {
	const [state, formAction, pending] = useActionState(createOrganization, {
		error: "",
	})

	return (
		<div className="mx-auto max-w-lg pt-12">
			<div className="mb-8 text-center">
				<Image
					src="/kestral-logo.jpeg"
					alt="Kestrel Developments"
					width={80}
					height={80}
					className="mx-auto mb-4 rounded-full"
				/>
				<h1 className="text-2xl font-bold text-neutral-900">
					Welcome to Kestrel
				</h1>
				<p className="mt-2 text-neutral-500">
					You&apos;re not part of an organization yet. Create one to get
					started, or ask your admin for an invite link.
				</p>
			</div>

			<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
				<h2 className="mb-4 text-lg font-semibold text-neutral-900">
					Create Organization
				</h2>

				<form action={formAction} className="space-y-4">
					{state.error !== "" && (
						<div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
							{state.error}
						</div>
					)}

					<div>
						<label
							htmlFor="orgName"
							className="mb-1 block text-sm font-medium text-neutral-700"
						>
							Organization Name
						</label>
						<input
							id="orgName"
							name="orgName"
							type="text"
							required
							className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
							placeholder="Kestrel Developments"
						/>
					</div>

					<Button
						type="submit"
						variant="primary"
						size="lg"
						className="w-full"
						disabled={pending}
					>
						{pending ? "Creating..." : "Create Organization"}
					</Button>
				</form>
			</div>

			<p className="mt-6 text-center text-sm text-neutral-400">
				Have an invite link? Use the link your admin shared with you to join
				their team.
			</p>
		</div>
	)
}
