"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { createInvite, deleteInvite } from "@/lib/db/invites"
import { getProfileRole } from "@/lib/db/profiles"
import type { UserRole } from "@/lib/types"

export const createInviteAction = async (
	_prevState: { error: string; token: string },
	formData: FormData
) => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) return { error: "Not authenticated", token: "" }

	const currentRole = await getProfileRole(user.id)
	if (currentRole !== "admin" && currentRole !== "foreman") {
		return { error: "Unauthorized", token: "" }
	}

	const role = formData.get("role") as string
	const email = (formData.get("email") as string)?.trim() || null

	if (!["admin", "foreman", "worker"].includes(role)) {
		return { error: "Invalid role", token: "" }
	}

	try {
		const invite = await createInvite({
			role: role as UserRole,
			email,
			invitedBy: user.id,
		})

		revalidatePath("/dashboard/team/invites")
		return { error: "", token: invite.token }
	} catch {
		return { error: "Failed to create invite", token: "" }
	}
}

export const revokeInviteAction = async (formData: FormData) => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) return

	const currentRole = await getProfileRole(user.id)
	if (currentRole !== "admin" && currentRole !== "foreman") return

	const inviteId = formData.get("inviteId") as string
	if (!inviteId) return

	await deleteInvite(inviteId)
	revalidatePath("/dashboard/team/invites")
}
