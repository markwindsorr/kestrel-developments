import { createClient } from "@/lib/supabase/server"
import type { UserRole } from "@/lib/types"

export interface OrgContext {
	orgId: string
	role: UserRole
}

export interface AuthedOrgContext {
	userId: string
	orgContext: OrgContext
}

export const getOrgContext = async (): Promise<OrgContext | null> => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	if (!user) return null

	const { data, error } = await supabase
		.from("org_memberships")
		.select("org_id, role")
		.eq("user_id", user.id)
		.single()

	if (error || !data) return null
	return { orgId: data.org_id, role: data.role as UserRole }
}

export const requireAuth = async (): Promise<string> => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) throw new Error("Not authenticated")
	return user.id
}

export const requireOrgContext = async (): Promise<AuthedOrgContext> => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) throw new Error("Not authenticated")

	const { data, error } = await supabase
		.from("org_memberships")
		.select("org_id, role")
		.eq("user_id", user.id)
		.single()

	if (error || !data) throw new Error("Not part of an organization")

	return {
		userId: user.id,
		orgContext: { orgId: data.org_id, role: data.role as UserRole },
	}
}

export const hasOrgMembership = async (userId: string): Promise<boolean> => {
	const supabase = await createClient()
	const { data } = await supabase
		.from("org_memberships")
		.select("id")
		.eq("user_id", userId)
		.single()

	return !!data
}

export const createOrgForAdmin = async (
	orgName: string,
	adminUserId: string
): Promise<void> => {
	const supabase = await createClient()
	const { error } = await supabase.rpc("create_org_for_admin", {
		org_name: orgName,
		admin_user_id: adminUserId,
	})

	if (error) throw error
}
