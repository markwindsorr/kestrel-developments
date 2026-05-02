import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { redeemInvite, validateInviteToken } from "@/lib/db/invites"
import { updateProfileRole } from "@/lib/db/profiles"
import type { UserRole } from "@/lib/types"

export async function GET(request: Request) {
	const { searchParams, origin } = new URL(request.url)
	const code = searchParams.get("code")
	const inviteToken = searchParams.get("invite_token")

	if (code) {
		const supabase = await createClient()
		const { data } = await supabase.auth.exchangeCodeForSession(code)

		if (inviteToken && data.user) {
			const invite = await validateInviteToken(inviteToken)
			if (invite) {
				await updateProfileRole(data.user.id, invite.role as UserRole)
				await redeemInvite(inviteToken, data.user.id)
			}
		}
	}

	return NextResponse.redirect(`${origin}/dashboard`)
}
