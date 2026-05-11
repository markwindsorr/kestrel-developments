"use client"

import { useState, useMemo } from "react"
import { cn } from "@/lib/utils"
import {
	COST, WORKING_DAYS, HRS_DAY,
	fd, fp, afterTax, computeOHR, computeWorkload, computeCapacity, computeCapScenario,
} from "@/lib/electrical-calc"

// ─── UI Atoms ────────────────────────────────────────────────────────────────

type Color = "blue" | "green" | "amber" | "red" | "purple"

const statBg: Record<Color, string> = {
	blue:   "bg-blue-50   border-blue-200   text-blue-600",
	green:  "bg-green-50  border-green-200  text-green-600",
	amber:  "bg-amber-50  border-amber-200  text-amber-600",
	red:    "bg-red-50    border-red-200    text-red-600",
	purple: "bg-purple-50 border-purple-200 text-purple-600",
}

function Stat({ label, value, sub, c }: { label: string; value: string; sub?: string; c?: Color }) {
	return (
		<div className={cn("rounded-lg border p-3.5", c ? statBg[c] : "bg-white border-neutral-200")}>
			<div className="text-[10px] font-semibold uppercase tracking-wider mb-1">{label}</div>
			<div className="text-[22px] font-bold tracking-tight leading-none">{value}</div>
			{sub && <div className="text-[11px] text-neutral-1000 mt-1">{sub}</div>}
		</div>
	)
}

function SCard({ children, hi, className }: { children: React.ReactNode; hi?: boolean; className?: string }) {
	return (
		<div className={cn("rounded-xl border p-4 mb-3.5", hi ? "bg-blue-50 border-blue-200" : "bg-white border-neutral-200", className)}>
			{children}
		</div>
	)
}

function SCardTitle({ children }: { children: React.ReactNode }) {
	return <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-600 mb-3">{children}</div>
}

function TRow({ label, value, total, color }: { label: string; value: string; total?: boolean; color?: string }) {
	return (
		<div className={cn("flex justify-between items-center text-sm py-1.5 border-b border-neutral-100 last:border-0", total && "py-2.5 mt-1 border-t-2 border-t-neutral-300 border-b-0 font-bold text-[15px]")}>
			<span className={total ? "text-neutral-900" : "text-neutral-700"}>{label}</span>
			<span className={total ? "font-bold" : "font-semibold"} style={color ? { color } : {}}>{value}</span>
		</div>
	)
}

function Divider({ label }: { label: string }) {
	return (
		<div className="flex items-center gap-3 my-6">
			<div className="flex-1 h-px bg-neutral-200" />
			<div className="text-[11px] font-bold uppercase tracking-widest text-neutral-600 whitespace-nowrap">{label}</div>
			<div className="flex-1 h-px bg-neutral-200" />
		</div>
	)
}

function NumIn({ label, value, min, max, step = 1, unit, onChange }: {
	label: string; value: number; min?: number; max?: number; step?: number; unit?: string;
	onChange: (v: number) => void
}) {
	return (
		<div className="flex items-center gap-2 mb-2">
			<label className="flex-1 text-sm text-neutral-800">{label}</label>
			<input
				type="number" value={value} min={min} max={max} step={step}
				onChange={e => onChange(parseFloat(e.target.value) || 0)}
				className="w-24 text-right text-sm px-2 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-900 focus:outline-none focus:border-blue-500 focus:bg-white"
			/>
			{unit && <span className="text-xs text-neutral-600 w-8 shrink-0">{unit}</span>}
		</div>
	)
}

function TxtIn({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
	return (
		<div className="flex items-center gap-2 mb-2">
			<label className="flex-1 text-sm text-neutral-800">{label}</label>
			<input
				type="text" value={value}
				onChange={e => onChange(e.target.value)}
				className="w-48 text-sm px-2 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 text-neutral-900 focus:outline-none focus:border-blue-500 focus:bg-white"
			/>
		</div>
	)
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<div className="flex items-center gap-3 mb-2">
			<span className="flex-1 text-sm text-neutral-800">{label}</span>
			<button
				type="button"
				onClick={() => onChange(!checked)}
				className={cn("relative w-10 h-5 rounded-full transition-colors", checked ? "bg-blue-600" : "bg-neutral-300")}
			>
				<span className={cn("absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform", checked ? "left-5" : "left-0.5")} />
			</button>
		</div>
	)
}

function Verdict({ margin }: { margin: number }) {
	if (margin >= 25) return <div className="mt-3 p-2.5 rounded-lg bg-green-50 text-green-700 text-sm font-semibold">Strong — {fp(margin)} margin. Quote with confidence.</div>
	if (margin >= 15) return <div className="mt-3 p-2.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold">Acceptable — {fp(margin)} margin. Consider pushing rate.</div>
	if (margin >= 0)  return <div className="mt-3 p-2.5 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold">Thin — {fp(margin)} margin. Watch scope creep.</div>
	return <div className="mt-3 p-2.5 rounded-lg bg-red-50 text-red-700 text-sm font-semibold">Losing money at this rate. Do not proceed.</div>
}

function ResMetric({ label, value, c }: { label: string; value: string; c?: "good" | "warn" | "bad" | "neu" | "purple" }) {
	const cls = {
		good:   "bg-green-50  border-green-200  text-green-700",
		warn:   "bg-amber-50  border-amber-200  text-amber-700",
		bad:    "bg-red-50    border-red-200    text-red-700",
		neu:    "bg-neutral-100 border-neutral-200 text-neutral-900",
		purple: "bg-purple-50 border-purple-200 text-purple-700",
	}
	return (
		<div className={cn("rounded-lg border p-2.5", c ? cls[c] : "bg-white border-neutral-200")}>
			<div className="text-[10px] font-semibold mb-1 text-current opacity-75">{label}</div>
			<div className="text-lg font-bold">{value}</div>
		</div>
	)
}

// ─── Types ───────────────────────────────────────────────────────────────────

type PanelId = "guide" | "calc" | "capacity" | "hst" | "quote" | "payroll" | "pl"
type CalcTab = "con" | "svc" | "mat"

interface QuoteInit { labour: number; materials: number; fees: number; scope: string; type: string }

// ─── Panel: Pricing Guide ─────────────────────────────────────────────────────

function PricingGuide({
	houses, svcDays, onWorkloadChange, onLoadCon, onLoadSvc,
}: {
	houses: number; svcDays: number;
	onWorkloadChange: (h: number, s: number) => void;
	onLoadCon: (rate: number) => void;
	onLoadSvc: (rate: number, ah: boolean) => void;
}) {
	const wl = useMemo(() => computeWorkload(houses, svcDays), [houses, svcDays])
	const [floorHouses, setFloorHouses] = useState(houses)

	const floorWL = useMemo(() => computeWorkload(floorHouses, 0), [floorHouses])
	const svcMHAvail = floorWL.mhAvail
	const svcDaysAvail = floorWL.maxSvcDays
	const svcProfit95 = svcMHAvail * 95 + floorHouses * 100 * 120 - COST
	const svcMargin95 = (svcMHAvail * 95 + floorHouses * 100 * 120) > 0
		? (svcProfit95 / (svcMHAvail * 95 + floorHouses * 100 * 120)) * 100 : 0
	const afterTaxSvc95 = afterTax(Math.max(0, svcProfit95))

	const handleHouseSlider = (v: number) => {
		const maxSvc = computeWorkload(v, svcDays).maxSvcDays
		onWorkloadChange(v, Math.min(svcDays, maxSvc))
	}
	const handleSvcSlider = (v: number) => {
		onWorkloadChange(houses, Math.min(v, wl.maxSvcDays))
	}

	const ohr = wl.ohr

	return (
		<div>
			{/* Workload control */}
			<SCard hi>
				<SCardTitle>Annual workload — adjust to update all metrics below</SCardTitle>
				<div className="grid grid-cols-2 gap-4 mb-3">
					<div>
						<div className="text-[11px] text-blue-700 font-semibold uppercase tracking-wide mb-2">Houses per year</div>
						<div className="flex items-center gap-3">
							<input type="range" min={0} max={25} value={houses} step={1}
								onChange={e => handleHouseSlider(parseInt(e.target.value))}
								className="flex-1 accent-blue-600 h-1.5 rounded" />
							<span className="text-[22px] font-black text-blue-600 min-w-[40px] text-right">{houses}</span>
							<span className="text-sm text-neutral-500">houses</span>
						</div>
						<div className="text-xs text-neutral-500 mt-1">
							{wl.houseDays} of {WORKING_DAYS} working days ({Math.round(wl.hPct)}% of year)
							{wl.overCap && <span className="text-amber-600 font-semibold"> — Over capacity! Needs OT or 3rd employee.</span>}
						</div>
					</div>
					<div>
						<div className="flex justify-between items-center mb-2">
							<span className="text-[11px] text-blue-700 font-semibold uppercase tracking-wide">Service days per year</span>
							<span className={cn("text-[11px] font-bold px-2 py-0.5 rounded-full", wl.maxSvcDays === 0 ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600")}>
								{wl.maxSvcDays} days available
							</span>
						</div>
						<div className="flex items-center gap-3">
							<input type="range" min={0} max={wl.maxSvcDays} value={svcDays} step={1}
								onChange={e => handleSvcSlider(parseInt(e.target.value))}
								className="flex-1 accent-blue-600 h-1.5 rounded" />
							<span className="text-[22px] font-black text-blue-600 min-w-[40px] text-right">{svcDays}</span>
							<span className="text-sm text-neutral-500">days</span>
						</div>
						<div className="text-xs text-neutral-500 mt-1">
							{svcDays} of {wl.maxSvcDays} available days used
						</div>
					</div>
				</div>
				{/* Capacity bar */}
				<div>
					<div className="flex justify-between text-xs text-neutral-500 mb-1">
						<span>Annual capacity usage</span>
						<span>{Math.round(wl.hPct + wl.sPct)}% utilized</span>
					</div>
					<div className="h-2.5 rounded-full overflow-hidden flex bg-neutral-100">
						<div className="bg-blue-600 h-full transition-all" style={{ width: `${wl.hPct}%` }} />
						<div className="bg-green-500 h-full transition-all" style={{ width: `${wl.sPct}%` }} />
					</div>
					<div className="flex gap-3 mt-1.5 text-[11px] text-neutral-500">
						<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-600 inline-block" />Houses</span>
						<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />Service</span>
						<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neutral-200 inline-block" />Available</span>
					</div>
				</div>
			</SCard>

			{/* Key metrics */}
			<div className="grid grid-cols-5 gap-2.5 mb-5">
				<Stat label="Total cost base" value="$163,163" sub="Fixed — no owner salary" c="blue" />
				<Stat label="Cost per billable hr" value={`$${ohr.toFixed(2)}`} sub={`${Math.round(wl.houseDays * HRS_DAY * 2 + svcDays * HRS_DAY).toLocaleString("en-CA")} man-hrs`} />
				<Stat label="Annual profit" value={fd(wl.profit)} sub={`${houses}h + ${svcDays}d | ${Math.round(wl.margin)}% margin`} c={wl.profit >= 0 ? "green" : "red"} />
				<Stat label="After-tax profit" value={fd(wl.afterTaxProfit)} sub="Corp rate 12.2%" c="purple" />
				<Stat label="Break-even rate" value={wl.breakeven > 0 ? `$${wl.breakeven.toFixed(2)}/hr` : "N/A"} sub="Collective — never go below" c="amber" />
			</div>

			{/* Cost base */}
			<SCardTitle>Verified cost base — owner salary excluded</SCardTitle>
			<div className="grid grid-cols-2 gap-3.5 mb-1">
				<SCard>
					<SCardTitle>Labour</SCardTitle>
					<TRow label="Employee 1 — $35/hr × 2,080hrs" value="$72,800" />
					<TRow label="Burden (vac 4%, WCB 1.48%, CPP 5.95%, EI 2.21%)" value="$9,930" />
					<TRow label="Employee 2 — $22/hr × 2,080hrs" value="$45,760" />
					<TRow label="Burden (13.64%)" value="$6,241" />
					<TRow label="Total labour cost" value="$134,731" total />
				</SCard>
				<SCard>
					<SCardTitle>Fixed overhead</SCardTitle>
					<TRow label="Vehicle allowance (foreman $1,000/mo)" value="$12,000" />
					<TRow label="GL insurance (ex HST)" value="$1,196" />
					<TRow label="Sage + Wagepoint" value="$1,367" />
					<TRow label="WCB assessments" value="$1,350" />
					<TRow label="Phone, tools, PPE, accounting, misc" value="$12,500" />
					<TRow label="Total fixed overhead" value="$28,413" total />
				</SCard>
			</div>

			<Divider label="Section 1 — New construction (labour only)" />
			<SCard className="bg-neutral-50">
				<div className="grid grid-cols-4 gap-4">
					<div><div className="text-xs text-neutral-700 font-medium">Houses/year</div><div className="text-lg font-bold">{houses}</div></div>
					<div><div className="text-xs text-neutral-700 font-medium">Days/house</div><div className="text-lg font-bold">12.5</div></div>
					<div><div className="text-xs text-neutral-700 font-medium">Collective hrs/house</div><div className="text-lg font-bold">100 hrs</div></div>
					<div><div className="text-xs text-neutral-700 font-medium">Break-even</div><div className="text-lg font-bold text-red-600">${wl.breakeven > 0 ? wl.breakeven.toFixed(2) : "—"}/hr</div></div>
				</div>
			</SCard>
			<p className="text-xs text-blue-600 font-semibold mb-2">Click any card to load into the Job Calculator</p>
			<div className="grid grid-cols-5 gap-2.5 mb-3.5">
				{([
					{ badge: "Floor", rate: "$86/hr", sub: "Collective — $43/man", info: "Break-even. Never quote below this.", r: 86, c: "red" },
					{ badge: "25% margin", rate: "$115/hr", sub: "Collective — $57/man", info: "Profit $54,624/yr", r: 115, c: "amber" },
					{ badge: "Current — 28.4%", rate: "$120/hr", sub: "Collective — $60/man", info: "Profit $64,837/yr", r: 120, c: "blue" },
					{ badge: "30% margin", rate: "$123/hr", sub: "Collective — $61/man", info: "Profit $70,100/yr", r: 123, c: "green" },
					{ badge: "Stretch", rate: "$130/hr", sub: "Collective — $65/man", info: "Profit $83,837/yr", r: 130, c: "green" },
				] as { badge: string; rate: string; sub: string; info: string; r: number; c: Color }[]).map(card => (
					<div key={card.r} onClick={() => onLoadCon(card.r)}
						className="rounded-xl border border-neutral-200 p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
						<div className={cn("inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2", statBg[card.c])}>{card.badge}</div>
						<div className="text-[26px] font-black tracking-tight">{card.rate}</div>
						<div className="text-xs text-neutral-700">{card.sub}</div>
						<div className="text-xs mt-2 pt-2 border-t border-neutral-100" style={{ color: card.c === "red" ? "#dc2626" : "#16a34a" }}>{card.info}</div>
					</div>
				))}
			</div>
			<SCard>
				<div className="grid grid-cols-4 gap-4">
					<TRow label="Per house revenue" value="$12,000" />
					<TRow label="Per house cost" value="$8,587" />
					<TRow label="Per house profit" value="$3,413" color="#16a34a" />
					<TRow label="Annual margin" value="28.4%" color="#16a34a" />
				</div>
			</SCard>

			<Divider label="Section 2 — Service & renovation" />
			<SCard className="bg-neutral-50 mb-3">
				<div className="grid grid-cols-4 gap-4">
					<div><div className="text-xs text-neutral-700 font-medium">Min call-out every job</div><div className="text-lg font-bold">$150–$200</div></div>
					<div><div className="text-xs text-neutral-700 font-medium">After hours multiplier</div><div className="text-lg font-bold">1.5×</div></div>
					<div><div className="text-xs text-neutral-700 font-medium">Materials markup</div><div className="text-lg font-bold">20%</div></div>
					<div><div className="text-xs text-neutral-700 font-medium">True cost per man-hr</div><div className="text-lg font-bold">$39.22</div></div>
				</div>
			</SCard>
			{/* Service rate planner */}
			<SCard hi>
				<SCardTitle>Service rate planner — adjust house count to see your service picture</SCardTitle>
				<div className="mb-3">
					<div className="flex items-center gap-3">
						<input type="range" min={0} max={25} value={floorHouses} step={1}
							onChange={e => setFloorHouses(parseInt(e.target.value))}
							className="flex-1 accent-blue-600 h-1.5" />
						<span className="text-[22px] font-black text-blue-600 min-w-[40px] text-right">{floorHouses}</span>
						<span className="text-sm text-neutral-500">houses</span>
					</div>
				</div>
				<div className="grid grid-cols-4 gap-2.5 mb-3">
					<div className="bg-white rounded-lg p-3 border border-neutral-200">
						<div className="text-[11px] text-neutral-700 uppercase tracking-wide mb-1">True floor</div>
						<div className="text-[22px] font-black text-red-600">$40/hr</div>
						<div className="text-[11px] text-neutral-500">Always — never go below</div>
					</div>
					<div className="bg-white rounded-lg p-3 border border-neutral-200">
						<div className="text-[11px] text-neutral-700 uppercase tracking-wide mb-1">Service days available</div>
						<div className="text-[22px] font-black text-blue-600">{svcDaysAvail} days</div>
						<div className="text-[11px] text-neutral-500">{Math.round(svcMHAvail).toLocaleString("en-CA")} man-hrs</div>
					</div>
					<div className="bg-white rounded-lg p-3 border border-neutral-200">
						<div className="text-[11px] text-neutral-700 uppercase tracking-wide mb-1">Profit @ $95/hr service</div>
						<div className="text-[22px] font-black" style={{ color: svcProfit95 >= 0 ? "#16a34a" : "#dc2626" }}>{fd(svcProfit95)}</div>
						<div className="text-[11px] text-neutral-500">{Math.round(svcMargin95)}% margin</div>
					</div>
					<div className="bg-white rounded-lg p-3 border border-neutral-200">
						<div className="text-[11px] text-neutral-700 uppercase tracking-wide mb-1">After-tax @ $95/hr</div>
						<div className="text-[22px] font-black text-purple-600">{fd(afterTaxSvc95)}</div>
						<div className="text-[11px] text-neutral-500">Corp rate 12.2%</div>
					</div>
				</div>
			</SCard>
			<p className="text-xs text-blue-600 font-semibold mb-2">Click any card to load into the Job Calculator</p>
			<div className="grid grid-cols-5 gap-2.5">
				{([
					{ badge: "Standard", rate: "$85/hr", sub: "Per man", info: "53.8% labour margin", r: 85, ah: false, c: "amber" },
					{ badge: "Target", rate: "$95/hr", sub: "Per man", info: "58.7% labour margin", r: 95, ah: false, c: "blue" },
					{ badge: "Strong", rate: "$100/hr", sub: "Per man", info: "60.8% labour margin", r: 100, ah: false, c: "green" },
					{ badge: "After hours", rate: "$143/hr", sub: "Per man (1.5× of $95)", info: "72.6% labour margin", r: 95, ah: true, c: "green" },
				] as { badge: string; rate: string; sub: string; info: string; r: number; ah: boolean; c: Color }[]).map((card, i) => (
					<div key={i} onClick={() => onLoadSvc(card.r, card.ah)}
						className="rounded-xl border border-neutral-200 p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
						<div className={cn("inline-block text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider mb-2", statBg[card.c])}>{card.badge}</div>
						<div className="text-[26px] font-black tracking-tight">{card.rate}</div>
						<div className="text-xs text-neutral-700">{card.sub}</div>
						<div className="text-xs mt-2 pt-2 border-t border-neutral-100 text-green-600">{card.info}</div>
					</div>
				))}
			</div>

			<Divider label="Section 3 — New construction with materials" />
			<div className="grid grid-cols-2 gap-3.5 mb-4">
				<SCard>
					<SCardTitle>Per house — $6,000 materials @ 20%</SCardTitle>
					<TRow label="Labour (100hrs × $120)" value="$12,000" />
					<TRow label="Materials cost to you" value="$6,000" />
					<TRow label="Materials billed (20% markup)" value="$7,200" />
					<TRow label="Invoice per house" value="$19,200" total />
					<TRow label="Profit per house" value="$4,613" total color="#16a34a" />
				</SCard>
				<SCard hi>
					<SCardTitle>Annual — 19 houses with materials</SCardTitle>
					<TRow label="Labour revenue" value="$228,000" />
					<TRow label="Materials revenue" value="$136,800" />
					<TRow label="Total revenue" value="$364,800" total />
					<TRow label="All costs (base + materials)" value="$277,163" />
					<TRow label="Profit — 24.0%" value="$87,637" total color="#16a34a" />
					<TRow label="After-tax profit (12.2%)" value="$76,943" total color="#16a34a" />
				</SCard>
			</div>

			<Divider label="Full potential — all three revenue streams" />
			<SCard hi>
				<TRow label="House labour (19 × $12,000)" value="$228,000" />
				<TRow label="Materials markup (19 houses, $6K @ 20%)" value="$22,800" />
				<TRow label="Service work (360 remaining paid hrs @ $95/man)" value="$34,200" />
				<TRow label="Service call-outs (est. 45 × $150)" value="$6,750" />
				<TRow label="Total revenue" value="$291,750" total />
				<TRow label="Cost base + materials" value="$277,163" />
				<TRow label="Profit — 39.3%" value="$114,587" total color="#16a34a" />
				<TRow label="After-tax profit (corp 12.2%)" value="$100,627" total color="#16a34a" />
			</SCard>

			<Divider label="Quick reference" />
			<div className="grid grid-cols-4 gap-2.5">
				{[
					{ label: "Construction floor", value: "$86/hr collective", note: "$43/man — absolute min" },
					{ label: "Construction target", value: "$120/hr collective", note: "$60/man — hold this" },
					{ label: "Service floor", value: "$40/hr", note: "True cost — always", hi: true },
					{ label: "Service target", value: "$95–$100/hr man", note: "Standard residential" },
					{ label: "After hours", value: "$143/hr per man", note: "1.5× of $95 base" },
					{ label: "Call-out minimum", value: "$150–$200", note: "Every job — recommend $200" },
					{ label: "Materials markup", value: "20% on cost", note: "15% min large orders" },
					{ label: "Labour burden", value: "13.64%", note: "Vac+WCB+CPP+EI" },
				].map(r => (
					<div key={r.label} className={cn("rounded-lg border p-3", r.hi ? "bg-blue-50 border-blue-200" : "bg-white border-neutral-200")}>
						<div className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 mb-1">{r.label}</div>
						<div className="text-[15px] font-bold">{r.value}</div>
						<div className="text-[11px] text-neutral-500 mt-0.5">{r.note}</div>
					</div>
				))}
			</div>
		</div>
	)
}

// ─── Panel: Job Calculator ────────────────────────────────────────────────────

function JobCalculator({
	ohr, initTab, initRate, initAH, onSendToQuote,
}: {
	ohr: number; initTab?: CalcTab; initRate?: number; initAH?: boolean;
	onSendToQuote: (q: QuoteInit) => void;
}) {
	const [tab, setTab] = useState<CalcTab>(initTab ?? "con")

	// New construction
	const [roughIn, setRoughIn] = useState(10)
	const [finish, setFinish] = useState(2.5)
	const [hpd, setHpd] = useState(8)
	const [men, setMen] = useState(2)
	const [conRate, setConRate] = useState(initRate ?? 120)

	// Service
	const [fHrs, setFHrs] = useState(3)
	const [fRt, setFRt] = useState(initRate ?? 95)
	const [appOn, setAppOn] = useState(true)
	const [aHrs, setAHrs] = useState(3)
	const [aRt, setARt] = useState(70)
	const [callout, setCallout] = useState(200)
	const [afterHours, setAfterHours] = useState(initAH ?? false)
	const [sMC, setSMC] = useState(0)
	const [sMK, setSMK] = useState(20)

	// Materials
	const [mFHrs, setMFHrs] = useState(100)
	const [mFRt, setMFRt] = useState(60)
	const [mAppOn, setMAppOn] = useState(true)
	const [mAHrs, setMAHrs] = useState(100)
	const [mARt, setMARt] = useState(46)
	const [mCallout, setMCallout] = useState(0)
	const [mMC, setMMC] = useState(6000)
	const [mMK, setMMK] = useState(20)

	// Calculations
	const conResult = useMemo(() => {
		const days = roughIn + finish
		const collHrs = days * hpd
		const manHrs = collHrs * men
		const rev = collHrs * conRate
		const cost = manHrs * ohr
		const profit = rev - cost
		const margin = rev > 0 ? (profit / rev) * 100 : 0
		return { days, collHrs, manHrs, rev, cost, profit, margin }
	}, [roughIn, finish, hpd, men, conRate, ohr])

	const svcResult = useMemo(() => {
		const mult = afterHours ? 1.5 : 1
		const fRev = fHrs * fRt * mult
		const aRev = appOn ? aHrs * aRt * mult : 0
		const fCost = fHrs * 39.77
		const aCost = appOn ? aHrs * 25 : 0
		const matRev = sMC > 0 ? sMC * (1 + sMK / 100) : 0
		const total = fRev + aRev + callout + matRev
		const cost = fCost + aCost + sMC
		const profit = total - cost
		const margin = total > 0 ? (profit / total) * 100 : 0
		return { fRev, aRev, matRev, total, cost, profit, margin, mult }
	}, [fHrs, fRt, appOn, aHrs, aRt, callout, afterHours, sMC, sMK])

	const matResult = useMemo(() => {
		const fRev = mFHrs * mFRt
		const aRev = mAppOn ? mAHrs * mARt : 0
		const fCost = mFHrs * 39.77
		const aCost = mAppOn ? mAHrs * 25 : 0
		const matRev = mMC * (1 + mMK / 100)
		const total = fRev + aRev + mCallout + matRev
		const cost = fCost + aCost + mMC
		const profit = total - cost
		const margin = total > 0 ? (profit / total) * 100 : 0
		return { fRev, aRev, matRev, total, cost, profit, margin }
	}, [mFHrs, mFRt, mAppOn, mAHrs, mARt, mCallout, mMC, mMK])

	const margCls = (m: number) => m >= 25 ? "good" : m >= 0 ? "warn" : "bad"

	const tabs: { id: CalcTab; label: string }[] = [
		{ id: "con", label: "New Construction" },
		{ id: "svc", label: "Service / Reno" },
		{ id: "mat", label: "New Construction + Materials" },
	]

	return (
		<div>
			<div className="bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3 mb-4 text-sm text-neutral-500">
				Margins calculated using workload: <span className="font-semibold text-neutral-900">OHR = ${ohr.toFixed(2)}/hr</span>
			</div>
			{/* Tabs */}
			<div className="flex gap-1 bg-neutral-100 rounded-xl p-1 mb-4">
				{tabs.map(t => (
					<button key={t.id} onClick={() => setTab(t.id)}
						className={cn("flex-1 py-2 px-3 text-sm font-semibold rounded-lg transition-colors",
							tab === t.id ? "bg-blue-600 text-white" : "text-neutral-500 hover:bg-neutral-200")}>
						{t.label}
					</button>
				))}
			</div>

			{tab === "con" && (
				<div className="grid grid-cols-2 gap-4">
					<SCard>
						<SCardTitle>Job details</SCardTitle>
						<NumIn label="Rough-in days" value={roughIn} min={1} step={0.5} unit="days" onChange={setRoughIn} />
						<NumIn label="Finish days" value={finish} min={0} step={0.5} unit="days" onChange={setFinish} />
						<NumIn label="Hours per day" value={hpd} min={1} unit="hrs" onChange={setHpd} />
						<NumIn label="Men on site" value={men} min={1} unit="men" onChange={setMen} />
						<NumIn label="Collective rate" value={conRate} min={1} unit="$/hr" onChange={setConRate} />
					</SCard>
					<div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
						<div className="grid grid-cols-2 gap-2 mb-3">
							<ResMetric label="Invoice total" value={fd(conResult.rev)} c={margCls(conResult.margin)} />
							<ResMetric label="Pre-tax profit" value={fd(conResult.profit)} c={margCls(conResult.margin)} />
							<ResMetric label="Margin" value={fp(conResult.margin)} c={margCls(conResult.margin)} />
							<ResMetric label="After-tax profit" value={fd(afterTax(Math.max(0, conResult.profit)))} c="purple" />
						</div>
						<TRow label={`Man-hours (${Math.round(conResult.manHrs)} hrs × $${ohr.toFixed(2)})`} value={fd(conResult.cost)} />
						<TRow label="Collective billing hrs" value={`${Math.round(conResult.collHrs)} hrs`} />
						<TRow label="Rate per man" value={`${fd(men > 0 ? conRate / men : 0)}/hr`} />
						<TRow label="Invoice total" value={fd(conResult.rev)} total />
						<Verdict margin={conResult.margin} />
						<button onClick={() => onSendToQuote({ labour: Math.round(conResult.rev), materials: 0, fees: 0, type: "New construction — labour only", scope: `Rough-in (${roughIn} days) and finish (${finish} days) electrical for new residential construction.` })}
							className="mt-3 w-full py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
							Send to Quote Builder →
						</button>
					</div>
				</div>
			)}

			{tab === "svc" && (
				<div className="grid grid-cols-2 gap-4">
					<div>
						<SCard>
							<SCardTitle>Labour</SCardTitle>
							<div className="bg-neutral-50 rounded-lg p-3 mb-2">
								<div className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide mb-2">Foreman</div>
								<NumIn label="Hours on site" value={fHrs} min={0} step={0.5} unit="hrs" onChange={setFHrs} />
								<NumIn label="Rate" value={fRt} min={1} unit="$/hr" onChange={setFRt} />
							</div>
							<div className="bg-neutral-50 rounded-lg p-3 mb-2">
								<div className="flex justify-between items-center mb-2">
									<span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">Apprentice</span>
									<label className="flex items-center gap-1.5 text-xs cursor-pointer">
										<input type="checkbox" checked={appOn} onChange={e => setAppOn(e.target.checked)} className="w-3.5 h-3.5" /> On this job
									</label>
								</div>
								{appOn && <>
									<NumIn label="Hours on site" value={aHrs} min={0} step={0.5} unit="hrs" onChange={setAHrs} />
									<NumIn label="Rate" value={aRt} min={1} unit="$/hr" onChange={setARt} />
								</>}
							</div>
							<NumIn label="Call-out fee" value={callout} min={0} unit="$" onChange={setCallout} />
							<Toggle label="After hours (1.5×)" checked={afterHours} onChange={setAfterHours} />
						</SCard>
						<SCard>
							<SCardTitle>Materials (optional)</SCardTitle>
							<NumIn label="Materials cost" value={sMC} min={0} unit="$" onChange={setSMC} />
							<NumIn label="Markup %" value={sMK} min={0} unit="%" onChange={setSMK} />
						</SCard>
					</div>
					<div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
						<div className="grid grid-cols-2 gap-2 mb-3">
							<ResMetric label="Invoice total" value={fd(svcResult.total)} c={margCls(svcResult.margin)} />
							<ResMetric label="Pre-tax profit" value={fd(svcResult.profit)} c={margCls(svcResult.margin)} />
							<ResMetric label="Margin" value={fp(svcResult.margin)} c={margCls(svcResult.margin)} />
							<ResMetric label="After-tax profit" value={fd(afterTax(Math.max(0, svcResult.profit)))} c="purple" />
						</div>
						<TRow label={`Foreman (${fHrs}hrs × $${Math.round(fRt * svcResult.mult)})`} value={fd(svcResult.fRev)} />
						{appOn && <TRow label={`Apprentice (${aHrs}hrs × $${Math.round(aRt * svcResult.mult)})`} value={fd(svcResult.aRev)} />}
						<TRow label="Call-out fee" value={fd(callout)} />
						{sMC > 0 && <>
							<TRow label="Materials cost" value={fd(sMC)} />
							<TRow label={`Materials billed (${sMK}%)`} value={fd(svcResult.matRev)} />
						</>}
						<TRow label="Invoice total" value={fd(svcResult.total)} total />
						<Verdict margin={svcResult.margin} />
						<button onClick={() => onSendToQuote({ labour: Math.round(svcResult.fRev + svcResult.aRev + callout), materials: Math.round(svcResult.matRev), fees: 0, type: "Service / renovation", scope: `Foreman ${fHrs}hrs${appOn ? ` + apprentice ${aHrs}hrs` : ""}${afterHours ? " (after hours)" : ""}${sMC > 0 ? ", materials supplied" : ""}.` })}
							className="mt-3 w-full py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
							Send to Quote Builder →
						</button>
					</div>
				</div>
			)}

			{tab === "mat" && (
				<div className="grid grid-cols-2 gap-4">
					<div>
						<SCard>
							<SCardTitle>Labour</SCardTitle>
							<div className="bg-neutral-50 rounded-lg p-3 mb-2">
								<div className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide mb-2">Foreman</div>
								<NumIn label="Hours on site" value={mFHrs} min={0} step={0.5} unit="hrs" onChange={setMFHrs} />
								<NumIn label="Rate" value={mFRt} min={1} unit="$/hr" onChange={setMFRt} />
							</div>
							<div className="bg-neutral-50 rounded-lg p-3 mb-2">
								<div className="flex justify-between items-center mb-2">
									<span className="text-[11px] font-bold text-neutral-600 uppercase tracking-wide">Apprentice</span>
									<label className="flex items-center gap-1.5 text-xs cursor-pointer">
										<input type="checkbox" checked={mAppOn} onChange={e => setMAppOn(e.target.checked)} className="w-3.5 h-3.5" /> On this job
									</label>
								</div>
								{mAppOn && <>
									<NumIn label="Hours on site" value={mAHrs} min={0} step={0.5} unit="hrs" onChange={setMAHrs} />
									<NumIn label="Rate" value={mARt} min={1} unit="$/hr" onChange={setMARt} />
								</>}
							</div>
							<NumIn label="Call-out / travel" value={mCallout} min={0} unit="$" onChange={setMCallout} />
						</SCard>
						<SCard>
							<SCardTitle>Materials</SCardTitle>
							<NumIn label="Materials cost" value={mMC} min={0} unit="$" onChange={setMMC} />
							<NumIn label="Markup %" value={mMK} min={0} unit="%" onChange={setMMK} />
						</SCard>
					</div>
					<div className="bg-neutral-50 border border-neutral-200 rounded-xl p-4">
						<div className="grid grid-cols-2 gap-2 mb-3">
							<ResMetric label="Invoice total" value={fd(matResult.total)} c={margCls(matResult.margin)} />
							<ResMetric label="Pre-tax profit" value={fd(matResult.profit)} c={margCls(matResult.margin)} />
							<ResMetric label="Margin" value={fp(matResult.margin)} c={margCls(matResult.margin)} />
							<ResMetric label="After-tax profit" value={fd(afterTax(Math.max(0, matResult.profit)))} c="purple" />
						</div>
						<TRow label={`Foreman (${mFHrs}hrs × $${mFRt}/hr)`} value={fd(matResult.fRev)} />
						{mAppOn && <TRow label={`Apprentice (${mAHrs}hrs × $${mARt}/hr)`} value={fd(matResult.aRev)} />}
						{mCallout > 0 && <TRow label="Call-out / travel" value={fd(mCallout)} />}
						<TRow label="Materials cost" value={fd(mMC)} />
						<TRow label={`Materials billed (${mMK}%)`} value={fd(matResult.matRev)} />
						<TRow label="Invoice total" value={fd(matResult.total)} total />
						<Verdict margin={matResult.margin} />
						<button onClick={() => onSendToQuote({ labour: Math.round(matResult.fRev + matResult.aRev + mCallout), materials: Math.round(matResult.matRev), fees: 0, type: "New construction — labour + materials", scope: `Foreman ${mFHrs}hrs${mAppOn ? ` + apprentice ${mAHrs}hrs` : ""}, materials supplied.` })}
							className="mt-3 w-full py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
							Send to Quote Builder →
						</button>
					</div>
				</div>
			)}
		</div>
	)
}

// ─── Panel: Capacity Planner ──────────────────────────────────────────────────

function CapacityPlanner({ initHouses, initSvcDays }: { initHouses: number; initSvcDays: number }) {
	const [houses, setHouses] = useState(initHouses)
	const [svcDays, setSvcDays] = useState(initSvcDays)
	const [manpower, setManpower] = useState(2)
	const [svcRate, setSvcRate] = useState(95)

	const consMen = Math.min(manpower, 2)
	const extraMen = Math.max(0, manpower - 2)
	const cap = useMemo(() => computeCapacity(houses, svcDays, manpower), [houses, svcDays, manpower])

	const baseH = Math.round(houses)
	const scenarios = useMemo(() => {
		const rows = []
		for (let hh = Math.max(0, baseH - 3); hh <= Math.min(25, baseH + 4); hh++) {
			rows.push({ hh, ss: 0 })
			if (svcDays > 0) rows.push({ hh, ss: Math.round(svcDays) })
		}
		return rows
	}, [baseH, svcDays])

	return (
		<div>
			<SCard hi>
				<SCardTitle>Capacity planner inputs — independent from pricing guide</SCardTitle>
				<div className="grid grid-cols-4 gap-4">
					<NumIn label="Houses/year" value={houses} min={0} max={30} unit="houses" onChange={setHouses} />
					<NumIn label="Service days/year" value={svcDays} min={0} max={238} unit="days" onChange={setSvcDays} />
					<NumIn label="Manpower (total employees)" value={manpower} min={1} max={10} unit="people" onChange={setManpower} />
					<NumIn label="Service rate/man" value={svcRate} min={1} unit="$/hr" onChange={setSvcRate} />
				</div>
			</SCard>

			{/* Stats */}
			<div className="grid grid-cols-4 gap-2.5 mb-4">
				<Stat label="Crew utilization" value={`${cap.utilPct}%`} c={cap.utilPct >= 95 ? "red" : cap.utilPct >= 80 ? "amber" : "green"} />
				<Stat label="House days" value={`${Math.round(cap.houseDays)} days`} />
				<Stat label="Service days available" value={`${cap.maxSvcDays} days`} c={cap.maxSvcDays === 0 ? "amber" : "green"} />
				<Stat label="Service man-hrs available" value={Math.round(cap.svcMHAvail).toLocaleString("en-CA")} c={extraMen > 0 ? "amber" : undefined} />
			</div>

			{/* Capacity bar */}
			<div className="mb-2">
				<div className="h-3.5 rounded-full overflow-hidden flex bg-neutral-100 mb-1.5">
					<div className="bg-blue-600 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all" style={{ width: `${cap.hPct}%` }}>
						{cap.hPct > 10 ? `${houses}h` : ""}
					</div>
					<div className="bg-green-500 h-full flex items-center justify-center text-[10px] text-white font-bold transition-all" style={{ width: `${cap.sPct}%` }}>
						{cap.sPct > 8 ? `${svcDays}d` : ""}
					</div>
				</div>
				<div className="flex gap-3 text-[11px] text-neutral-500">
					<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-600 inline-block" />Houses ({Math.round(cap.hPct)}%)</span>
					<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500 inline-block" />Service ({Math.round(cap.sPct)}%)</span>
					<span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-neutral-200 inline-block" />Available ({Math.round(cap.fPct)}%)</span>
				</div>
			</div>

			{cap.overHouses && (
				<div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
					⚠ Over capacity on houses. {houses} houses = {cap.houseDays} days but only {WORKING_DAYS} working days available.
				</div>
			)}
			{cap.overSvc && (
				<div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm font-semibold">
					⚠ Service days exceed available capacity. Max service at {houses} houses with {manpower} employees is {cap.maxSvcDays} days.
				</div>
			)}

			{/* Insight */}
			<div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200 text-blue-800 text-sm">
				<strong>Revenue per day:</strong> Houses = {fd(120 * HRS_DAY)} — Service @ ${svcRate}/hr = {fd(svcRate * HRS_DAY)}.{" "}
				{120 * HRS_DAY >= svcRate * HRS_DAY ? "Houses generate more revenue per day." : "Service generates more revenue per day."}
			</div>

			{/* Scenario table */}
			<div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 mb-2">
				Scenario comparison — cost base $163,163 (2 employees) — ⚠ = over capacity
			</div>
			<div className="overflow-x-auto rounded-xl border border-neutral-200">
				<table className="w-full text-sm border-collapse">
					<thead>
						<tr className="border-b-2 border-neutral-200 text-left">
							{["Houses", "Svc days", "Svc avail", "Revenue", "Profit", "Margin", "After-tax", ""].map(h => (
								<th key={h} className="px-3 py-2 text-xs font-semibold text-neutral-500">{h}</th>
							))}
						</tr>
					</thead>
					<tbody>
						{scenarios.map(({ hh, ss }, i) => {
							const s = computeCapScenario(hh, ss, consMen, extraMen, svcRate)
							const isCurrent = hh === baseH && ss === Math.round(svcDays)
							const isOver = s.overH || s.overS
							const mgColor = s.mg >= 25 ? "#16a34a" : s.mg >= 15 ? "#d97706" : "#dc2626"
							const prColor = s.pr >= 0 ? "#16a34a" : "#dc2626"
							return (
								<tr key={i} className={cn("border-b border-neutral-100", isCurrent && "bg-blue-50 font-bold", isOver && "bg-red-50")}>
									<td className="px-3 py-1.5">{hh}{isOver ? " ⚠" : ""}</td>
									<td className="px-3 py-1.5">{ss}</td>
									<td className="px-3 py-1.5">{s.maxSvc} days</td>
									<td className="px-3 py-1.5">{fd(s.tRev)}</td>
									<td className="px-3 py-1.5 font-semibold" style={{ color: prColor }}>{fd(Math.abs(s.pr))}</td>
									<td className="px-3 py-1.5 font-bold" style={{ color: mgColor }}>{s.mg}%</td>
									<td className="px-3 py-1.5 font-semibold text-purple-700">{fd(s.at)}</td>
									<td className="px-3 py-1.5 text-[11px] text-blue-600 font-bold">{isCurrent ? "◀ You are here" : ""}</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			</div>
			<p className="text-[11px] text-neutral-500 mt-2">Red rows = over capacity. Blue = your current inputs. After-tax at NL corp 12.2%.</p>
		</div>
	)
}

// ─── Panel: HST Tracker ───────────────────────────────────────────────────────

function HSTTracker({ initHouseRev }: { initHouseRev: number }) {
	const [hRev, setHRev] = useState(initHouseRev)
	const [mRev, setMRev] = useState(0)
	const [sRev, setSRev] = useState(0)
	const [rate, setRate] = useState(15)
	const [tools, setTools] = useState(3000)
	const [soft, setSoft] = useState(2500)
	const [other, setOther] = useState(2000)

	const totalRev = hRev + mRev + sRev
	const hstCol = totalRev * (rate / 100)
	const itcExp = tools + soft + other
	const itc = itcExp * (rate / 100)
	const netOwed = Math.max(0, hstCol - itc)
	const monthly = netOwed / 12

	return (
		<div>
			<div className="mb-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm font-semibold">
				HST collected is not your money. It belongs to CRA and must be remitted annually. Set it aside every month without exception.
			</div>
			<div className="grid grid-cols-2 gap-4">
				<div>
					<SCard>
						<SCardTitle>Annual revenue</SCardTitle>
						<NumIn label="House revenue (labour)" value={hRev} min={0} unit="$" onChange={setHRev} />
						<NumIn label="Materials revenue" value={mRev} min={0} unit="$" onChange={setMRev} />
						<NumIn label="Service revenue" value={sRev} min={0} unit="$" onChange={setSRev} />
						<NumIn label="HST rate (NL)" value={rate} min={0} unit="%" onChange={setRate} />
					</SCard>
					<SCard>
						<SCardTitle>Input tax credits (ITCs)</SCardTitle>
						<NumIn label="Tools and equipment" value={tools} min={0} unit="$" onChange={setTools} />
						<NumIn label="Software and office" value={soft} min={0} unit="$" onChange={setSoft} />
						<NumIn label="Other HST-eligible expenses" value={other} min={0} unit="$" onChange={setOther} />
					</SCard>
				</div>
				<div>
					<div className="grid grid-cols-2 gap-2.5 mb-4">
						<Stat label="HST collected/year" value={fd(hstCol)} c="amber" />
						<Stat label="ITCs you reclaim" value={fd(itc)} c="green" />
						<Stat label="Net owed to CRA" value={fd(netOwed)} c="red" />
						<Stat label="Set aside monthly" value={fd(monthly)} c="amber" />
					</div>
					<SCard>
						<TRow label="Total revenue subject to HST" value={fd(totalRev)} />
						<TRow label={`HST collected (${rate}%)`} value={fd(hstCol)} />
						<TRow label="ITC-eligible expenses" value={fd(itcExp)} />
						<TRow label="ITCs claimed back" value={`-${fd(itc)}`} color="#16a34a" />
						<TRow label="Net annual remittance to CRA" value={fd(netOwed)} total color="#dc2626" />
					</SCard>
					<div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-sm mt-3">
						Set aside <strong>{fd(monthly)}/month</strong> into a separate account. Annual HST filing. Do not spend this money.
					</div>
				</div>
			</div>
		</div>
	)
}

// ─── Panel: Quote Builder ─────────────────────────────────────────────────────

function QuoteBuilder({ initQuote }: { initQuote?: QuoteInit }) {
	const [client, setClient] = useState("ABC Builders")
	const [addr, setAddr] = useState("123 Main St, NL")
	const [type, setType] = useState("New construction — labour only")
	const [scope, setScope] = useState("Rough-in and finish wiring of new residential construction per applicable codes and standards.")
	const [labour, setLabour] = useState(initQuote?.labour ?? 12000)
	const [materials, setMaterials] = useState(initQuote?.materials ?? 0)
	const [fees, setFees] = useState(initQuote?.fees ?? 0)
	const [valid, setValid] = useState(30)

	const sub = labour + materials + fees
	const hst = sub * 0.15
	const total = sub + hst
	const today = new Date()
	const dateStr = today.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
	const validDate = new Date(today.getTime() + valid * 86_400_000)
	const validStr = validDate.toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
	const qNum = `KE-${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`

	const handlePrint = () => {
		const preview = document.getElementById("quote-preview")?.innerHTML ?? ""
		const html = `<!DOCTYPE html><html><head><title>Kestrel Electrical — ${qNum}</title>
<style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:-apple-system,sans-serif;padding:40px;max-width:680px;margin:0 auto;font-size:14px;line-height:1.6;color:#18181b;}.tr{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f4f4f5;font-size:13px;}.tr.total{border-top:2px solid #e4e4e7;border-bottom:none;padding-top:10px;font-weight:700;font-size:15px;}</style>
</head><body>${preview}</body></html>`
		const blob = new Blob([html], { type: "text/html" })
		const url = URL.createObjectURL(blob)
		const w = window.open(url, "_blank")
		if (w) setTimeout(() => { w.print(); URL.revokeObjectURL(url) }, 300)
	}

	return (
		<div className="grid grid-cols-2 gap-4">
			<div>
				<SCard>
					<SCardTitle>Client and job</SCardTitle>
					<TxtIn label="Client / builder name" value={client} onChange={setClient} />
					<TxtIn label="Job address" value={addr} onChange={setAddr} />
					<div className="flex items-center gap-2 mb-2">
						<label className="flex-1 text-sm text-neutral-700">Job type</label>
						<select value={type} onChange={e => setType(e.target.value)}
							className="w-48 text-sm px-2 py-1.5 border border-neutral-200 rounded-lg bg-neutral-50 focus:outline-none focus:border-blue-500">
							<option>New construction — labour only</option>
							<option>New construction — labour + materials</option>
							<option>Service / renovation</option>
							<option>Custom</option>
						</select>
					</div>
					<TxtIn label="Scope of work" value={scope} onChange={setScope} />
				</SCard>
				<SCard>
					<SCardTitle>Pricing</SCardTitle>
					<NumIn label="Labour" value={labour} min={0} unit="$" onChange={setLabour} />
					<NumIn label="Materials" value={materials} min={0} unit="$" onChange={setMaterials} />
					<NumIn label="Other fees" value={fees} min={0} unit="$" onChange={setFees} />
					<NumIn label="Quote valid (days)" value={valid} min={1} unit="days" onChange={setValid} />
				</SCard>
				<button onClick={handlePrint} className="w-full py-2.5 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
					Print / Save PDF
				</button>
			</div>
			{/* Preview */}
			<div id="quote-preview" className="bg-white border border-neutral-200 rounded-xl p-6 text-sm leading-relaxed">
				<div className="flex justify-between items-start border-b-2 border-blue-600 pb-4 mb-5">
					<div>
						<div className="text-xl font-black text-blue-600 tracking-tight">Kestrel Electrical</div>
						<div className="text-xs text-neutral-500 mt-0.5">Licensed Electrical Contractor — Newfoundland & Labrador</div>
						<div className="text-xs text-neutral-500">(709) 536-7254</div>
					</div>
					<div className="text-right">
						<div className="text-[11px] text-neutral-700 uppercase tracking-wide">Quote</div>
						<div className="text-lg font-bold text-blue-600">{qNum}</div>
						<div className="text-xs text-neutral-500">Issued: {dateStr}</div>
						<div className="text-xs text-neutral-500">Valid until: {validStr}</div>
					</div>
				</div>
				<div className="mb-4">
					<div className="text-[11px] text-neutral-700 uppercase tracking-wide mb-1">Prepared for</div>
					<div className="font-bold text-base">{client}</div>
					<div className="text-sm text-neutral-500">{addr}</div>
				</div>
				<div className="bg-neutral-50 rounded-lg p-3 mb-4">
					<div className="text-[11px] text-neutral-700 uppercase tracking-wide mb-1">Scope of work</div>
					<div className="font-semibold">{type}</div>
					<div className="text-neutral-600 mt-1">{scope}</div>
				</div>
				{labour > 0 && <TRow label="Labour" value={fd(labour)} />}
				{materials > 0 && <TRow label="Materials" value={fd(materials)} />}
				{fees > 0 && <TRow label="Other fees" value={fd(fees)} />}
				<TRow label="Subtotal" value={fd(sub)} />
				<TRow label="HST (15%)" value={fd(hst)} />
				<TRow label="Total" value={fd(total)} total color="#2563eb" />
				<div className="text-[11px] text-neutral-500 mt-4 pt-3 border-t border-neutral-200 leading-relaxed">
					Payment terms: Net 14 days from invoice date. All work performed to applicable NL electrical codes and standards.
					This quote is valid for {valid} days. Contact Kestrel Electrical at (709) 536-7254.
				</div>
			</div>
		</div>
	)
}

// ─── Panel: Payroll Checker ───────────────────────────────────────────────────

function PayrollChecker() {
	const [wage, setWage] = useState(25)
	const [hrs, setHrs] = useState(2080)
	const [addH, setAddH] = useState(4)
	const [addS, setAddS] = useState(20)
	const [hRate, setHRate] = useState(120)
	const [sRate, setSRate] = useState(95)

	const empCost = wage * hrs * 1.1364
	const addRev = addH * 100 * hRate + addS * HRS_DAY * sRate
	const net = addRev - empCost
	const roi = empCost > 0 ? (net / empCost) * 100 : 0
	const be = Math.ceil(empCost / (100 * hRate))
	const worth = net > 0

	return (
		<div className="grid grid-cols-2 gap-4">
			<div>
				<SCard>
					<SCardTitle>Proposed employee</SCardTitle>
					<NumIn label="Hourly wage" value={wage} min={1} unit="$/hr" onChange={setWage} />
					<NumIn label="Hours paid per year" value={hrs} min={1} unit="hrs" onChange={setHrs} />
				</SCard>
				<SCard>
					<SCardTitle>Expected revenue they generate</SCardTitle>
					<NumIn label="Additional houses/year" value={addH} min={0} unit="houses" onChange={setAddH} />
					<NumIn label="Service days/year" value={addS} min={0} unit="days" onChange={setAddS} />
					<NumIn label="House rate (collective)" value={hRate} min={1} unit="$/hr" onChange={setHRate} />
					<NumIn label="Service rate per man" value={sRate} min={1} unit="$/hr" onChange={setSRate} />
				</SCard>
			</div>
			<div>
				<div className="grid grid-cols-2 gap-2.5 mb-4">
					<Stat label="True annual cost" value={fd(empCost)} />
					<Stat label="Revenue generated" value={fd(addRev)} />
					<Stat label="Net benefit" value={(net >= 0 ? "" : "-") + fd(Math.abs(net))} c={worth ? "green" : "red"} />
					<Stat label="ROI on hire" value={`${Math.round(roi)}%`} c={roi >= 20 ? "green" : roi >= 0 ? "amber" : "red"} />
				</div>
				<SCard>
					<TRow label={`Wage (${fd(wage)}/hr × ${hrs} hrs)`} value={fd(wage * hrs)} />
					<TRow label="Labour burden (13.64%)" value={fd(wage * hrs * 0.1364)} />
					<TRow label="True annual cost" value={fd(empCost)} total />
					<TRow label={`Revenue from ${addH} extra houses`} value={fd(addH * 100 * hRate)} />
					<TRow label={`Revenue from ${addS} service days`} value={fd(addS * HRS_DAY * sRate)} />
					<TRow label="Total additional revenue" value={fd(addRev)} total />
				</SCard>
				<div className={cn("mt-3 p-3 rounded-lg text-sm font-semibold", worth ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
					{worth
						? `This hire pays for itself. Break-even is ${be} houses/year.`
						: `Does not pay for itself at current workload. Need ${be} houses to break even.`}
				</div>
			</div>
		</div>
	)
}

// ─── Panel: Annual P&L ────────────────────────────────────────────────────────

function AnnualPL({ initHouses, initSvcDays }: { initHouses: number; initSvcDays: number }) {
	const [houses, setHouses] = useState(initHouses)
	const [hRate, setHRate] = useState(120)
	const [svcDays, setSvcDays] = useState(initSvcDays)
	const [sRate, setSRate] = useState(95)
	const [mRev, setMRev] = useState(0)
	const [mCost, setMCost] = useState(0)
	const [other, setOther] = useState(0)
	const [lWeather, setLWeather] = useState(0)
	const [lCallback, setLCallback] = useState(0)
	const [lEquip, setLEquip] = useState(0)
	const [lOther, setLOther] = useState(0)
	const [tRev, setTRev] = useState(228000)
	const [tProfit, setTProfit] = useState(64837)

	const costPerLostDay = 2 * 8 * 42.94
	const totalLost = lWeather + lCallback + lEquip + lOther
	const lostCost = totalLost * costPerLostDay
	const houseRev = houses * 100 * hRate
	const svcRev = svcDays * HRS_DAY * sRate
	const totalRev = houseRev + svcRev + mRev + other
	const profit = totalRev - COST - mCost - lostCost
	const margin = totalRev > 0 ? (profit / totalRev) * 100 : 0
	const atProfit = afterTax(Math.max(0, profit))
	const mc = margin >= 25 ? "green" : margin >= 15 ? "amber" : "red"

	return (
		<div className="grid grid-cols-2 gap-4">
			<div>
				<SCard>
					<SCardTitle>Actual results this year</SCardTitle>
					<NumIn label="Houses completed" value={houses} min={0} unit="houses" onChange={setHouses} />
					<NumIn label="Rate charged (collective)" value={hRate} min={1} unit="$/hr" onChange={setHRate} />
					<NumIn label="Service days completed" value={svcDays} min={0} unit="days" onChange={setSvcDays} />
					<NumIn label="Service rate (per man)" value={sRate} min={1} unit="$/hr" onChange={setSRate} />
					<NumIn label="Materials revenue" value={mRev} min={0} unit="$" onChange={setMRev} />
					<NumIn label="Materials cost" value={mCost} min={0} unit="$" onChange={setMCost} />
					<NumIn label="Other revenue" value={other} min={0} unit="$" onChange={setOther} />
				</SCard>
				<SCard>
					<SCardTitle>Lost days — unproductive paid time</SCardTitle>
					<NumIn label="Weather delays" value={lWeather} min={0} unit="days" onChange={setLWeather} />
					<NumIn label="Callbacks / deficiency work" value={lCallback} min={0} unit="days" onChange={setLCallback} />
					<NumIn label="Equipment / vehicle downtime" value={lEquip} min={0} unit="days" onChange={setLEquip} />
					<NumIn label="Other lost days" value={lOther} min={0} unit="days" onChange={setLOther} />
					<p className="text-[11px] text-neutral-500 mt-1">Each lost day = 2 men × 8hrs × $42.94 = <strong>$687 unrecovered cost</strong></p>
				</SCard>
				<SCard>
					<SCardTitle>Your annual targets</SCardTitle>
					<NumIn label="Target revenue" value={tRev} min={0} unit="$" onChange={setTRev} />
					<NumIn label="Target profit" value={tProfit} min={0} unit="$" onChange={setTProfit} />
				</SCard>
			</div>
			<div>
				<div className="grid grid-cols-2 gap-2.5 mb-4">
					<Stat label="Actual revenue" value={fd(totalRev)} c={mc} />
					<Stat label="Actual profit" value={(profit >= 0 ? "" : "-") + fd(Math.abs(profit))} c={mc} />
					<Stat label="Actual margin" value={`${Math.round(margin)}%`} c={mc} />
					<Stat label="After-tax profit" value={fd(atProfit)} c="purple" />
				</div>
				<SCard>
					<TRow label={`House revenue (${houses} × 100hrs × $${hRate}/hr)`} value={fd(houseRev)} />
					{svcDays > 0 && <TRow label={`Service revenue (${svcDays} days)`} value={fd(svcRev)} />}
					{mRev > 0 && <TRow label="Materials revenue" value={fd(mRev)} />}
					{other > 0 && <TRow label="Other revenue" value={fd(other)} />}
					<TRow label="Total revenue" value={fd(totalRev)} total />
					<TRow label="Fixed cost base" value="$163,163" />
					{mCost > 0 && <TRow label="Materials cost" value={fd(mCost)} />}
					{totalLost > 0 && (
						<TRow label={`⚠ Lost days cost (${totalLost} days × $687/day)`} value={`-${fd(lostCost)}`} color="#dc2626" />
					)}
					<TRow label="Net profit" value={fd(profit)} total color={profit >= 0 ? "#16a34a" : "#dc2626"} />
					<TRow label="After-tax profit (corp 12.2%)" value={fd(atProfit)} total color="#7c3aed" />
				</SCard>
				{totalLost > 0 && (
					<div className="mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
						{totalLost} lost days cost you {fd(lostCost)} in unrecovered wages — {Math.round((totalLost / WORKING_DAYS) * 100)}% of your working year.
					</div>
				)}
				<SCard className="mt-3">
					<SCardTitle>Variance vs plan</SCardTitle>
					<TRow label={`Revenue vs target (${fd(tRev)})`} value={(totalRev - tRev >= 0 ? "+" : "") + fd(totalRev - tRev)} color={totalRev >= tRev ? "#16a34a" : "#dc2626"} />
					<TRow label={`Profit vs target (${fd(tProfit)})`} value={(profit - tProfit >= 0 ? "+" : "") + fd(profit - tProfit)} color={profit >= tProfit ? "#16a34a" : "#dc2626"} />
				</SCard>
			</div>
		</div>
	)
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

const PANELS: { id: PanelId; label: string }[] = [
	{ id: "guide", label: "Pricing Guide" },
	{ id: "calc", label: "Job Calculator" },
	{ id: "capacity", label: "Capacity Planner" },
	{ id: "hst", label: "HST Tracker" },
	{ id: "quote", label: "Quote Builder" },
	{ id: "payroll", label: "Payroll Checker" },
	{ id: "pl", label: "Annual P&L" },
]

export function ElectricalDashboard() {
	const [panel, setPanel] = useState<PanelId>("guide")
	const [houses, setHouses] = useState(19)
	const [svcDays, setSvcDays] = useState(0)
	const [lastReviewed, setLastReviewed] = useState<string | null>(() =>
		typeof window !== "undefined" ? localStorage.getItem("ke-reviewed") : null
	)
	const [calcInit, setCalcInit] = useState<{ tab: CalcTab; rate: number; ah?: boolean } | null>(null)
	const [quoteInit, setQuoteInit] = useState<QuoteInit | undefined>(undefined)

	const ohr = useMemo(() => computeOHR(houses, svcDays), [houses, svcDays])

	const markReviewed = () => {
		const d = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })
		setLastReviewed(d)
		localStorage.setItem("ke-reviewed", d)
	}

	const handleLoadCon = (rate: number) => {
		setCalcInit({ tab: "con", rate })
		setPanel("calc")
	}
	const handleLoadSvc = (rate: number, ah: boolean) => {
		setCalcInit({ tab: "svc", rate, ah })
		setPanel("calc")
	}
	const handleSendToQuote = (q: QuoteInit) => {
		setQuoteInit(q)
		setPanel("quote")
	}

	return (
		<div className="min-h-screen bg-neutral-50">
			{/* Top bar */}
			<div className="flex justify-between items-center px-5 py-3.5 bg-white border border-neutral-200 rounded-xl mb-7">
				<div className="flex items-center gap-3">
					<div className="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-base tracking-tight">KE</div>
					<div>
						<div className="text-base font-bold tracking-tight">Kestrel Electrical</div>
						<div className="text-xs text-neutral-500">
							Business Operating Guide — Newfoundland & Labrador — 2026 &nbsp;|&nbsp; Cost base last reviewed:{" "}
							{lastReviewed
								? <span className="text-green-600 font-semibold">{lastReviewed}</span>
								: <button onClick={markReviewed} className="text-blue-600 font-semibold hover:underline">Click to set</button>}
						</div>
					</div>
				</div>
				<button onClick={() => window.print()} className="px-4 py-2 text-sm font-semibold border border-neutral-200 rounded-lg bg-white hover:bg-neutral-50 transition-colors">
					Print / Save PDF
				</button>
			</div>

			{/* Navigation */}
			<div className="flex gap-0.5 bg-white border border-neutral-200 rounded-xl p-1 mb-7">
				{PANELS.map(p => (
					<button key={p.id} onClick={() => setPanel(p.id)}
						className={cn("flex-1 py-2.5 px-2 text-xs font-semibold text-center rounded-lg transition-colors",
							panel === p.id ? "bg-blue-600 text-white" : "text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900")}>
						{p.label}
					</button>
				))}
			</div>

			{/* Active panel */}
			<div>
				{panel === "guide" && (
					<PricingGuide
						houses={houses}
						svcDays={svcDays}
						onWorkloadChange={(h, s) => { setHouses(h); setSvcDays(s) }}
						onLoadCon={handleLoadCon}
						onLoadSvc={handleLoadSvc}
					/>
				)}
				{panel === "calc" && (
					<JobCalculator
						key={calcInit ? `${calcInit.tab}-${calcInit.rate}-${calcInit.ah}` : "default"}
						ohr={ohr}
						initTab={calcInit?.tab}
						initRate={calcInit?.rate}
						initAH={calcInit?.ah}
						onSendToQuote={handleSendToQuote}
					/>
				)}
				{panel === "capacity" && <CapacityPlanner initHouses={houses} initSvcDays={svcDays} />}
				{panel === "hst" && <HSTTracker initHouseRev={houses * 100 * 120} />}
				{panel === "quote" && <QuoteBuilder key={quoteInit ? `${quoteInit.labour}-${quoteInit.materials}` : "default"} initQuote={quoteInit} />}
				{panel === "payroll" && <PayrollChecker />}
				{panel === "pl" && <AnnualPL initHouses={houses} initSvcDays={svcDays} />}
			</div>
		</div>
	)
}
