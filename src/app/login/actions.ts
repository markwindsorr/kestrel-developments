"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"

export async function login(
	_prevState: { error: string },
	formData: FormData
) {
	const supabase = await createClient()

	const { error } = await supabase.auth.signInWithPassword({
		email: formData.get("email") as string,
		password: formData.get("password") as string,
	})

	if (error) {
		return { error: error.message }
	}

	redirect("/dashboard")
}

export async function signup(
	_prevState: { error: string },
	formData: FormData
) {
	const supabase = await createClient()

	const name = formData.get("name") as string
	const email = formData.get("email") as string
	const password = formData.get("password") as string

	if (!name || !email || !password) {
		return { error: "All fields are required" }
	}

	if (password.length < 6) {
		return { error: "Password must be at least 6 characters" }
	}

	const { error } = await supabase.auth.signUp({
		email,
		password,
		options: {
			data: {
				name,
				role: "worker",
			},
		},
	})

	if (error) {
		return { error: error.message }
	}

	redirect("/dashboard")
}

export async function signOut() {
	const supabase = await createClient()
	await supabase.auth.signOut()
	redirect("/login")
}
