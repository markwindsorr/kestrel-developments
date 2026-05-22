import Link from "next/link"
import { redirect } from "next/navigation"

import { getCurrentProfile, getOrgMembers } from "@/lib/db/profiles"
import { getOrgContext } from "@/lib/db/org"
import { Badge } from "@/components/ui/badge"
import { RoleSelector } from "@/components/team/role-selector"
import { RemoveMemberButton } from "@/components/team/remove-member-button"

const TeamPage = async () => {
	const orgContext = await getOrgContext()
	if (!orgContext) redirect("/dashboard")
	if (orgContext.role !== "admin") redirect("/dashboard")

	const profile = await getCurrentProfile()
	const members = await getOrgMembers(orgContext.orgId)

	return (
		<div>
			<div className="mb-8 flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-neutral-900">Team</h1>
					<p className="mt-1 text-neutral-500">
						Manage team members and assign roles.
					</p>
				</div>
				<Link
					href="/dashboard/team/invites"
					className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-700"
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
							d="M18 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM3 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 019.374 21c-2.331 0-4.512-.645-6.374-1.766z"
						/>
					</svg>
					Invite Members
				</Link>
			</div>

			<div className="rounded-xl border border-neutral-200 bg-white shadow-sm">
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="border-b border-neutral-100 text-left text-xs font-medium uppercase tracking-wider text-neutral-500">
								<th className="px-6 py-3">Name</th>
								<th className="px-6 py-3">Email</th>
								<th className="px-6 py-3">Role</th>
								<th className="px-6 py-3"></th>
							</tr>
						</thead>
						<tbody className="divide-y divide-neutral-100">
							{members.map((member) => (
								<tr key={member.id} className="hover:bg-neutral-50">
									<td className="px-6 py-4">
										<div className="flex items-center gap-3">
											<div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-medium text-white">
												{member.name
													.split(" ")
													.map((n) => n[0])
													.join("")}
											</div>
											<span className="text-sm font-medium text-neutral-900">
												{member.name}
											</span>
										</div>
									</td>
									<td className="px-6 py-4 text-sm text-neutral-600">
										{member.email}
									</td>
									<td className="px-6 py-4">
										{member.id === profile.id ? (
											<Badge variant="info">admin (you)</Badge>
										) : (
											<RoleSelector
												userId={member.id}
												currentRole={member.role}
											/>
										)}
									</td>
									<td className="px-6 py-4">
										{member.id !== profile.id && (
											<RemoveMemberButton
												userId={member.id}
												memberName={member.name}
											/>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	)
}

export default TeamPage
