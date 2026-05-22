import { createClient } from "@/lib/supabase/server"
import type { DbProfile, OrgMember, UserRole } from "@/lib/types"

export const getCurrentProfile = async (): Promise<DbProfile> => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		if (process.env.NODE_ENV === "development") {
			return { id: "dev-user", name: "Josh Thornhill", email: "josh@kestreldevelopments.ca", avatar_url: null, created_at: new Date().toISOString() } as DbProfile
		}
		throw new Error("Not authenticated")
	}

	const { data, error } = await supabase
		.from("profiles")
		.select("*")
		.eq("id", user.id)
		.single()

	if (error) throw error
	return data as DbProfile
}

export const getOrgMembers = async (orgId: string): Promise<OrgMember[]> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("org_memberships")
		.select("role, profiles(*)")
		.eq("org_id", orgId)

	if (error) throw error

	return (data as unknown as { role: UserRole; profiles: DbProfile }[]).map((m) => ({
		id: m.profiles.id,
		name: m.profiles.name,
		email: m.profiles.email,
		avatarUrl: m.profiles.avatar_url ?? undefined,
		role: m.role,
	}))
}

export const updateMemberRole = async (
	orgId: string,
	userId: string,
	role: UserRole
) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("org_memberships")
		.update({ role })
		.eq("org_id", orgId)
		.eq("user_id", userId)

	if (error) throw error
}

export const removeMember = async (orgId: string, userId: string) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("org_memberships")
		.delete()
		.eq("org_id", orgId)
		.eq("user_id", userId)

	if (error) throw error
}
