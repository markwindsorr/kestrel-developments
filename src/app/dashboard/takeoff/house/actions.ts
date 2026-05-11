"use server"

import { createQuoteRequests, getQuoteRequests } from "@/lib/db/quote-requests"
import { getProjectDocuments } from "@/lib/db/project-documents"
import { saveEstimate, linkEstimateToJob } from "@/lib/db/estimates"
import { sendQuoteRequestEmail } from "@/lib/email"
import { createClient } from "@/lib/supabase/server"

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.kestreldevelopments.ca"

export async function saveEstimateAction(
	name: string,
	data: Record<string, unknown>,
	existingId?: string
): Promise<{ id: string | null; error?: string }> {
	try {
		const id = await saveEstimate(name, data, existingId)
		return { id }
	} catch {
		return { id: null, error: "Failed to save estimate" }
	}
}

export interface SendQuoteInput {
	estimateId: string
	projectName: string
	notes?: string
	contractors: Array<{
		tradeName: string
		tradeEmail: string
		tradeCategory: string
		estimateAmount: number | null
	}>
	documentIds: string[]
}

export async function sendQuoteRequestsAction(
	input: SendQuoteInput
): Promise<{ sent: number; error?: string }> {
	if (!process.env.RESEND_API_KEY) {
		return { sent: 0, error: "Email not configured. Add RESEND_API_KEY to environment variables." }
	}

	// Fetch selected documents and generate 7-day signed URLs
	const documentUrls: Array<{ name: string; url: string }> = []
	if (input.documentIds.length > 0) {
		const supabase = await createClient()
		const docs = await getProjectDocuments(input.estimateId)
		const selected = docs.filter(d => input.documentIds.includes(d.id))

		for (const doc of selected) {
			const { data } = await supabase.storage
				.from("project-documents")
				.createSignedUrl(doc.driveFileId, 60 * 60 * 24 * 7)
			if (data?.signedUrl) {
				documentUrls.push({ name: doc.name, url: data.signedUrl })
			}
		}
	}

	const requests = await createQuoteRequests(
		input.contractors.map(c => ({
			estimateId: input.estimateId,
			tradeName: c.tradeName,
			tradeEmail: c.tradeEmail,
			tradeCategory: c.tradeCategory,
			documentIds: input.documentIds,
			estimateAmount: c.estimateAmount,
		}))
	)

	let sent = 0
	for (const req of requests) {
		try {
			await sendQuoteRequestEmail({
				toEmail: req.tradeEmail,
				tradeName: req.tradeName,
				tradeCategory: req.tradeCategory,
				projectName: input.projectName,
				estimateAmount: req.estimateAmount,
				submissionUrl: `${BASE_URL}/quote/submit/${req.token}`,
				documentUrls,
				notes: input.notes,
			})
			sent++
		} catch (err) {
			console.error(`Failed to send quote email to ${req.tradeEmail}:`, err)
		}
	}

	return { sent }
}

export async function getQuoteStatusAction(estimateId: string) {
	return getQuoteRequests(estimateId)
}

export async function linkEstimateToJobAction(
	estimateId: string,
	jobId: string | null,
): Promise<{ error?: string }> {
	try {
		await linkEstimateToJob(estimateId, jobId)
		return {}
	} catch {
		return { error: "Failed to link estimate to job" }
	}
}
