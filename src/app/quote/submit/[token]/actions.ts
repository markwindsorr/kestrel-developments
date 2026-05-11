"use server"

import { submitQuote } from "@/lib/db/quote-requests"

export async function submitQuoteAction(
	token: string,
	quoteAmount: number,
	quoteNotes: string,
	quotePdfPath: string | null
): Promise<{ error?: string }> {
	try {
		await submitQuote(token, quoteAmount, quoteNotes, quotePdfPath)
		return {}
	} catch {
		return { error: "Failed to submit quote. Please try again." }
	}
}
