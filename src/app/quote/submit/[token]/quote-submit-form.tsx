"use client"

import { useState, useRef } from "react"
import { submitQuoteAction } from "./actions"

export function QuoteSubmitForm({ token }: { token: string }) {
	const [amount, setAmount] = useState("")
	const [notes, setNotes] = useState("")
	const [file, setFile] = useState<File | null>(null)
	const [submitting, setSubmitting] = useState(false)
	const [done, setDone] = useState(false)
	const [error, setError] = useState("")
	const fileRef = useRef<HTMLInputElement>(null)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		const parsed = parseFloat(amount.replace(/,/g, ""))
		if (!parsed || parsed <= 0) {
			setError("Please enter a valid quote amount.")
			return
		}

		setSubmitting(true)
		setError("")

		let pdfPath: string | null = null
		if (file) {
			const uploadResult = await uploadPdf(token, file)
			if (!uploadResult.ok) {
				setError("PDF upload failed. You can still submit without it.")
				setSubmitting(false)
				return
			}
			pdfPath = uploadResult.path
		}

		const result = await submitQuoteAction(token, parsed, notes, pdfPath)
		if (result.error) {
			setError(result.error)
			setSubmitting(false)
		} else {
			setDone(true)
		}
	}

	if (done) {
		return (
			<div className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-8 text-center">
				<div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
					<svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h2 className="text-lg font-semibold text-neutral-900 mb-2">Quote Submitted</h2>
				<p className="text-neutral-500 text-sm">Thank you. Kestrel Developments has been notified and will be in touch.</p>
			</div>
		)
	}

	return (
		<form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-neutral-200 p-6 space-y-5">
			<div>
				<label className="block text-sm font-medium text-neutral-700 mb-1.5">
					Quote Amount (CAD) <span className="text-red-500">*</span>
				</label>
				<div className="relative">
					<span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 font-medium">$</span>
					<input
						type="text"
						inputMode="decimal"
						value={amount}
						onChange={e => setAmount(e.target.value)}
						placeholder="0.00"
						className="w-full pl-7 pr-4 py-2.5 rounded-lg border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent"
					/>
				</div>
			</div>

			<div>
				<label className="block text-sm font-medium text-neutral-700 mb-1.5">Notes / Scope Inclusions</label>
				<textarea
					value={notes}
					onChange={e => setNotes(e.target.value)}
					rows={4}
					placeholder="Describe what's included, exclusions, lead time, payment terms..."
					className="w-full px-3 py-2.5 rounded-lg border border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-transparent resize-none"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium text-neutral-700 mb-1.5">Attach Quote PDF (optional)</label>
				<input
					ref={fileRef}
					type="file"
					accept="application/pdf"
					className="hidden"
					onChange={e => setFile(e.target.files?.[0] ?? null)}
				/>
				<button
					type="button"
					onClick={() => fileRef.current?.click()}
					className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-neutral-300 text-neutral-600 hover:border-brand-400 hover:text-brand-700 transition-colors text-sm"
				>
					<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
					</svg>
					{file ? file.name : "Upload PDF"}
				</button>
				{file && (
					<button type="button" onClick={() => setFile(null)} className="ml-2 text-xs text-neutral-400 hover:text-red-500">
						Remove
					</button>
				)}
			</div>

			{error && <p className="text-sm text-red-600">{error}</p>}

			<button
				type="submit"
				disabled={submitting}
				className="w-full py-3 rounded-lg bg-brand-700 text-white font-medium hover:bg-brand-800 transition-colors disabled:opacity-50"
			>
				{submitting ? "Submitting…" : "Submit Quote"}
			</button>
		</form>
	)
}

async function uploadPdf(token: string, file: File): Promise<{ ok: boolean; path: string }> {
	const formData = new FormData()
	formData.append("file", file)
	formData.append("token", token)

	const res = await fetch("/api/quotes/upload-pdf", {
		method: "POST",
		body: formData,
	})

	if (!res.ok) return { ok: false, path: "" }
	const json = await res.json()
	return { ok: true, path: json.path }
}
