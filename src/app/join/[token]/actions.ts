"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { validateInviteToken, redeemInvite } from "@/lib/db/invites"

export const signupWithInvite = async (
	_prevState: { error: string },
	formData: FormData
) => {
	const token = formData.get("invite_token") as string
	const name = formData.get("name") as string
	const email = formData.get("email") as string
	const password = formData.get("password") as string

	if (!name || !email || !password) {
		return { error: "All fields are required" }
	}

	if (password.length < 6) {
		return { error: "Password must be at least 6 characters" }
	}

	const invite = await validateInviteToken(token)
	if (!invite) {
		return { error: "This invite is invalid, expired, or has already been used" }
	}

	if (invite.email && invite.email.toLowerCase() !== email.toLowerCase()) {
		return { error: "This invite is for a different email address" }
	}

	const supabase = await createClient()

	const { data, error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: { name },
		},
	})

	if (error) {
		return { error: error.message }
	}

	if (data.user) {
		await redeemInvite(token, data.user.id)
	}

	redirect("/dashboard")
}
