import Link from "next/link"
import { redirect } from "next/navigation"
import { getCurrentProfile } from "@/lib/db/profiles"
import { getAllInvites } from "@/lib/db/invites"
import { InviteForm } from "@/components/team/invite-form"
import { InviteTable } from "@/components/team/invite-table"

export default async function InvitesPage() {
	const profile = await getCurrentProfile()

	if (profile.role !== "admin" && profile.role !== "foreman") {
		redirect("/dashboard")
	}

	const invites = await getAllInvites()

	return (
		<div>
			<div className="mb-8">
				<Link
					href="/dashboard/team"
					className="mb-4 inline-flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700"
				>
					<svg
						className="h-4 w-4"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
						strokeWidth={1.5}
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							d="M15.75 19.5L8.25 12l7.5-7.5"
						/>
					</svg>
					Back to Team
				</Link>
				<h1 className="text-2xl font-bold text-neutral-900">
					Invite Team Members
				</h1>
				<p className="mt-1 text-neutral-500">
					Create invite links to share with new team members. Each link can only
					be used once.
				</p>
			</div>

			<div className="mb-8 rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
				<h2 className="mb-4 text-lg font-semibold text-neutral-900">
					New Invite
				</h2>
				<InviteForm />
			</div>

			<div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
				<div className="border-b border-neutral-100 px-6 py-4">
					<h2 className="text-lg font-semibold text-neutral-900">
						All Invites
					</h2>
				</div>
				<InviteTable invites={invites} />
			</div>
		</div>
	)
}
