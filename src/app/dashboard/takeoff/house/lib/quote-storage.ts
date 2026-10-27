// localStorage adapters for the Quote tab. Company info + quote-number counter
// are global (one builder identity per browser); per-project quote fields are
// keyed by project id so reopening a project restores its draft.

export interface CompanyInfo {
	name: string
	phone: string
	email: string
	logoBase64: string | null
}

export interface QuoteFields {
	clientName: string
	clientAddress: string
	projectAddress: string
	quoteDate: string       // YYYY-MM-DD
	validUntil: string      // YYYY-MM-DD
	notes: string
}

const KEY_COMPANY = "takeoff:company-info"
const KEY_QUOTE_NUMBER = "takeoff:quote-number"
const keyQuoteFields = (projectId: string) => `takeoff:quote:${projectId}`

const EMPTY_COMPANY: CompanyInfo = { name: "", phone: "", email: "", logoBase64: null }

export function loadCompanyInfo(): CompanyInfo {
	if (typeof window === "undefined") return EMPTY_COMPANY
	try {
		const raw = localStorage.getItem(KEY_COMPANY)
		if (!raw) return EMPTY_COMPANY
		const parsed = JSON.parse(raw)
		return { ...EMPTY_COMPANY, ...parsed }
	} catch {
		return EMPTY_COMPANY
	}
}

export function saveCompanyInfo(info: CompanyInfo): void {
	if (typeof window === "undefined") return
	try { localStorage.setItem(KEY_COMPANY, JSON.stringify(info)) } catch { /* quota */ }
}

export function loadQuoteFields(projectId: string, defaults: Partial<QuoteFields> = {}): QuoteFields {
	const today = new Date().toISOString().slice(0, 10)
	const empty: QuoteFields = {
		clientName: "",
		clientAddress: "",
		projectAddress: "",
		quoteDate: today,
		validUntil: addDays(today, 30),
		notes: "",
	}
	if (typeof window === "undefined") return { ...empty, ...defaults }
	try {
		const raw = localStorage.getItem(keyQuoteFields(projectId))
		if (!raw) return { ...empty, ...defaults }
		return { ...empty, ...defaults, ...JSON.parse(raw) }
	} catch {
		return { ...empty, ...defaults }
	}
}

export function saveQuoteFields(projectId: string, fields: QuoteFields): void {
	if (typeof window === "undefined") return
	try { localStorage.setItem(keyQuoteFields(projectId), JSON.stringify(fields)) } catch { /* quota */ }
}

/** Peek the next quote number without incrementing. */
export function peekQuoteNumber(): number {
	if (typeof window === "undefined") return 1
	try {
		const raw = localStorage.getItem(KEY_QUOTE_NUMBER)
		const n = raw ? parseInt(raw, 10) : 0
		return (isNaN(n) ? 0 : n) + 1
	} catch {
		return 1
	}
}

/** Increment and return the next quote number — call only when actually exporting. */
export function consumeNextQuoteNumber(): number {
	if (typeof window === "undefined") return 1
	try {
		const raw = localStorage.getItem(KEY_QUOTE_NUMBER)
		const prev = raw ? parseInt(raw, 10) : 0
		const next = (isNaN(prev) ? 0 : prev) + 1
		localStorage.setItem(KEY_QUOTE_NUMBER, String(next))
		return next
	} catch {
		return 1
	}
}

export function formatQuoteNumber(n: number): string {
	return String(n).padStart(4, "0")
}

function addDays(yyyyMmDd: string, days: number): string {
	const d = new Date(yyyyMmDd + "T00:00:00")
	d.setDate(d.getDate() + days)
	return d.toISOString().slice(0, 10)
}
