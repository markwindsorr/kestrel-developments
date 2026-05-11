import { notFound } from "next/navigation"
import { getQuoteByToken, markQuoteViewed } from "@/lib/db/quote-requests"
import { QuoteSubmitForm } from "./quote-submit-form"

export default async function QuoteSubmitPage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = await params
	const quote = await getQuoteByToken(token)

	if (!quote) notFound()

	if (quote.status === "pending") {
		await markQuoteViewed(token)
	}

	if (quote.status === "received") {
		return (
			<div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 max-w-md w-full text-center">
					<div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
						</svg>
					</div>
					<h1 className="text-xl font-semibold text-neutral-900 mb-2">Quote Already Submitted</h1>
					<p className="text-neutral-500 text-sm">
						Your quote for {quote.tradeCategory} work has been received. Thank you, {quote.tradeName}.
					</p>
				</div>
			</div>
		)
	}

	if (quote.status === "expired") {
		return (
			<div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 max-w-md w-full text-center">
					<h1 className="text-xl font-semibold text-neutral-900 mb-2">Quote Request Expired</h1>
					<p className="text-neutral-500 text-sm">This quote request is no longer accepting submissions. Please contact Kestrel Developments directly.</p>
				</div>
			</div>
		)
	}

	return (
		<div className="min-h-screen bg-neutral-50 p-4">
			<div className="max-w-lg mx-auto">
				<div className="mb-6 pt-4">
					<p className="text-xs font-medium text-neutral-400 uppercase tracking-wide">Kestrel Developments</p>
					<h1 className="text-2xl font-semibold text-neutral-900 mt-1">Quote Request</h1>
					<p className="text-neutral-500 text-sm mt-1">{quote.tradeCategory} · For {quote.tradeName}</p>
				</div>

				{quote.estimateAmount != null && (
					<div className="bg-brand-50 border border-brand-200 rounded-xl p-4 mb-6">
						<p className="text-xs text-brand-700 font-medium mb-0.5">Our estimate for this trade</p>
						<p className="text-2xl font-bold text-brand-800">
							${Math.round(quote.estimateAmount).toLocaleString("en-CA")}
						</p>
					</div>
				)}

				<QuoteSubmitForm token={token} />
			</div>
		</div>
	)
}
