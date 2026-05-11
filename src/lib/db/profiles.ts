import { createClient } from "@/lib/supabase/server"
import type { DbProfile, UserRole } from "@/lib/types"

export const getCurrentProfile = async (): Promise<DbProfile> => {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) {
		if (process.env.NODE_ENV === "development") {
			return { id: "dev-user", name: "Josh Thornhill", role: "admin", email: "josh@kestreldevelopments.ca" } as DbProfile
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

export const getAllProfiles = async (): Promise<DbProfile[]> => {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("profiles")
		.select("*")
		.order("name")

	if (error) throw error
	return data as DbProfile[]
}

export const getProfileRole = async (userId: string): Promise<UserRole | null> => {
	const supabase = await createClient()
	const { data } = await supabase
		.from("profiles")
		.select("role")
		.eq("id", userId)
		.single()

	return data?.role ?? null
}

export const updateProfileRole = async (userId: string, role: UserRole) => {
	const supabase = await createClient()
	const { error } = await supabase
		.from("profiles")
		.update({ role })
		.eq("id", userId)

	if (error) throw error
}
