"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/types"
import { getProfileRole, updateProfileRole } from "@/lib/db/profiles"

export async function updateUserRole(formData: FormData) {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) return

	const currentRole = await getProfileRole(user.id)
	if (currentRole !== "admin") return

	const userId = formData.get("userId") as string
	const role = formData.get("role") as string

	if (!["admin", "foreman", "worker"].includes(role)) return

	await updateProfileRole(userId, role as UserRole)

	revalidatePath("/dashboard/team")
}
