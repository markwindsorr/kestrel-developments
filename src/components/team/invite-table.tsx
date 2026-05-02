import { revokeInviteAction } from "@/app/dashboard/team/invites/actions"
import { Badge } from "@/components/ui/badge"
import { CopyLinkButton } from "@/components/team/copy-link-button"
import type { DbInvite, InviteStatus } from "@/lib/types"

const getInviteStatus = (invite: DbInvite): InviteStatus => {
	if (invite.used_by) return "used"
	if (new Date(invite.expires_at) < new Date()) return "expired"
	return "pending"
}

const statusBadge = (status: InviteStatus) => {
	switch (status) {
		case "pending":
			return <Badge variant="info">Pending</Badge>
		case "used":
			return <Badge variant="success">Used</Badge>
		case "expired":
			return <Badge variant="warning">Expired</Badge>
	}
}

const roleBadge = (role: string) => {
	switch (role) {
		case "admin":
			return <Badge variant="danger">{role}</Badge>
		case "foreman":
			return <Badge variant="info">{role}</Badge>
		default:
			return <Badge>{role}</Badge>
	}
}

interface InviteTableProps {
	invites: DbInvite[]
}

export const InviteTable = ({ invites }: InviteTableProps) => {
	if (invites.length === 0) {
		return (
			<p className="py-8 text-center text-sm text-neutral-400">
				No invites yet. Create one above.
			</p>
		)
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full">
				<thead>
					<tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
						<th className="px-6 py-3">Role</th>
						<th className="px-6 py-3">Email</th>
						<th className="px-6 py-3">Status</th>
						<th className="px-6 py-3">Created</th>
						<th className="px-6 py-3">Actions</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-neutral-100">
					{invites.map((invite) => {
						const status = getInviteStatus(invite)
						return (
							<tr key={invite.id} className="hover:bg-neutral-50">
								<td className="px-6 py-4">{roleBadge(invite.role)}</td>
								<td className="px-6 py-4 text-sm text-neutral-600">
									{invite.email || (
										<span className="text-neutral-400">Anyone</span>
									)}
								</td>
								<td className="px-6 py-4">{statusBadge(status)}</td>
								<td className="px-6 py-4 text-sm text-neutral-400">
									{new Date(invite.created_at).toLocaleDateString()}
								</td>
								<td className="px-6 py-4">
									{status === "pending" ? (
										<div className="flex items-center gap-2">
											<CopyLinkButton token={invite.token} />
											<form action={revokeInviteAction}>
												<input
													type="hidden"
													name="inviteId"
													value={invite.id}
												/>
												<button
													type="submit"
													className="rounded-lg px-2 py-1 text-sm text-danger hover:bg-red-50"
												>
													Revoke
												</button>
											</form>
										</div>
									) : (
										<span className="text-sm text-neutral-400">—</span>
									)}
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
