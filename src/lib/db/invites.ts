import { createClient } from "@/lib/supabase/server"
import type { DbInvite, UserRole } from "@/lib/types"

export const createInvite = async (fields: {
	role: UserRole
	email: string | null
	invitedBy: string
	org_id: string
}): Promise<DbInvite> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("invites")
		.insert({
			role: fields.role,
			email: fields.email || null,
			invited_by: fields.invitedBy,
			org_id: fields.org_id,
		})
		.select()
		.single()

	if (error) throw error
	return data as DbInvite
}

export const getOrgInvites = async (orgId: string): Promise<DbInvite[]> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("invites")
		.select("*")
		.eq("org_id", orgId)
		.order("created_at", { ascending: false })

	if (error) throw error
	return data as DbInvite[]
}

export const deleteInvite = async (id: string): Promise<void> => {
	const supabase = await createClient()
	const { error } = await supabase.from("invites").delete().eq("id", id)

	if (error) throw error
}

export const validateInviteToken = async (
	token: string
): Promise<{ id: string; role: UserRole; email: string | null; expires_at: string; org_id: string } | null> => {
	const supabase = await createClient()
	const { data, error } = await supabase.rpc("validate_invite_token", {
		invite_token: token,
	})

	if (error) throw error
	if (!data || data.length === 0) return null
	return data[0]
}

export const redeemInvite = async (
	token: string,
	userId: string
): Promise<void> => {
	const supabase = await createClient()
	const { error } = await supabase.rpc("redeem_invite", {
		invite_token: token,
		redeemer_id: userId,
	})

	if (error) throw error
}
