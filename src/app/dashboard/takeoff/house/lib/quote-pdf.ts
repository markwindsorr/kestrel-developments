import jsPDF from "jspdf"
import type { Measurement } from "@/lib/db/projects"
import type { CompanyInfo, QuoteFields } from "./quote-storage"
import { formatCAD } from "./format"

export interface QuoteCategoryGroup {
	category: string
	rows: Measurement[]
	material: number
	labour: number
	total: number
}

export interface QuoteTotals {
	subtotal: number
	contingencyPct: number
	contingencyAmt: number
	profitPct: number
	profitAmt: number
	preTaxTotal: number
	hstEnabled: boolean
	hstRatePct: number
	hstAmt: number
	grandTotal: number
}

export interface QuotePdfInput {
	company: CompanyInfo
	fields: QuoteFields
	quoteNumber: string  // already padded, e.g. "0042"
	groups: QuoteCategoryGroup[]
	totals: QuoteTotals
}

// Letter (612 × 792 pt)
const PAGE_W = 612
const PAGE_H = 792
const MARGIN = 48
const CONTENT_W = PAGE_W - MARGIN * 2
const FOOTER_Y = PAGE_H - 28

// Brand colors (match the maroon used elsewhere in the app)
const BRAND = "#8b2c2c"
const NEUTRAL_900 = "#171717"
const NEUTRAL_700 = "#404040"
const NEUTRAL_500 = "#737373"
const NEUTRAL_300 = "#d4d4d4"
const NEUTRAL_100 = "#f5f5f5"

export function generateQuotePdf(input: QuotePdfInput): void {
	const { company, fields, quoteNumber, groups, totals } = input
	const doc = new jsPDF({ unit: "pt", format: "letter" })
	let pageNum = 1

	// ─── Header (logo + company info on the left, QUOTE block on the right)
	let y = MARGIN

	// Logo (if any). Image is rendered into a fixed 60×60 box, top-left aligned.
	if (company.logoBase64) {
		try {
			const fmt = sniffImageFormat(company.logoBase64)
			doc.addImage(company.logoBase64, fmt, MARGIN, y, 60, 60, undefined, "FAST")
		} catch {
			// silently skip bad image
		}
	}

	// Company name + contact, to the right of the logo.
	const companyTextX = MARGIN + (company.logoBase64 ? 72 : 0)
	doc.setFont("helvetica", "bold")
	doc.setFontSize(14)
	doc.setTextColor(NEUTRAL_900)
	doc.text(company.name || "Company Name", companyTextX, y + 14)
	doc.setFont("helvetica", "normal")
	doc.setFontSize(9)
	doc.setTextColor(NEUTRAL_500)
	let cy = y + 28
	if (company.phone) { doc.text(company.phone, companyTextX, cy); cy += 11 }
	if (company.email) { doc.text(company.email, companyTextX, cy); cy += 11 }

	// QUOTE label + meta on the right.
	doc.setFont("helvetica", "bold")
	doc.setFontSize(22)
	doc.setTextColor(BRAND)
	doc.text("QUOTE", PAGE_W - MARGIN, y + 18, { align: "right" })
	doc.setFont("helvetica", "normal")
	doc.setFontSize(9)
	doc.setTextColor(NEUTRAL_700)
	let qy = y + 34
	const metaRight = (label: string, value: string) => {
		doc.setTextColor(NEUTRAL_500)
		doc.text(label, PAGE_W - MARGIN - 70, qy)
		doc.setTextColor(NEUTRAL_900)
		doc.text(value, PAGE_W - MARGIN, qy, { align: "right" })
		qy += 12
	}
	metaRight("Quote #", quoteNumber)
	metaRight("Date", fields.quoteDate)
	if (fields.validUntil) metaRight("Valid until", fields.validUntil)

	y = Math.max(y + 72, cy, qy) + 10

	// Divider
	doc.setDrawColor(BRAND)
	doc.setLineWidth(1.5)
	doc.line(MARGIN, y, PAGE_W - MARGIN, y)
	y += 18

	// ─── Bill To / Project blocks
	const colW = CONTENT_W / 2
	doc.setFontSize(9)
	doc.setFont("helvetica", "bold")
	doc.setTextColor(BRAND)
	doc.text("BILL TO", MARGIN, y)
	doc.text("PROJECT", MARGIN + colW, y)
	y += 14
	doc.setFont("helvetica", "normal")
	doc.setFontSize(10)
	doc.setTextColor(NEUTRAL_900)

	const billLines = [fields.clientName, fields.clientAddress].filter(Boolean)
	const projLines = [fields.projectAddress].filter(Boolean)
	const billY = y
	let lineY = y
	for (const l of billLines) {
		const wrapped = doc.splitTextToSize(l, colW - 8) as string[]
		for (const w of wrapped) { doc.text(w, MARGIN, lineY); lineY += 13 }
	}
	const billEndY = lineY
	lineY = billY
	for (const l of projLines) {
		const wrapped = doc.splitTextToSize(l, colW - 8) as string[]
		for (const w of wrapped) { doc.text(w, MARGIN + colW, lineY); lineY += 13 }
	}
	y = Math.max(billEndY, lineY) + 16

	// ─── Line-items table
	// Columns: Assembly | Label | Qty | Unit | Material | Labour | Total
	const colAssemblyX = MARGIN
	const colLabelX = MARGIN + 110
	const colQtyX = MARGIN + 240
	const colUnitX = MARGIN + 290
	const colMatX = MARGIN + 350
	const colLabX = MARGIN + 425
	const colTotX = PAGE_W - MARGIN

	const drawTableHeader = () => {
		doc.setFillColor(NEUTRAL_100)
		doc.rect(MARGIN, y - 11, CONTENT_W, 16, "F")
		doc.setFont("helvetica", "bold")
		doc.setFontSize(8)
		doc.setTextColor(NEUTRAL_500)
		doc.text("ASSEMBLY", colAssemblyX, y)
		doc.text("LABEL", colLabelX, y)
		doc.text("QTY", colQtyX + 30, y, { align: "right" })
		doc.text("UNIT", colUnitX + 30, y, { align: "right" })
		doc.text("MATERIAL", colMatX + 60, y, { align: "right" })
		doc.text("LABOUR", colLabX + 60, y, { align: "right" })
		doc.text("TOTAL", colTotX, y, { align: "right" })
		y += 10
		doc.setDrawColor(NEUTRAL_300)
		doc.setLineWidth(0.5)
		doc.line(MARGIN, y, PAGE_W - MARGIN, y)
		y += 8
	}

	const checkPageBreak = (rowHeight: number) => {
		if (y + rowHeight > FOOTER_Y - 80) {
			drawPageFooter(doc, pageNum)
			doc.addPage()
			pageNum++
			y = MARGIN
			drawTableHeader()
		}
	}

	drawTableHeader()

	for (const g of groups) {
		checkPageBreak(20)
		// Category band
		doc.setFillColor("#fafafa")
		doc.rect(MARGIN, y - 9, CONTENT_W, 14, "F")
		doc.setFont("helvetica", "bold")
		doc.setFontSize(9)
		doc.setTextColor(NEUTRAL_700)
		doc.text(g.category.toUpperCase(), colAssemblyX + 3, y)
		y += 11

		for (const m of g.rows) {
			checkPageBreak(14)
			doc.setFont("helvetica", "normal")
			doc.setFontSize(9)
			doc.setTextColor(NEUTRAL_900)
			drawTruncated(doc, m.assemblyName, colAssemblyX, y, colLabelX - colAssemblyX - 4)
			drawTruncated(doc, m.label, colLabelX, y, colQtyX - colLabelX - 4)
			doc.text(formatQty(m.value), colQtyX + 30, y, { align: "right" })
			doc.setTextColor(NEUTRAL_500)
			doc.text(m.unit, colUnitX + 30, y, { align: "right" })
			doc.setTextColor(NEUTRAL_700)
			doc.text(formatCAD(m.materialCost), colMatX + 60, y, { align: "right" })
			doc.text(formatCAD(m.labourCost), colLabX + 60, y, { align: "right" })
			doc.setTextColor(NEUTRAL_900)
			doc.setFont("helvetica", "bold")
			doc.text(formatCAD(m.totalCost), colTotX, y, { align: "right" })
			y += 13
		}

		// Category subtotal
		checkPageBreak(16)
		doc.setDrawColor(NEUTRAL_300)
		doc.setLineWidth(0.3)
		doc.line(MARGIN, y - 2, PAGE_W - MARGIN, y - 2)
		y += 4
		doc.setFont("helvetica", "italic")
		doc.setFontSize(8)
		doc.setTextColor(NEUTRAL_500)
		doc.text(`${g.category} subtotal`, colLabX, y, { align: "right" })
		doc.setFont("helvetica", "bold")
		doc.setTextColor(NEUTRAL_700)
		doc.text(formatCAD(g.total), colTotX, y, { align: "right" })
		y += 12
	}

	// ─── Totals stack (right-aligned)
	checkPageBreak(120)
	y += 6
	doc.setDrawColor(NEUTRAL_900)
	doc.setLineWidth(0.8)
	doc.line(MARGIN + 320, y, PAGE_W - MARGIN, y)
	y += 14

	const drawTotalRow = (label: string, value: string, opts: { bold?: boolean; brand?: boolean; large?: boolean } = {}) => {
		doc.setFont("helvetica", opts.bold ? "bold" : "normal")
		doc.setFontSize(opts.large ? 13 : 10)
		doc.setTextColor(opts.brand ? BRAND : NEUTRAL_700)
		doc.text(label, MARGIN + 330, y)
		doc.setTextColor(opts.brand ? BRAND : NEUTRAL_900)
		doc.text(value, PAGE_W - MARGIN, y, { align: "right" })
		y += opts.large ? 22 : 14
	}

	drawTotalRow("Subtotal", formatCAD(totals.subtotal))
	if (totals.contingencyPct > 0) drawTotalRow(`Contingency (${formatPct(totals.contingencyPct)}%)`, formatCAD(totals.contingencyAmt))
	if (totals.profitPct > 0) drawTotalRow(`Profit margin (${formatPct(totals.profitPct)}%)`, formatCAD(totals.profitAmt))
	if (totals.contingencyPct > 0 || totals.profitPct > 0) {
		doc.setDrawColor(NEUTRAL_300)
		doc.line(MARGIN + 330, y - 6, PAGE_W - MARGIN, y - 6)
		drawTotalRow("Pre-tax total", formatCAD(totals.preTaxTotal), { bold: true })
	}
	if (totals.hstEnabled) drawTotalRow(`HST (${formatPct(totals.hstRatePct)}%)`, formatCAD(totals.hstAmt))
	y += 4
	doc.setDrawColor(BRAND)
	doc.setLineWidth(1)
	doc.line(MARGIN + 330, y - 8, PAGE_W - MARGIN, y - 8)
	drawTotalRow("PROJECT TOTAL", formatCAD(totals.grandTotal), { bold: true, brand: true, large: true })

	// ─── Notes / terms
	if (fields.notes.trim()) {
		checkPageBreak(60)
		y += 12
		doc.setFont("helvetica", "bold")
		doc.setFontSize(9)
		doc.setTextColor(BRAND)
		doc.text("NOTES & TERMS", MARGIN, y)
		y += 12
		doc.setFont("helvetica", "normal")
		doc.setFontSize(9)
		doc.setTextColor(NEUTRAL_700)
		const lines = doc.splitTextToSize(fields.notes.trim(), CONTENT_W) as string[]
		for (const line of lines) {
			checkPageBreak(12)
			doc.text(line, MARGIN, y)
			y += 12
		}
	}

	drawPageFooter(doc, pageNum)

	const filename = buildFilename(quoteNumber, fields.clientAddress || fields.clientName, fields.quoteDate)
	doc.save(filename)
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function drawPageFooter(doc: jsPDF, pageNum: number) {
	doc.setFont("helvetica", "normal")
	doc.setFontSize(8)
	doc.setTextColor(NEUTRAL_500)
	doc.text(`Page ${pageNum}`, PAGE_W - MARGIN, FOOTER_Y, { align: "right" })
}

function drawTruncated(doc: jsPDF, text: string, x: number, y: number, maxWidth: number) {
	let s = text
	while (doc.getTextWidth(s) > maxWidth && s.length > 1) s = s.slice(0, -1)
	if (s !== text) s = s.slice(0, Math.max(1, s.length - 1)) + "…"
	doc.text(s, x, y)
}

function formatQty(n: number): string {
	// Integer for whole counts, two decimals otherwise.
	if (Number.isInteger(n)) return n.toLocaleString("en-CA")
	return n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatPct(n: number): string {
	return n.toLocaleString("en-CA", { maximumFractionDigits: 2 })
}

// "image/png;base64,..." → "PNG"; defaults to PNG if unknown.
function sniffImageFormat(dataUrl: string): "PNG" | "JPEG" | "WEBP" {
	const m = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp)/i)
	const t = m?.[1]?.toLowerCase()
	if (t === "jpeg" || t === "jpg") return "JPEG"
	if (t === "webp") return "WEBP"
	return "PNG"
}

function buildFilename(quoteNumber: string, ref: string, date: string): string {
	const sanitize = (s: string) => s.replace(/[\/\\:*?"<>|]+/g, "").replace(/\s+/g, " ").trim().slice(0, 60) || "Quote"
	return `${quoteNumber}_${sanitize(ref)}_${date}.pdf`
}
