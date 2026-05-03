"use server"

import { revalidatePath } from "next/cache"
import { createInvite, deleteInvite } from "@/lib/db/invites"
import { requireOrgContext } from "@/lib/db/org"
import type { UserRole } from "@/lib/types"

export const createInviteAction = async (
	_prevState: { error: string; token: string },
	formData: FormData
) => {
	try {
		const { userId, orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") {
			return { error: "Unauthorized", token: "" }
		}

		const role = formData.get("role") as string
		const email = (formData.get("email") as string)?.trim() || null

		if (!["admin", "foreman", "worker"].includes(role)) {
			return { error: "Invalid role", token: "" }
		}

		const invite = await createInvite({
			role: role as UserRole,
			email,
			invitedBy: userId,
			org_id: orgContext.orgId,
		})

		revalidatePath("/dashboard/team/invites")
		return { error: "", token: invite.token }
	} catch (e) {
		return { error: (e as Error).message, token: "" }
	}
}

export const revokeInviteAction = async (formData: FormData) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin" && orgContext.role !== "foreman") return

		const inviteId = formData.get("inviteId") as string
		if (!inviteId) return

		await deleteInvite(inviteId)
		revalidatePath("/dashboard/team/invites")
	} catch {
		return
	}
}
