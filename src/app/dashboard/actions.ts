"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { requireAuth, hasOrgMembership, createOrgForAdmin } from "@/lib/db/org"

export const createOrganization = async (
	_prevState: { error: string },
	formData: FormData
) => {
	let userId: string
	try {
		userId = await requireAuth()
	} catch {
		return { error: "Not authenticated" }
	}

	const name = (formData.get("orgName") as string)?.trim()
	if (!name) return { error: "Organization name is required" }

	if (await hasOrgMembership(userId)) {
		return { error: "You are already part of an organization" }
	}

	try {
		await createOrgForAdmin(name, userId)
	} catch (e) {
		return { error: (e as Error).message }
	}

	revalidatePath("/dashboard")
	redirect("/dashboard")
}
