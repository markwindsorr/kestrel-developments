import { Resend } from "resend"

export interface QuoteEmailParams {
	toEmail: string
	tradeName: string
	tradeCategory: string
	projectName: string
	estimateAmount: number | null
	submissionUrl: string
	documentUrls: Array<{ name: string; url: string }>
	notes?: string
}

export async function sendQuoteRequestEmail(params: QuoteEmailParams): Promise<void> {
	const resend = new Resend(process.env.RESEND_API_KEY)
	const docsSection = params.documentUrls.length > 0
		? `\n\nProject drawings and documents:\n${params.documentUrls.map(d => `• ${d.name}: ${d.url}`).join("\n")}\n\nThese links expire in 7 days.`
		: ""

	const estimateSection = params.estimateAmount != null
		? `\n\nOur current estimate for ${params.tradeCategory} work is $${Math.round(params.estimateAmount).toLocaleString("en-CA")}.`
		: ""

	const notesSection = params.notes?.trim()
		? `\n\nAdditional notes from Kestrel Developments:\n${params.notes.trim()}`
		: ""

	const body = `Hello ${params.tradeName},

We are requesting a quote for ${params.tradeCategory} work on ${params.projectName}.${estimateSection}${notesSection}${docsSection}

Please submit your quote using the secure link below. You can include your price, notes, and optionally attach a PDF quote.

${params.submissionUrl}

If you have any questions, please reply to this email.

Thank you,
Kestrel Developments`

	await resend.emails.send({
		from: "Kestrel Developments <josh@kestreldevelopments.ca>",
		to: `${params.tradeName} <${params.toEmail}>`,
		replyTo: "josh@kestreldevelopments.ca",
		subject: `Quote Request – ${params.tradeCategory} – ${params.projectName}`,
		text: body,
	})
}
