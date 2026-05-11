"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { upsertManyCostRates } from "@/lib/db/cost-rates"

export async function saveRatesAction(rates: Record<string, number>): Promise<{ error?: string }> {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return { error: "Unauthorized" }

	const { data: profile } = await supabase
		.from("profiles")
		.select("role")
		.eq("id", user.id)
		.single()

	if (profile?.role !== "admin") return { error: "Only admins can edit cost rates." }

	await upsertManyCostRates(rates)
	revalidatePath("/dashboard/settings/rates")
	revalidatePath("/dashboard/takeoff/house")
	return {}
}
