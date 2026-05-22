"use server"

import { revalidatePath } from "next/cache"
import type { UserRole } from "@/lib/types"
import { requireOrgContext } from "@/lib/db/org"
import { updateMemberRole, removeMember } from "@/lib/db/profiles"

export const updateUserRole = async (formData: FormData) => {
	try {
		const { orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin") return

		const userId = formData.get("userId") as string
		const role = formData.get("role") as string

		if (!["admin", "foreman", "worker"].includes(role)) return

		await updateMemberRole(orgContext.orgId, userId, role as UserRole)

		revalidatePath("/dashboard/team")
	} catch {
		return
	}
}

export const removeMemberAction = async (_prevState: { error?: string } | null, formData: FormData) => {
	try {
		const { userId: currentUserId, orgContext } = await requireOrgContext()
		if (orgContext.role !== "admin") return { error: "Unauthorized" }

		const userId = formData.get("userId") as string
		if (!userId) return { error: "Missing user ID" }

		if (userId === currentUserId) return { error: "Cannot remove yourself" }

		await removeMember(orgContext.orgId, userId)

		revalidatePath("/dashboard/team")
		return null
	} catch {
		return { error: "Failed to remove member" }
	}
}
