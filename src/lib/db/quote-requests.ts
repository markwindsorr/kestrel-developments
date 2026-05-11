import { createClient } from "@/lib/supabase/server"

export interface QuoteRequest {
	id: string
	token: string
	estimateId: string
	tradeName: string
	tradeEmail: string
	tradeCategory: string
	documentIds: string[]
	status: "pending" | "viewed" | "received" | "expired"
	estimateAmount: number | null
	quoteAmount: number | null
	quoteNotes: string | null
	quotePdfPath: string | null
	sentAt: string
	viewedAt: string | null
	receivedAt: string | null
	reminderCount: number
	lastReminderAt: string | null
}

export async function getQuoteRequests(estimateId: string): Promise<QuoteRequest[]> {
	const supabase = await createClient()
	const { data } = await supabase
		.from("quote_requests")
		.select("*")
		.eq("estimate_id", estimateId)
		.order("sent_at", { ascending: false })

	return (data ?? []).map(mapRow)
}

export async function getQuoteByToken(token: string): Promise<QuoteRequest | null> {
	// Uses service-role or anon key — called from public submission page
	const supabase = await createClient()
	const { data } = await supabase
		.from("quote_requests")
		.select("*")
		.eq("token", token)
		.single()

	return data ? mapRow(data) : null
}

export async function createQuoteRequests(
	requests: Array<{
		estimateId: string
		tradeName: string
		tradeEmail: string
		tradeCategory: string
		documentIds: string[]
		estimateAmount: number | null
	}>
): Promise<QuoteRequest[]> {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return []

	const rows = requests.map(r => ({
		estimate_id: r.estimateId,
		user_id: user.id,
		trade_name: r.tradeName,
		trade_email: r.tradeEmail,
		trade_category: r.tradeCategory,
		document_ids: r.documentIds,
		estimate_amount: r.estimateAmount,
	}))

	const { data } = await supabase
		.from("quote_requests")
		.insert(rows)
		.select("*")

	return (data ?? []).map(mapRow)
}

export async function markQuoteViewed(token: string): Promise<void> {
	const supabase = await createClient()
	await supabase
		.from("quote_requests")
		.update({ status: "viewed", viewed_at: new Date().toISOString() })
		.eq("token", token)
		.eq("status", "pending")
}

export async function submitQuote(
	token: string,
	quoteAmount: number,
	quoteNotes: string,
	quotePdfPath: string | null
): Promise<void> {
	const supabase = await createClient()
	await supabase
		.from("quote_requests")
		.update({
			status: "received",
			quote_amount: quoteAmount,
			quote_notes: quoteNotes,
			quote_pdf_path: quotePdfPath,
			received_at: new Date().toISOString(),
		})
		.eq("token", token)
}

export async function recordReminder(id: string): Promise<void> {
	const supabase = await createClient()
	await supabase.rpc("increment_reminder", { request_id: id })
}

function mapRow(row: Record<string, unknown>): QuoteRequest {
	return {
		id: row.id as string,
		token: row.token as string,
		estimateId: row.estimate_id as string,
		tradeName: row.trade_name as string,
		tradeEmail: row.trade_email as string,
		tradeCategory: row.trade_category as string,
		documentIds: (row.document_ids as string[]) ?? [],
		status: row.status as QuoteRequest["status"],
		estimateAmount: row.estimate_amount as number | null,
		quoteAmount: row.quote_amount as number | null,
		quoteNotes: row.quote_notes as string | null,
		quotePdfPath: row.quote_pdf_path as string | null,
		sentAt: row.sent_at as string,
		viewedAt: row.viewed_at as string | null,
		receivedAt: row.received_at as string | null,
		reminderCount: row.reminder_count as number,
		lastReminderAt: row.last_reminder_at as string | null,
	}
}
