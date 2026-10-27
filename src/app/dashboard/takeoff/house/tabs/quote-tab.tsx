"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import type { Measurement, Project } from "@/lib/db/projects"
import type { DbJob } from "@/lib/types"
import { CATEGORY_ORDER } from "@/lib/db/assemblies-seed"
import {
	consumeNextQuoteNumber,
	formatQuoteNumber,
	loadCompanyInfo,
	loadQuoteFields,
	peekQuoteNumber,
	saveCompanyInfo,
	saveQuoteFields,
	type CompanyInfo,
	type QuoteFields,
} from "../lib/quote-storage"
import { generateQuotePdf, type QuoteCategoryGroup } from "../lib/quote-pdf"
import { formatCAD } from "../lib/format"

interface Props {
	project: Project
	jobs: DbJob[]
	onProjectUpdate: (p: Project) => void
}

const MAX_LOGO_BYTES = 500 * 1024  // 500 KB ceiling — keeps localStorage healthy

export function QuoteTab({ project }: Props) {
	const [company, setCompany] = useState<CompanyInfo | null>(null)
	const [fields, setFields] = useState<QuoteFields | null>(null)
	const [quoteNumber, setQuoteNumber] = useState<number>(1)
	const [logoError, setLogoError] = useState<string | null>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	// Hydrate from localStorage on mount / project switch. Deferred via
	// queueMicrotask so React's no-setState-in-effect-body rule (and SSR's
	// missing window) don't get tripped — we can't read localStorage during
	// the server render anyway, so a microtask later is the natural place.
	useEffect(() => {
		queueMicrotask(() => {
			setCompany(loadCompanyInfo())
			setQuoteNumber(peekQuoteNumber())
		})
	}, [])

	useEffect(() => {
		queueMicrotask(() => {
			setFields(loadQuoteFields(project.id, { projectAddress: project.address }))
		})
	}, [project.id, project.address])

	// Persist on change (cheap, localStorage is sync).
	useEffect(() => { if (company) saveCompanyInfo(company) }, [company])
	useEffect(() => { if (fields) saveQuoteFields(project.id, fields) }, [fields, project.id])

	// ─── Group measurements & compute totals (mirrors summary tab math) ────
	const groups: QuoteCategoryGroup[] = useMemo(() => {
		const byCat = new Map<string, Measurement[]>()
		for (const m of project.measurements) {
			if (!byCat.has(m.assemblyCategory)) byCat.set(m.assemblyCategory, [])
			byCat.get(m.assemblyCategory)!.push(m)
		}
		const known = (CATEGORY_ORDER as readonly string[]).filter(c => byCat.has(c))
		const extras = [...byCat.keys()].filter(c => !(CATEGORY_ORDER as readonly string[]).includes(c)).sort()
		return [...known, ...extras].map(cat => {
			const rows = byCat.get(cat)!
			let material = 0, labour = 0, total = 0
			for (const r of rows) { material += r.materialCost; labour += r.labourCost; total += r.totalCost }
			return { category: cat, rows, material, labour, total }
		})
	}, [project.measurements])

	const subtotal = useMemo(() => groups.reduce((s, g) => s + g.total, 0), [groups])
	const contingencyAmt = subtotal * (project.contingencyPct / 100)
	const profitAmt = subtotal * (project.profitPct / 100)
	const preTaxTotal = subtotal + contingencyAmt + profitAmt
	const hstRatePct = project.hstRate * 100
	const hstAmt = project.hstEnabled ? preTaxTotal * project.hstRate : 0
	const grandTotal = preTaxTotal + hstAmt

	// ─── Logo upload ──────────────────────────────────────────────────────
	const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file || !company) return
		if (file.size > MAX_LOGO_BYTES) {
			setLogoError(`Logo too large (max ${(MAX_LOGO_BYTES / 1024).toFixed(0)} KB)`)
			if (fileRef.current) fileRef.current.value = ""
			return
		}
		setLogoError(null)
		const reader = new FileReader()
		reader.onload = () => {
			const result = typeof reader.result === "string" ? reader.result : null
			if (result) setCompany({ ...company, logoBase64: result })
			if (fileRef.current) fileRef.current.value = ""
		}
		reader.onerror = () => setLogoError("Failed to read logo file")
		reader.readAsDataURL(file)
	}

	// ─── Export PDF ───────────────────────────────────────────────────────
	const handleExport = () => {
		if (!company || !fields) return
		const n = consumeNextQuoteNumber()
		setQuoteNumber(n + 1)  // peek for next time
		generateQuotePdf({
			company,
			fields,
			quoteNumber: formatQuoteNumber(n),
			groups,
			totals: {
				subtotal,
				contingencyPct: project.contingencyPct,
				contingencyAmt,
				profitPct: project.profitPct,
				profitAmt,
				preTaxTotal,
				hstEnabled: project.hstEnabled,
				hstRatePct,
				hstAmt,
				grandTotal,
			},
		})
	}

	if (!company || !fields) {
		return <div className="text-sm text-neutral-400 px-2 py-8">Loading…</div>
	}

	const setCompanyField = <K extends keyof CompanyInfo>(k: K, v: CompanyInfo[K]) =>
		setCompany({ ...company, [k]: v })
	const setQuoteField = <K extends keyof QuoteFields>(k: K, v: QuoteFields[K]) =>
		setFields({ ...fields, [k]: v })

	return (
		<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] gap-4 items-start">
			{/* Left: forms */}
			<div className="space-y-4">
				{/* Company info */}
				<div className="rounded-xl border border-neutral-200 bg-white p-5">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-sm font-semibold text-neutral-900">Company Info</h3>
						<span className="text-xs text-neutral-400">Saved to this browser</span>
					</div>
					<div className="space-y-3">
						<TextField label="Company name" value={company.name} onChange={v => setCompanyField("name", v)} placeholder="Kestrel Developments" />
						<TextField label="Phone" value={company.phone} onChange={v => setCompanyField("phone", v)} placeholder="(709) 555-0100" />
						<TextField label="Email" value={company.email} onChange={v => setCompanyField("email", v)} placeholder="info@example.com" />
						<div>
							<span className="text-xs font-medium text-neutral-600">Logo</span>
							<div className="mt-1 flex items-center gap-3">
								{company.logoBase64 ? (
									// next/image doesn't work well with arbitrary base64 data URLs at preview size — a plain img is correct here.
									// eslint-disable-next-line @next/next/no-img-element
									<img src={company.logoBase64} alt="Logo" className="h-12 w-12 object-contain rounded border border-neutral-200 bg-white" />
								) : (
									<div className="h-12 w-12 rounded border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center text-[10px] text-neutral-400">No logo</div>
								)}
								<input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogoChange} />
								<button type="button" onClick={() => fileRef.current?.click()} className="rounded border border-neutral-300 px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-50">
									{company.logoBase64 ? "Replace" : "Upload"}
								</button>
								{company.logoBase64 && (
									<button type="button" onClick={() => setCompanyField("logoBase64", null)} className="text-xs text-neutral-400 hover:text-red-500">Remove</button>
								)}
							</div>
							{logoError && <p className="text-xs text-red-600 mt-1">{logoError}</p>}
							<p className="text-xs text-neutral-400 mt-1">PNG / JPEG / WebP · max 500 KB</p>
						</div>
					</div>
				</div>

				{/* Quote fields */}
				<div className="rounded-xl border border-neutral-200 bg-white p-5">
					<div className="flex items-center justify-between mb-3">
						<h3 className="text-sm font-semibold text-neutral-900">Quote Details</h3>
						<span className="text-xs text-neutral-400">Quote #{formatQuoteNumber(quoteNumber)}</span>
					</div>
					<div className="space-y-3">
						<TextField label="Client name" value={fields.clientName} onChange={v => setQuoteField("clientName", v)} placeholder="John & Jane Smith" />
						<TextField label="Client address" value={fields.clientAddress} onChange={v => setQuoteField("clientAddress", v)} placeholder="123 Main St, St. John's NL" />
						<TextField label="Project address" value={fields.projectAddress} onChange={v => setQuoteField("projectAddress", v)} placeholder="42 Maple Lane, Paradise NL" />
						<div className="grid grid-cols-2 gap-3">
							<TextField type="date" label="Quote date" value={fields.quoteDate} onChange={v => setQuoteField("quoteDate", v)} />
							<TextField type="date" label="Valid until" value={fields.validUntil} onChange={v => setQuoteField("validUntil", v)} />
						</div>
						<div>
							<span className="text-xs font-medium text-neutral-600">Notes & terms</span>
							<textarea
								rows={4}
								value={fields.notes}
								onChange={e => setQuoteField("notes", e.target.value)}
								placeholder="Payment terms, scope notes, assumptions, exclusions…"
								className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none resize-y"
							/>
						</div>
					</div>
				</div>

				{/* Export */}
				<button
					type="button"
					onClick={handleExport}
					disabled={project.measurements.length === 0}
					className="w-full rounded-lg bg-brand-700 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
				>
					Export Quote PDF
				</button>
				{project.measurements.length === 0 && (
					<p className="text-xs text-neutral-500 text-center">
						Add measurements in the Takeoff tab before exporting.
					</p>
				)}
			</div>

			{/* Right: live preview */}
			<QuotePreview
				company={company}
				fields={fields}
				quoteNumber={formatQuoteNumber(quoteNumber)}
				groups={groups}
				subtotal={subtotal}
				contingencyPct={project.contingencyPct}
				contingencyAmt={contingencyAmt}
				profitPct={project.profitPct}
				profitAmt={profitAmt}
				preTaxTotal={preTaxTotal}
				hstEnabled={project.hstEnabled}
				hstRatePct={hstRatePct}
				hstAmt={hstAmt}
				grandTotal={grandTotal}
			/>
		</div>
	)
}

// ─── Preview panel ──────────────────────────────────────────────────────────

function QuotePreview({
	company, fields, quoteNumber, groups,
	subtotal, contingencyPct, contingencyAmt, profitPct, profitAmt,
	preTaxTotal, hstEnabled, hstRatePct, hstAmt, grandTotal,
}: {
	company: CompanyInfo
	fields: QuoteFields
	quoteNumber: string
	groups: QuoteCategoryGroup[]
	subtotal: number
	contingencyPct: number; contingencyAmt: number
	profitPct: number; profitAmt: number
	preTaxTotal: number
	hstEnabled: boolean; hstRatePct: number; hstAmt: number
	grandTotal: number
}) {
	return (
		<div className="rounded-xl border border-neutral-200 bg-white shadow-sm sticky top-4">
			<div className="px-6 py-3 border-b border-neutral-100 bg-neutral-50/60">
				<span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">Live Preview</span>
			</div>
			<div className="p-8 text-neutral-900 max-h-[calc(100vh-12rem)] overflow-auto">
				{/* Header */}
				<div className="flex items-start justify-between pb-4 border-b-2 border-brand-700">
					<div className="flex items-start gap-3">
						{company.logoBase64
							// eslint-disable-next-line @next/next/no-img-element
							? <img src={company.logoBase64} alt="" className="h-14 w-14 object-contain" />
							: null}
						<div>
							<p className="text-lg font-bold text-neutral-900">{company.name || "Company Name"}</p>
							{company.phone && <p className="text-xs text-neutral-500 mt-0.5">{company.phone}</p>}
							{company.email && <p className="text-xs text-neutral-500">{company.email}</p>}
						</div>
					</div>
					<div className="text-right">
						<p className="text-2xl font-bold text-brand-700 tracking-wider">QUOTE</p>
						<div className="text-xs text-neutral-500 mt-1 space-y-0.5">
							<p><span className="text-neutral-400">Quote #</span> <span className="text-neutral-900 font-medium">{quoteNumber}</span></p>
							<p><span className="text-neutral-400">Date</span> <span className="text-neutral-900 font-medium">{fields.quoteDate}</span></p>
							{fields.validUntil && <p><span className="text-neutral-400">Valid until</span> <span className="text-neutral-900 font-medium">{fields.validUntil}</span></p>}
						</div>
					</div>
				</div>

				{/* Bill-to / Project */}
				<div className="grid grid-cols-2 gap-6 mt-5">
					<div>
						<p className="text-[10px] font-bold text-brand-700 uppercase tracking-wide mb-1.5">Bill To</p>
						<p className="text-sm font-medium text-neutral-900">{fields.clientName || <span className="text-neutral-300">Client name</span>}</p>
						{fields.clientAddress && <p className="text-xs text-neutral-600 mt-0.5 whitespace-pre-line">{fields.clientAddress}</p>}
					</div>
					<div>
						<p className="text-[10px] font-bold text-brand-700 uppercase tracking-wide mb-1.5">Project</p>
						<p className="text-sm text-neutral-900 whitespace-pre-line">{fields.projectAddress || <span className="text-neutral-300">Project address</span>}</p>
					</div>
				</div>

				{/* Line items */}
				<div className="mt-6">
					{groups.length === 0 ? (
						<p className="text-xs text-neutral-400 text-center py-8 border border-dashed border-neutral-200 rounded">
							No measurements yet
						</p>
					) : (
						<table className="w-full text-xs">
							<thead>
								<tr className="border-b border-neutral-300 text-[10px] uppercase tracking-wide text-neutral-500">
									<th className="py-1.5 pr-2 text-left font-semibold">Assembly</th>
									<th className="py-1.5 pr-2 text-left font-semibold">Label</th>
									<th className="py-1.5 pr-2 text-right font-semibold">Qty</th>
									<th className="py-1.5 pr-2 text-right font-semibold">Total</th>
								</tr>
							</thead>
							<tbody>
								{groups.map(g => (
									<PreviewCategoryRows key={g.category} group={g} />
								))}
							</tbody>
						</table>
					)}
				</div>

				{/* Totals stack */}
				{groups.length > 0 && (
					<div className="mt-6 ml-auto w-72 space-y-1.5 text-sm">
						<TotalsRow label="Subtotal" value={formatCAD(subtotal)} />
						{contingencyPct > 0 && <TotalsRow muted label={`Contingency (${contingencyPct}%)`} value={formatCAD(contingencyAmt)} />}
						{profitPct > 0 && <TotalsRow muted label={`Profit margin (${profitPct}%)`} value={formatCAD(profitAmt)} />}
						{(contingencyPct > 0 || profitPct > 0) && (
							<>
								<div className="border-t border-neutral-200 my-1" />
								<TotalsRow bold label="Pre-tax total" value={formatCAD(preTaxTotal)} />
							</>
						)}
						{hstEnabled && <TotalsRow muted label={`HST (${hstRatePct.toLocaleString("en-CA", { maximumFractionDigits: 2 })}%)`} value={formatCAD(hstAmt)} />}
						<div className="border-t-2 border-brand-700 my-1.5" />
						<div className="flex items-baseline justify-between text-brand-700">
							<span className="text-sm font-bold uppercase tracking-wide">Project Total</span>
							<span className="text-xl font-bold tabular-nums">{formatCAD(grandTotal)}</span>
						</div>
					</div>
				)}

				{/* Notes */}
				{fields.notes.trim() && (
					<div className="mt-8 pt-4 border-t border-neutral-200">
						<p className="text-[10px] font-bold text-brand-700 uppercase tracking-wide mb-1.5">Notes & Terms</p>
						<p className="text-xs text-neutral-700 whitespace-pre-line leading-relaxed">{fields.notes.trim()}</p>
					</div>
				)}
			</div>
		</div>
	)
}

function PreviewCategoryRows({ group }: { group: QuoteCategoryGroup }) {
	return (
		<>
			<tr>
				<td colSpan={4} className="pt-3 pb-1 pr-2 text-[10px] uppercase tracking-wide font-bold text-neutral-700">
					{group.category}
				</td>
			</tr>
			{group.rows.map(m => (
				<tr key={m.id} className="border-b border-neutral-100">
					<td className="py-1.5 pr-2 text-neutral-700">{m.assemblyName}</td>
					<td className="py-1.5 pr-2 text-neutral-900 font-medium">{m.label}</td>
					<td className="py-1.5 pr-2 text-right tabular-nums text-neutral-600">
						{m.value.toLocaleString("en-CA", { maximumFractionDigits: 2 })} <span className="text-[10px] text-neutral-400">{m.unit}</span>
					</td>
					<td className="py-1.5 pr-2 text-right tabular-nums text-neutral-900 font-semibold">{formatCAD(m.totalCost)}</td>
				</tr>
			))}
			<tr>
				<td colSpan={3} className="pt-1 pb-2 pr-2 text-right text-[10px] italic text-neutral-500">{group.category} subtotal</td>
				<td className="pt-1 pb-2 pr-2 text-right tabular-nums text-xs font-semibold text-neutral-800">{formatCAD(group.total)}</td>
			</tr>
		</>
	)
}

function TotalsRow({ label, value, muted, bold }: { label: string; value: string; muted?: boolean; bold?: boolean }) {
	return (
		<div className="flex items-baseline justify-between">
			<span className={`${muted ? "text-neutral-600" : "text-neutral-800"} ${bold ? "font-semibold" : ""}`}>{label}</span>
			<span className={`tabular-nums ${bold ? "font-semibold text-neutral-900" : muted ? "text-neutral-700" : "text-neutral-900"}`}>{value}</span>
		</div>
	)
}

// ─── Field input ────────────────────────────────────────────────────────────

function TextField({
	label, value, onChange, placeholder, type = "text",
}: {
	label: string
	value: string
	onChange: (v: string) => void
	placeholder?: string
	type?: "text" | "date"
}) {
	return (
		<label className="block">
			<span className="text-xs font-medium text-neutral-600">{label}</span>
			<input
				type={type}
				value={value}
				onChange={e => onChange(e.target.value)}
				placeholder={placeholder}
				className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none"
			/>
		</label>
	)
}
