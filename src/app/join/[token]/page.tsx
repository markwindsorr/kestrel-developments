import { validateInviteToken } from "@/lib/db/invites"
import { Badge } from "@/components/ui/badge"
import { JoinForm } from "@/components/auth/join-form"

export default async function JoinPage({
	params,
}: {
	params: Promise<{ token: string }>
}) {
	const { token } = await params
	const invite = await validateInviteToken(token)

	if (!invite) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
				<div className="w-full max-w-md text-center">
					<div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
						<svg
							className="h-8 w-8 text-danger"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							strokeWidth={1.5}
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
							/>
						</svg>
					</div>
					<h1 className="text-xl font-bold text-neutral-900">
						Invalid Invite
					</h1>
					<p className="mt-2 text-neutral-500">
						This invite link is invalid, has expired, or has already been used.
						Ask your admin for a new one.
					</p>
				</div>
			</div>
		)
	}

	const roleBadgeVariant =
		invite.role === "admin"
			? "danger"
			: invite.role === "foreman"
				? "info"
				: "default"

	return (
		<div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
			<div className="w-full max-w-md">
				<div className="mb-8 text-center">
					<h1 className="text-2xl font-bold text-neutral-900">
						Join Kestral Developments
					</h1>
					<p className="mt-2 text-neutral-500">
						You&apos;ve been invited to join as{" "}
						<Badge variant={roleBadgeVariant}>{invite.role}</Badge>
					</p>
				</div>

				<div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
					<JoinForm
						token={token}
						role={invite.role}
						constrainedEmail={invite.email}
					/>
				</div>
			</div>
		</div>
	)
}
