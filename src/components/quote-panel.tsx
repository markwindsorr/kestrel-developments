"use client"

import { useState, useEffect, useRef } from "react"
import { sendQuoteRequestsAction, getQuoteStatusAction } from "@/app/dashboard/takeoff/house/actions"
import type { QuoteRequest } from "@/lib/db/quote-requests"

const TRADE_CATEGORIES = [
	"Framing", "Electrical", "Plumbing", "HVAC", "Insulation",
	"Drywall", "Flooring", "Painting", "Siding", "Roofing",
	"Landscaping", "Concrete", "Excavation", "Cabinets", "Tile",
]

// Trades where we can auto-apply the received amount to a direct estimate input
const AUTO_APPLY_TRADES = new Set(["Plumbing", "Siding", "Cabinets", "Flooring", "Landscaping", "Excavation"])

interface Contractor {
	id: string
	tradeName: string
	tradeEmail: string
	tradeCategory: string
}

interface UploadedDoc {
	id: string
	name: string
	mimeType: string
}

interface Props {
	estimateId: string | null
	projectName: string
	tradeEstimates: Record<string, number>
	onSaveFirst: () => Promise<string | null>
	onApplyQuote: (category: string, amount: number) => void
}

export function QuotePanel({ estimateId, projectName, tradeEstimates, onSaveFirst, onApplyQuote }: Props) {
	const [tab, setTab] = useState<"send" | "status">("send")

	// Contractors
	const [contractors, setContractors] = useState<Contractor[]>([])
	const [newName, setNewName] = useState("")
	const [newEmail, setNewEmail] = useState("")
	const [newCategory, setNewCategory] = useState(TRADE_CATEGORIES[0])

	// Notes
	const [notes, setNotes] = useState("")

	// Documents
	const [docs, setDocs] = useState<UploadedDoc[]>([])
	const [selectedDocIds, setSelectedDocIds] = useState<string[]>([])
	const [uploading, setUploading] = useState(false)
	const [uploadError, setUploadError] = useState<string | null>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	// Send state
	const [sending, setSending] = useState(false)
	const [sendResult, setSendResult] = useState<{ sent?: number; error?: string } | null>(null)

	// Status board
	const [quoteStatuses, setQuoteStatuses] = useState<QuoteRequest[]>([])
	const [loadingStatuses, setLoadingStatuses] = useState(false)
	const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set())

	useEffect(() => {
		if (estimateId) loadStatuses()
	}, [estimateId])

	async function loadStatuses() {
		if (!estimateId) return
		setLoadingStatuses(true)
		try {
			const statuses = await getQuoteStatusAction(estimateId)
			setQuoteStatuses(statuses)
		} finally {
			setLoadingStatuses(false)
		}
	}

	function addContractor() {
		const name = newName.trim()
		const email = newEmail.trim().toLowerCase()
		if (!name || !email) return
		setContractors(prev => [...prev, {
			id: crypto.randomUUID(),
			tradeName: name,
			tradeEmail: email,
			tradeCategory: newCategory,
		}])
		setNewName("")
		setNewEmail("")
		// keep category and focus back on name field for fast multi-entry
	}

	async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0]
		if (!file) return

		setUploadError(null)
		setUploading(true)
		const formData = new FormData()
		formData.append("file", file)
		formData.append("estimateId", estimateId!)

		const res = await fetch("/api/projects/upload-document", { method: "POST", body: formData })
		const json = await res.json()
		if (res.ok) {
			setDocs(prev => [...prev, json])
			setSelectedDocIds(prev => [...prev, json.id])
		} else {
			setUploadError(json.error ?? "Upload failed. Please try again.")
		}
		setUploading(false)
		if (fileRef.current) fileRef.current.value = ""
	}

	function toggleDoc(id: string) {
		setSelectedDocIds(prev =>
			prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
		)
	}

	async function handleSend() {
		if (contractors.length === 0) return
		setSending(true)
		setSendResult(null)

		let eid = estimateId
		if (!eid) {
			eid = await onSaveFirst()
			if (!eid) {
				setSendResult({ error: "Could not save estimate. Try saving manually first." })
				setSending(false)
				return
			}
		}

		const result = await sendQuoteRequestsAction({
			estimateId: eid,
			projectName: projectName || "Unnamed Project",
			notes,
			contractors: contractors.map(c => ({
				tradeName: c.tradeName,
				tradeEmail: c.tradeEmail,
				tradeCategory: c.tradeCategory,
				estimateAmount: tradeEstimates[c.tradeCategory] ?? null,
			})),
			documentIds: selectedDocIds,
		})

		setSendResult(result)
		setSending(false)
		if (!result.error) {
			setContractors([])
			setNotes("")
			await loadStatuses()
			setTab("status")
		}
	}

	function handleApply(q: QuoteRequest) {
		if (!q.quoteAmount) return
		onApplyQuote(q.tradeCategory, q.quoteAmount)
		setAppliedIds(prev => new Set(prev).add(q.id))
	}

	const statusBadge = (s: QuoteRequest["status"]) => ({
		pending: "text-yellow-700 bg-yellow-50 border-yellow-200",
		viewed: "text-blue-700 bg-blue-50 border-blue-200",
		received: "text-green-700 bg-green-50 border-green-200",
		expired: "text-neutral-500 bg-neutral-50 border-neutral-200",
	}[s])

	const daysSince = (ts: string) => Math.floor((Date.now() - new Date(ts).getTime()) / 86400000)
	const receivedCount = quoteStatuses.filter(q => q.status === "received").length

	// Show a gate if estimate hasn't been saved yet
	if (!estimateId) {
		return (
			<div className="rounded-xl border border-neutral-200 bg-white p-6 flex items-start gap-4">
				<div className="w-9 h-9 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
					<svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
					</svg>
				</div>
				<div>
					<p className="text-sm font-medium text-neutral-900">Save the estimate first</p>
					<p className="text-sm text-neutral-500 mt-0.5">Use the <span className="font-medium text-neutral-700">Estimates</span> button at the top of the page to save this estimate with a name before sending quote requests or uploading documents.</p>
				</div>
			</div>
		)
	}

	return (
		<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
			{/* Tabs */}
			<div className="flex border-b border-neutral-200">
				{(["send", "status"] as const).map(t => (
					<button key={t} onClick={() => { setTab(t); if (t === "status" && estimateId) loadStatuses() }}
						className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${tab === t ? "border-brand-600 text-brand-700" : "border-transparent text-neutral-500 hover:text-neutral-700"}`}>
						{t === "send" ? "Send Quote Requests" : (
							<span className="flex items-center gap-1.5">
								Status Board
								{receivedCount > 0 && (
									<span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-green-500 text-white text-xs font-bold">{receivedCount}</span>
								)}
							</span>
						)}
					</button>
				))}
			</div>

			{tab === "send" && (
				<div className="p-5 space-y-6">

					{/* Add contractors */}
					<div>
						<p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-3">Contractors</p>
						<div className="flex flex-wrap gap-2 items-end mb-3">
							<div className="flex flex-col gap-0.5">
								<span className="text-xs text-neutral-600">Trade</span>
								<select value={newCategory} onChange={e => setNewCategory(e.target.value)}
									className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none">
									{TRADE_CATEGORIES.map(t => <option key={t}>{t}</option>)}
								</select>
							</div>
							<div className="flex flex-col gap-0.5">
								<span className="text-xs text-neutral-600">Company name</span>
								<input
									value={newName}
									onChange={e => setNewName(e.target.value)}
									placeholder="ABC Electrical Ltd."
									className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none w-44"
								/>
							</div>
							<div className="flex flex-col gap-0.5">
								<span className="text-xs text-neutral-600">Email</span>
								<input
									type="email"
									value={newEmail}
									onChange={e => setNewEmail(e.target.value)}
									onKeyDown={e => e.key === "Enter" && addContractor()}
									placeholder="quote@example.com"
									className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none w-48"
								/>
							</div>
							<button
								type="button"
								onClick={addContractor}
								disabled={!newName.trim() || !newEmail.trim()}
								className="rounded bg-brand-600 px-3 py-1.5 text-sm text-white hover:bg-brand-700 transition-colors disabled:opacity-40"
							>
								+ Add
							</button>
						</div>

						{contractors.length > 0 && (
							<div className="border border-neutral-200 rounded-lg overflow-hidden">
								<table className="w-full text-sm">
									<thead>
										<tr className="bg-neutral-50 text-xs text-neutral-500 uppercase tracking-wide">
											<th className="py-2 pl-3 text-left font-medium">Trade</th>
											<th className="py-2 pl-3 text-left font-medium">Company</th>
											<th className="py-2 pl-3 text-left font-medium">Email</th>
											<th className="py-2 pl-3 text-right font-medium pr-3">Our Estimate</th>
											<th className="py-2 pr-3" />
										</tr>
									</thead>
									<tbody>
										{contractors.map(c => (
											<tr key={c.id} className="border-t border-neutral-100">
												<td className="py-2 pl-3 text-neutral-700">{c.tradeCategory}</td>
												<td className="py-2 pl-3 text-neutral-900 font-medium">{c.tradeName}</td>
												<td className="py-2 pl-3 text-neutral-500 text-xs">{c.tradeEmail}</td>
												<td className="py-2 pl-3 pr-3 text-right tabular-nums text-neutral-500 text-xs">
													{tradeEstimates[c.tradeCategory]
														? `$${Math.round(tradeEstimates[c.tradeCategory]).toLocaleString("en-CA")}`
														: <span className="text-neutral-300">—</span>}
												</td>
												<td className="py-2 pr-3 text-right">
													<button
														type="button"
														onClick={() => setContractors(prev => prev.filter(x => x.id !== c.id))}
														className="text-neutral-300 hover:text-red-500 text-lg leading-none"
													>×</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						)}
					</div>

					{/* Notes */}
					<div>
						<p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">Notes to Subcontractors</p>
						<textarea
							value={notes}
							onChange={e => setNotes(e.target.value)}
							rows={3}
							placeholder="Any specific scope details, site access instructions, deadline, or other notes to include in the email…"
							className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none resize-none"
						/>
					</div>

					{/* Documents */}
					<div>
						<p className="text-xs font-semibold text-neutral-600 uppercase tracking-wide mb-2">Attach Documents</p>
						<input ref={fileRef} type="file" className="hidden"
							accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.xls,.xlsx"
							onChange={handleFileUpload} />
						<button
							type="button"
							onClick={() => fileRef.current?.click()}
							disabled={uploading}
							className="flex items-center gap-2 px-3 py-1.5 rounded border border-neutral-300 text-sm text-neutral-600 hover:border-brand-400 hover:text-brand-700 transition-colors disabled:opacity-50 mb-3"
						>
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
							</svg>
							{uploading ? "Uploading…" : "Upload drawing or document"}
						</button>
						{uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
						{docs.length > 0 && (
							<div className="border border-neutral-200 rounded-lg divide-y divide-neutral-100">
								{docs.map(d => (
									<label key={d.id} className="flex items-center gap-3 px-3 py-2 hover:bg-neutral-50 cursor-pointer">
										<input type="checkbox" checked={selectedDocIds.includes(d.id)}
											onChange={() => toggleDoc(d.id)}
											className="h-3.5 w-3.5 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" />
										<svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
											<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
										</svg>
										<span className="text-sm text-neutral-800 flex-1 min-w-0 truncate">{d.name}</span>
									</label>
								))}
							</div>
						)}
						{selectedDocIds.length > 0 && (
							<p className="text-xs text-neutral-500 mt-1.5">{selectedDocIds.length} document{selectedDocIds.length !== 1 ? "s" : ""} will be included as download links in the emails.</p>
						)}
					</div>

					{/* Send */}
					<div className="flex items-center gap-3 pt-1 border-t border-neutral-100">
						<button
							type="button"
							onClick={handleSend}
							disabled={sending || contractors.length === 0}
							className="flex items-center gap-2 rounded-lg bg-brand-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-800 transition-colors disabled:opacity-40"
						>
							<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
							</svg>
							{sending ? "Sending…" : `Send ${contractors.length} Quote Request${contractors.length !== 1 ? "s" : ""}`}
						</button>
						{sendResult?.error && <p className="text-sm text-red-600">{sendResult.error}</p>}
						{sendResult?.sent != null && !sendResult.error && (
							<p className="text-sm text-green-600">{sendResult.sent} email{sendResult.sent !== 1 ? "s" : ""} sent successfully.</p>
						)}
					</div>
				</div>
			)}

			{tab === "status" && (
				<div className="p-5">
					{loadingStatuses ? (
						<p className="text-sm text-neutral-400">Loading…</p>
					) : !estimateId ? (
						<p className="text-sm text-neutral-400">Save the estimate to see quote statuses.</p>
					) : quoteStatuses.length === 0 ? (
						<p className="text-sm text-neutral-400">No quote requests sent yet for this estimate.</p>
					) : (
						<div className="border border-neutral-200 rounded-lg overflow-hidden">
							<table className="w-full text-sm">
								<thead>
									<tr className="bg-neutral-50 text-xs text-neutral-500 uppercase tracking-wide">
										<th className="py-2 pl-3 text-left font-medium">Trade</th>
										<th className="py-2 pl-3 text-left font-medium">Contractor</th>
										<th className="py-2 pl-3 text-left font-medium">Status</th>
										<th className="py-2 pl-3 text-right font-medium">Estimate</th>
										<th className="py-2 pl-3 pr-3 text-right font-medium">Quote Received</th>
									</tr>
								</thead>
								<tbody>
									{quoteStatuses.map(q => (
										<tr key={q.id} className="border-t border-neutral-100">
											<td className="py-3 pl-3 text-neutral-700 font-medium">{q.tradeCategory}</td>
											<td className="py-3 pl-3">
												<p className="text-neutral-900">{q.tradeName}</p>
												<p className="text-xs text-neutral-400">{q.tradeEmail}</p>
											</td>
											<td className="py-3 pl-3">
												<span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusBadge(q.status)}`}>
													{q.status}
												</span>
												<p className="text-xs text-neutral-400 mt-0.5">{daysSince(q.sentAt)}d ago</p>
											</td>
											<td className="py-3 pl-3 text-right tabular-nums text-neutral-500 text-xs">
												{q.estimateAmount != null
													? `$${Math.round(q.estimateAmount).toLocaleString("en-CA")}`
													: <span className="text-neutral-300">—</span>}
											</td>
											<td className="py-3 pl-3 pr-3 text-right">
												{q.quoteAmount != null ? (
													<div className="flex flex-col items-end gap-1">
														<p className="font-semibold text-neutral-900 tabular-nums">
															${Math.round(q.quoteAmount).toLocaleString("en-CA")}
														</p>
														{q.estimateAmount != null && (
															<p className={`text-xs tabular-nums ${q.quoteAmount <= q.estimateAmount ? "text-green-600" : "text-red-600"}`}>
																{q.quoteAmount <= q.estimateAmount ? "−" : "+"}
																${Math.abs(Math.round(q.quoteAmount - q.estimateAmount)).toLocaleString("en-CA")}
															</p>
														)}
														{AUTO_APPLY_TRADES.has(q.tradeCategory) && (
															appliedIds.has(q.id) ? (
																<span className="text-xs text-green-600 font-medium">✓ Applied</span>
															) : (
																<button
																	type="button"
																	onClick={() => handleApply(q)}
																	className="text-xs text-brand-600 hover:text-brand-800 font-medium hover:underline"
																>
																	Apply to estimate
																</button>
															)
														)}
													</div>
												) : (
													<span className="text-neutral-300 text-xs">awaiting response</span>
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					)}
				</div>
			)}
		</div>
	)
}
