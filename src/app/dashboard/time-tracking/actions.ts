"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { hasActiveSession, insertTimeEntry, clockOutActiveEntry } from "@/lib/db/time-entries"

export async function clockIn(
	_prevState: { error: string },
	formData: FormData
) {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) return { error: "Not authenticated" }

	const jobId = formData.get("jobId") as string
	if (!jobId) return { error: "Please select a job" }

	if (await hasActiveSession(user.id)) {
		return { error: "Already clocked in — clock out first" }
	}

	const notes = formData.get("notes") as string | null

	try {
		await insertTimeEntry({
			user_id: user.id,
			job_id: jobId,
			notes: notes || null,
		})
	} catch (e) {
		return { error: (e as Error).message }
	}

	revalidatePath("/dashboard/time-tracking")
	revalidatePath("/dashboard")
	return { error: "" }
}

export async function clockOut(
	_prevState: { error: string }
) {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()

	if (!user) return { error: "Not authenticated" }

	try {
		await clockOutActiveEntry(user.id)
	} catch (e) {
		return { error: (e as Error).message }
	}

	revalidatePath("/dashboard/time-tracking")
	revalidatePath("/dashboard")
	return { error: "" }
}
