"use server"

import { revalidatePath } from "next/cache"
import { hasActiveSession, insertTimeEntry, clockOutActiveEntry } from "@/lib/db/time-entries"
import { requireAuth, requireOrgContext } from "@/lib/db/org"

export const clockIn = async (
	_prevState: { error: string },
	formData: FormData
) => {
	try {
		const { userId, orgContext } = await requireOrgContext()

		const jobId = formData.get("jobId") as string
		if (!jobId) return { error: "Please select a job" }

		if (await hasActiveSession(userId)) {
			return { error: "Already clocked in — clock out first" }
		}

		const notes = formData.get("notes") as string | null

		await insertTimeEntry({
			user_id: userId,
			job_id: jobId,
			org_id: orgContext.orgId,
			notes: notes || null,
		})

		revalidatePath("/dashboard/time-tracking")
		revalidatePath("/dashboard")
		return { error: "" }
	} catch (e) {
		return { error: (e as Error).message }
	}
}

export const clockOut = async (_prevState: { error: string }) => {
	try {
		const userId = await requireAuth()
		await clockOutActiveEntry(userId)
	} catch (e) {
		return { error: (e as Error).message }
	}

	revalidatePath("/dashboard/time-tracking")
	revalidatePath("/dashboard")
	return { error: "" }
}
