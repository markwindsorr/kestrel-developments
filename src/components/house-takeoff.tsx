"use client"
import { useState, useMemo, useEffect } from "react"
import { cn } from "@/lib/utils"
import { saveEstimateAction } from "@/app/dashboard/takeoff/house/actions"
import { QuotePanel } from "@/components/quote-panel"
import { RatesEditor } from "@/app/dashboard/settings/rates/rates-editor"
import {
	fd, h,
	CABINET_OPTIONS, PROFIT_OPTIONS, TEMP_HEAT_OPTIONS, CLEANING_OPTIONS,
	type CostRates,
} from "@/lib/house-calc"
import type { HouseEstimate } from "@/lib/db/estimates"
import type { DbJob } from "@/lib/types"
import { linkEstimateToJobAction } from "@/app/dashboard/takeoff/house/actions"

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedEstimate {
	version: 1
	name: string
	savedAt: string
	// All primitive state fields serialized
	client: string; date: string; location: string; agent: string
	houseWidth: number; houseLength: number; storeys: number
	dimBsmt: number; dimGarage: number; dimWallHt: number
	dimOpenings: number; dimBaseboardLF: number
	ovrFootingLF: number | null; ovrWallLF: number | null; ovrSlabSqft: number | null
	ovrElecBsmt: number | null; ovrPaintSqft: number | null
	ovrFramingHouse: number | null; ovrFramingBsmt: number | null; ovrFramingGarage: number | null
	ovrInsulWall: number | null; ovrInsulCeil: number | null
	ovrGyrocSqft: number | null; ovrTrimOpenings: number | null; ovrTrimBaseboard: number | null
	lotPrice: number; engineering: number; surveys: number; legal: number; city: string; blueprints: number
	excavationIncluded: boolean; excavationAmt: number
	wellDepth: number; wellPumpDist: string; wellCustom: boolean; wellCustomAmt: number
	septic: number; rockBustingHrs: number; fill: number; stone: number
	concreteM3: number; concretePump: boolean; concreteWinterMix: boolean; foundCoating: number
	bennettsHH: number; trussesIncluded: boolean; trussesAmt: number
	windowsDoorsAmt: number; windowType: string; foundInsuSheets: number
	plumbingAmt: number; plumbingMisc: number; sidingAmt: number; electricalDwellingType: string
	paintMisc: number; cabinets: number
	floorAllow: number; floorLabour: number; floorUnderlaySheets: number
	floorRailsSpindles: number; floorHardwoodStairs: number; floorStairLabour: number
	hvacSecondaryHeat: string; hvacMicrowave: string; tileMaterialRate: number; tileSqft: number
	frontDeck: number; rearDeck: number; shingleBundles: number
	lightsAllowance: number; lightsPotLights: number
	powderRooms: number; ensuiteCount: number; ensuiteShowerType: string
	mainBathCount: number; mainShowerType: string; aptBathCount: number; aptShowerType: string
	landscapingFull: number; driveway: number; windowWells: number
	unforeseenLabour: number; cleaning: number; garbage: number
	closetShelves: number; luxWarranty: number; tempHeat: number; miscAmt: number; profit: number
	reLandIncluded: boolean; reCommPct: number
	salePrice: number; loanAmount: number; loanRatePct: number; loanMonths: number; contingencyPct: number
}

// ─── Shared atoms ─────────────────────────────────────────────────────────────

function Num({ label, value, onChange, min = 0, step = 1, decimals = false, wide }: {
	label?: string; value: number; onChange: (v: number) => void
	min?: number; step?: number; decimals?: boolean; wide?: boolean
}) {
	return (
		<label className="flex flex-col gap-0.5 min-w-0">
			{label && <span className="text-xs text-neutral-600 whitespace-nowrap">{label}</span>}
			<input
				type="number" min={min} step={decimals ? 0.01 : step}
				value={value === 0 ? "" : value} placeholder="0"
				onChange={e => onChange(parseFloat(e.target.value) || 0)}
				className={cn("rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none", wide ? "w-32" : "w-24")}
			/>
		</label>
	)
}

function Sel<T extends string>({ label, value, onChange, options }: {
	label?: string; value: T; onChange: (v: T) => void; options: { value: T; label: string }[]
}) {
	return (
		<label className="flex flex-col gap-0.5 min-w-0">
			{label && <span className="text-xs text-neutral-600 whitespace-nowrap">{label}</span>}
			<select value={value} onChange={e => onChange(e.target.value as T)}
				className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none">
				{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
			</select>
		</label>
	)
}

function Txt({ label, value, onChange, placeholder }: {
	label?: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
	return (
		<label className="flex flex-col gap-0.5">
			{label && <span className="text-xs text-neutral-600">{label}</span>}
			<input type="text" value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
				className="rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none" />
		</label>
	)
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
	return (
		<label className="flex items-center gap-1.5 cursor-pointer select-none">
			<input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
				className="h-3.5 w-3.5 rounded border-neutral-300 text-brand-600 focus:ring-brand-500" />
			<span className="text-xs text-neutral-700">{label}</span>
		</label>
	)
}

// Auto-linked field: shows derived value, click "edit" to override
function LinkedNum({ label, derived, override, onOverride, unit }: {
	label: string; derived: number; override: number | null
	onOverride: (v: number | null) => void; unit?: string
}) {
	if (override !== null) {
		return (
			<label className="flex flex-col gap-0.5 min-w-0">
				<div className="flex items-center justify-between gap-1">
					<span className="text-xs text-neutral-600 whitespace-nowrap">{label}</span>
					<button onClick={() => onOverride(null)} className="text-xs text-brand-500 hover:underline leading-none">↩ auto</button>
				</div>
				<input type="number" min={0} value={override === 0 ? "" : override} placeholder="0"
					onChange={e => onOverride(parseFloat(e.target.value) || 0)}
					className="w-24 rounded border border-brand-400 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none" />
			</label>
		)
	}
	return (
		<div className="flex flex-col gap-0.5 min-w-0">
			<span className="text-xs text-neutral-600 whitespace-nowrap">{label}</span>
			<button onClick={() => onOverride(derived > 0 ? derived : 0)}
				className="flex items-center justify-between w-24 rounded border border-neutral-200 bg-neutral-50 px-2 py-1 hover:border-brand-300 group text-left">
				<span className="text-sm text-neutral-500 tabular-nums">
					{derived > 0 ? Math.round(derived).toLocaleString() : <span className="text-neutral-300">—</span>}
					{unit && derived > 0 && <span className="text-xs text-neutral-400 ml-0.5">{unit}</span>}
				</span>
				<svg className="h-3 w-3 text-neutral-300 group-hover:text-brand-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
				</svg>
			</button>
		</div>
	)
}

function TR({ label, note, inputs, sub, hst, total, muted }: {
	label: string; note?: string; inputs?: React.ReactNode
	sub: number; hst: number; total: number; muted?: boolean
}) {
	return (
		<tr className={cn("border-t border-neutral-100", muted && "opacity-40")}>
			<td className="py-2.5 pl-4 pr-3 align-top">
				<div className="text-sm font-medium text-neutral-800">{label}</div>
				{note && <div className="text-xs text-neutral-500 mt-0.5">{note}</div>}
			</td>
			<td className="py-2.5 pr-4 align-top">
				{inputs && <div className="flex flex-wrap items-end gap-3">{inputs}</div>}
			</td>
			<td className="py-2.5 pr-4 text-right text-sm text-neutral-800 align-top tabular-nums whitespace-nowrap">
				{sub > 0 ? fd(sub) : <span className="text-neutral-300">—</span>}
			</td>
			<td className="py-2.5 pr-4 text-right text-sm text-neutral-500 align-top tabular-nums whitespace-nowrap">
				{hst > 0 ? fd(hst) : <span className="text-neutral-300">—</span>}
			</td>
			<td className="py-2.5 pr-4 text-right text-sm font-semibold text-neutral-900 align-top tabular-nums whitespace-nowrap">
				{total > 0 ? fd(total) : <span className="text-neutral-300">—</span>}
			</td>
		</tr>
	)
}

function Section({ title, sectionTotal, children, defaultOpen = false }: {
	title: string; sectionTotal: number; children: React.ReactNode; defaultOpen?: boolean
}) {
	const [open, setOpen] = useState(defaultOpen)
	return (
		<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden mb-4">
			<button className="flex w-full items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-200 text-left"
				onClick={() => setOpen(o => !o)}>
				<span className="font-semibold text-neutral-900">{title}</span>
				<span className="flex items-center gap-3">
					<span className="text-sm font-semibold text-brand-700">{fd(sectionTotal)}</span>
					<svg className={cn("h-4 w-4 text-neutral-400 transition-transform", open && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</span>
			</button>
			{open && (
				<div className="overflow-x-auto">
					<table className="w-full">
						<thead>
							<tr className="text-xs text-neutral-500 uppercase tracking-wide bg-neutral-50/50">
								<th className="py-2 pl-4 pr-3 text-left font-medium w-44">Item</th>
								<th className="py-2 pr-4 text-left font-medium">Inputs</th>
								<th className="py-2 pr-4 text-right font-medium w-28">Subtotal</th>
								<th className="py-2 pr-4 text-right font-medium w-28">HST (15%)</th>
								<th className="py-2 pr-4 text-right font-medium w-28">Total</th>
							</tr>
						</thead>
						<tbody>{children}</tbody>
					</table>
				</div>
			)}
		</div>
	)
}

const CHART_COLORS = ["#8b2c2c","#a8a29e","#78716c","#b33a3a","#cc6363","#5e2121","#e29898","#44403c","#292524","#57534e","#f0c4c4","#d6d3d1"]

function BreakdownChart({ sections }: { sections: { label: string; value: number }[] }) {
	const nonZero = sections.filter(s => s.value > 0)
	const total = nonZero.reduce((s, x) => s + x.value, 0)
	if (total === 0) return null
	return (
		<div>
			<div className="flex h-9 rounded-lg overflow-hidden gap-px">
				{nonZero.map((s, i) => (
					<div key={s.label} title={`${s.label}: ${fd(s.value)} (${Math.round(s.value / total * 100)}%)`}
						style={{ width: `${(s.value / total) * 100}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
				))}
			</div>
			<div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
				{nonZero.map((s, i) => (
					<div key={s.label} className="flex items-center gap-1.5">
						<div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
						<span className="text-xs text-neutral-600">{s.label}</span>
						<span className="text-xs font-semibold text-neutral-800">{Math.round(s.value / total * 100)}%</span>
					</div>
				))}
			</div>
		</div>
	)
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function HouseTakeoff({ rates, dbEstimates, availableJobs, initialEstimate }: {
	rates: CostRates
	dbEstimates: HouseEstimate[]
	availableJobs: DbJob[]
	initialEstimate?: HouseEstimate
}) {
	// ─── Rate lookups (built from prop so all downstream code stays unchanged) ───
	const PERMIT_COSTS: Record<string, number> = { "St. John's": rates.PERMIT_ST_JOHNS, "Paradise": rates.PERMIT_PARADISE, "Mount Pearl": rates.PERMIT_MOUNT_PEARL }
	const WELL_DRILL_COSTS: Record<number, number> = { 300: rates.WELL_DRILL_300FT, 400: rates.WELL_DRILL_400FT, 500: rates.WELL_DRILL_500FT }
	const WELL_PUMP_COSTS: Record<string, number> = { "300ft": rates.WELL_PUMP_300FT, "500ft": rates.WELL_PUMP_500FT }
	const FOUND_WALL_RATES: Record<number, number> = { 8: rates.FOUND_WALL_8FT, 9: rates.FOUND_WALL_9FT, 10: rates.FOUND_WALL_10FT }
	const ELECTRICAL_RATES: Record<string, number> = { "Single-Family": rates.ELEC_SINGLE_FAMILY, "Two-Apartment": rates.ELEC_TWO_APARTMENT }
	const SHOWER_TYPE_COSTS: Record<string, number> = { "All Tile": rates.SHOWER_ALL_TILE, "Tile Wall + Acrylic Base": rates.SHOWER_TILE_WALL_ACRYLIC, "Tile Wall + Tub Base": rates.SHOWER_TILE_WALL_TUB, "Tub Surround": rates.SHOWER_TUB_SURROUND, "Powder Room": rates.SHOWER_POWDER_ROOM, "Shower Surround": rates.SHOWER_SHOWER_SURROUND }
	const HVAC_MINI_SPLITS: Record<string, number> = { "None": 0, "Single": rates.HVAC_MINI_SPLIT_SINGLE, "Dual": rates.HVAC_MINI_SPLIT_DUAL, "Triple": rates.HVAC_MINI_SPLIT_TRIPLE, "Heat Pump": rates.HVAC_MINI_SPLIT_HEAT_PUMP }
	const HVAC_MICROWAVE: Record<string, number> = { "Range Hood": rates.HVAC_MICROWAVE_RANGE_HOOD, "Vented Microwave Combo": rates.HVAC_MICROWAVE_VENTED_COMBO, "None": 0 }
	const CONCRETE_PER_M3 = rates.CONCRETE_PER_M3
	const CONCRETE_PUMP = rates.CONCRETE_PUMP
	const CONCRETE_WINTER_MIX = rates.CONCRETE_WINTER_MIX
	const FOOTING_LABOUR_RATE = rates.FOOTING_LABOUR_RATE
	const SLAB_FINISH_RATE = rates.SLAB_FINISH_RATE
	const FRAMING_HOUSE_RATE = rates.FRAMING_HOUSE_RATE
	const FRAMING_BSMT_RATE = rates.FRAMING_BSMT_RATE
	const FRAMING_GARAGE_RATE = rates.FRAMING_GARAGE_RATE
	const ELECTRICAL_BSMT_RATE = rates.ELEC_BSMT_RATE
	const PAINT_RATE = rates.PAINT_RATE
	const SHINGLE_PER_BUNDLE = rates.SHINGLE_PER_BUNDLE
	const INSUL_WALL_RATE = rates.INSUL_WALL_RATE
	const INSUL_CEIL_RATE = rates.INSUL_CEIL_RATE
	const GYPROC_RATE = rates.GYPROC_RATE
	const TRIM_BASEBOARD_RATE = rates.TRIM_BASEBOARD_RATE
	const TRIM_OPENING_RATE = rates.TRIM_OPENING_RATE
	const FOUND_INSUL_CM2_RATE = rates.FOUND_INSUL_CM2_RATE
	const TILE_INSTALL_RATE = rates.TILE_INSTALL_RATE
	const UNDERLAY_SHEET_RATE = rates.UNDERLAY_SHEET_RATE
	const SHOWER_FIXTURES = rates.SHOWER_FIXTURES
	const KITCHEN_SINGLE = rates.KITCHEN_SINGLE
	const KITCHEN_APT = rates.KITCHEN_APT
	const HVAC_BASE = rates.HVAC_BASE

	// ─── Header ───
	const [client, setClient] = useState("")
	const [date, setDate] = useState("")
	const [location, setLocation] = useState("")
	const [agent, setAgent] = useState("")

	// ─── Dimensions ───
	const [houseWidth, setHouseWidth] = useState(0)
	const [houseLength, setHouseLength] = useState(0)
	const [storeys, setStoreys] = useState(2)
	const [dimBsmt, setDimBsmt] = useState(0)
	const [dimGarage, setDimGarage] = useState(0)
	const [dimWallHt, setDimWallHt] = useState(9)
	const [dimOpenings, setDimOpenings] = useState(0)
	const [dimBaseboardLF, setDimBaseboardLF] = useState(0)

	// Overridable linked fields (null = use derived value)
	const [ovrFootingLF, setOvrFootingLF] = useState<number | null>(null)
	const [ovrWallLF, setOvrWallLF] = useState<number | null>(null)
	const [ovrSlabSqft, setOvrSlabSqft] = useState<number | null>(null)
	const [ovrElecBsmt, setOvrElecBsmt] = useState<number | null>(null)
	const [ovrPaintSqft, setOvrPaintSqft] = useState<number | null>(null)
	const [ovrFramingHouse, setOvrFramingHouse] = useState<number | null>(null)
	const [ovrFramingBsmt, setOvrFramingBsmt] = useState<number | null>(null)
	const [ovrFramingGarage, setOvrFramingGarage] = useState<number | null>(null)
	const [ovrInsulWall, setOvrInsulWall] = useState<number | null>(null)
	const [ovrInsulCeil, setOvrInsulCeil] = useState<number | null>(null)
	const [ovrGyrocSqft, setOvrGyrocSqft] = useState<number | null>(null)
	const [ovrTrimOpenings, setOvrTrimOpenings] = useState<number | null>(null)
	const [ovrTrimBaseboard, setOvrTrimBaseboard] = useState<number | null>(null)

	// ─── Soft Costs ───
	const [lotPrice, setLotPrice] = useState(0)
	const [engineering, setEngineering] = useState(0)
	const [surveys, setSurveys] = useState(0)
	const [legal, setLegal] = useState(0)
	const [city, setCity] = useState("St. John's")
	const [blueprints, setBlueprints] = useState(0)

	// ─── Lot Prep ───
	const [excavationIncluded, setExcavationIncluded] = useState(false)
	const [excavationAmt, setExcavationAmt] = useState(0)
	const [wellDepth, setWellDepth] = useState(300)
	const [wellPumpDist, setWellPumpDist] = useState("300ft")
	const [wellCustom, setWellCustom] = useState(false)
	const [wellCustomAmt, setWellCustomAmt] = useState(0)
	const [septic, setSeptic] = useState(0)
	const [rockBustingHrs, setRockBustingHrs] = useState(0)
	const [fill, setFill] = useState(0)
	const [stone, setStone] = useState(0)

	// ─── Concrete ───
	const [concreteM3, setConcreteM3] = useState(0)
	const [concretePump, setConcretePump] = useState(true)
	const [concreteWinterMix, setConcreteWinterMix] = useState(false)
	const [foundCoating, setFoundCoating] = useState(500)

	// ─── Building Materials ───
	const [bennettsHH, setBennettsHH] = useState(0)
	const [trussesIncluded, setTrussesIncluded] = useState(true)
	const [trussesAmt, setTrussesAmt] = useState(0)
	const [windowsDoorsAmt, setWindowsDoorsAmt] = useState(0)
	const [windowType, setWindowType] = useState("None")
	const [foundInsuSheets, setFoundInsuSheets] = useState(0)

	// ─── Subtrades ───
	const [plumbingAmt, setPlumbingAmt] = useState(0)
	const [plumbingMisc, setPlumbingMisc] = useState(0)
	const [sidingAmt, setSidingAmt] = useState(0)
	const [electricalDwellingType, setElectricalDwellingType] = useState("Single-Family")
	const [paintMisc, setPaintMisc] = useState(0)
	const [cabinets, setCabinets] = useState(8000)
	const [floorAllow, setFloorAllow] = useState(0)
	const [floorLabour, setFloorLabour] = useState(0)
	const [floorUnderlaySheets, setFloorUnderlaySheets] = useState(0)
	const [floorRailsSpindles, setFloorRailsSpindles] = useState(0)
	const [floorHardwoodStairs, setFloorHardwoodStairs] = useState(0)
	const [floorStairLabour, setFloorStairLabour] = useState(0)
	const [hvacSecondaryHeat, setHvacSecondaryHeat] = useState("None")
	const [hvacMicrowave, setHvacMicrowave] = useState("None")
	const [tileMaterialRate, setTileMaterialRate] = useState(5.5)
	const [tileSqft, setTileSqft] = useState(0)

	// ─── Labour Only ───
	const [frontDeck, setFrontDeck] = useState(0)
	const [rearDeck, setRearDeck] = useState(0)
	const [shingleBundles, setShingleBundles] = useState(0)

	// ─── Interior Finishes ───
	const [lightsAllowance, setLightsAllowance] = useState(0)
	const [lightsPotLights, setLightsPotLights] = useState(0)
	const [powderRooms, setPowderRooms] = useState(0)
	const [ensuiteCount, setEnsuiteCount] = useState(0)
	const [ensuiteShowerType, setEnsuiteShowerType] = useState("Tile Wall + Acrylic Base")
	const [mainBathCount, setMainBathCount] = useState(0)
	const [mainShowerType, setMainShowerType] = useState("Tub Surround")
	const [aptBathCount, setAptBathCount] = useState(0)
	const [aptShowerType, setAptShowerType] = useState("Tub Surround")

	// ─── Landscaping ───
	const [landscapingFull, setLandscapingFull] = useState(0)
	const [driveway, setDriveway] = useState(0)
	const [windowWells, setWindowWells] = useState(0)

	// ─── Overhead ───
	const [unforeseenLabour, setUnforeseenLabour] = useState(0)
	const [cleaning, setCleaning] = useState(550)
	const [garbage, setGarbage] = useState(0)
	const [closetShelves, setClosetShelves] = useState(0)
	const [luxWarranty, setLuxWarranty] = useState(0)
	const [tempHeat, setTempHeat] = useState(2000)
	const [miscAmt, setMiscAmt] = useState(0)
	const [profit, setProfit] = useState(50000)
	const [contingencyPct, setContingencyPct] = useState(5)

	// ─── RE Commission ───
	const [reLandIncluded, setReLandIncluded] = useState(true)
	const [reCommPct, setReCommPct] = useState(0.05)

	// ─── Financing ───
	const [loanAmount, setLoanAmount] = useState(0)
	const [loanRatePct, setLoanRatePct] = useState(7)
	const [loanMonths, setLoanMonths] = useState(12)

	// ─── Dashboard ───
	const [salePrice, setSalePrice] = useState(0)

	// ─── Save / Load ───
	const [estimateId, setEstimateId] = useState<string | null>(null)
	const [linkedJobId, setLinkedJobId] = useState<string | null>(null)
	const [savedList, setSavedList] = useState<SavedEstimate[]>([])
	const [linkingJob, setLinkingJob] = useState(false)

	useEffect(() => {
		try { setSavedList(JSON.parse(localStorage.getItem("kh-estimates") || "[]")) } catch { /* ignore */ }
	}, [])

	// Apply an estimate loaded from the DB (e.g. via ?estimate= URL param or clicking in the list)
	const applyDbEstimate = (est: HouseEstimate) => {
		applyState(est.data as unknown as SavedEstimate)
		setEstimateId(est.id)
		setLinkedJobId(est.jobId)
	}

	useEffect(() => {
		if (initialEstimate) applyDbEstimate(initialEstimate)
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const handleLinkJob = async (jobId: string | null) => {
		if (!estimateId) return
		setLinkingJob(true)
		await linkEstimateToJobAction(estimateId, jobId)
		setLinkedJobId(jobId)
		setLinkingJob(false)
	}

	const [saveName, setSaveName] = useState("")
	const [saveError, setSaveError] = useState<string | null>(null)
	const [saving, setSaving] = useState(false)
	const [tab, setTab] = useState<"info" | "dimensions" | "costs" | "rates" | "review">("info")

	// ─── Serialise / load state ───────────────────────────────────────────────
	const serializeState = (): Omit<SavedEstimate, "version" | "name" | "savedAt"> => ({
		client, date, location, agent,
		houseWidth, houseLength, storeys, dimBsmt, dimGarage, dimWallHt, dimOpenings, dimBaseboardLF,
		ovrFootingLF, ovrWallLF, ovrSlabSqft, ovrElecBsmt, ovrPaintSqft,
		ovrFramingHouse, ovrFramingBsmt, ovrFramingGarage,
		ovrInsulWall, ovrInsulCeil, ovrGyrocSqft, ovrTrimOpenings, ovrTrimBaseboard,
		lotPrice, engineering, surveys, legal, city, blueprints,
		excavationIncluded, excavationAmt, wellDepth, wellPumpDist, wellCustom, wellCustomAmt,
		septic, rockBustingHrs, fill, stone,
		concreteM3, concretePump, concreteWinterMix, foundCoating,
		bennettsHH, trussesIncluded, trussesAmt, windowsDoorsAmt, windowType, foundInsuSheets,
		plumbingAmt, plumbingMisc, sidingAmt, electricalDwellingType,
		paintMisc, cabinets, floorAllow, floorLabour, floorUnderlaySheets,
		floorRailsSpindles, floorHardwoodStairs, floorStairLabour,
		hvacSecondaryHeat, hvacMicrowave, tileMaterialRate, tileSqft,
		frontDeck, rearDeck, shingleBundles,
		lightsAllowance, lightsPotLights,
		powderRooms, ensuiteCount, ensuiteShowerType, mainBathCount, mainShowerType,
		aptBathCount, aptShowerType,
		landscapingFull, driveway, windowWells,
		unforeseenLabour, cleaning, garbage, closetShelves, luxWarranty, tempHeat, miscAmt, profit,
		reLandIncluded, reCommPct, salePrice, loanAmount, loanRatePct, loanMonths, contingencyPct,
	})

	const applyState = (s: SavedEstimate) => {
		setClient(s.client); setDate(s.date); setLocation(s.location); setAgent(s.agent)
		setHouseWidth(s.houseWidth); setHouseLength(s.houseLength); setStoreys(s.storeys)
		setDimBsmt(s.dimBsmt); setDimGarage(s.dimGarage); setDimWallHt(s.dimWallHt)
		setDimOpenings(s.dimOpenings); setDimBaseboardLF(s.dimBaseboardLF)
		setOvrFootingLF(s.ovrFootingLF); setOvrWallLF(s.ovrWallLF); setOvrSlabSqft(s.ovrSlabSqft)
		setOvrElecBsmt(s.ovrElecBsmt); setOvrPaintSqft(s.ovrPaintSqft)
		setOvrFramingHouse(s.ovrFramingHouse); setOvrFramingBsmt(s.ovrFramingBsmt); setOvrFramingGarage(s.ovrFramingGarage)
		setOvrInsulWall(s.ovrInsulWall); setOvrInsulCeil(s.ovrInsulCeil)
		setOvrGyrocSqft(s.ovrGyrocSqft); setOvrTrimOpenings(s.ovrTrimOpenings); setOvrTrimBaseboard(s.ovrTrimBaseboard)
		setLotPrice(s.lotPrice); setEngineering(s.engineering); setSurveys(s.surveys); setLegal(s.legal)
		setCity(s.city); setBlueprints(s.blueprints)
		setExcavationIncluded(s.excavationIncluded); setExcavationAmt(s.excavationAmt)
		setWellDepth(s.wellDepth); setWellPumpDist(s.wellPumpDist)
		setWellCustom(s.wellCustom); setWellCustomAmt(s.wellCustomAmt)
		setSeptic(s.septic); setRockBustingHrs(s.rockBustingHrs); setFill(s.fill); setStone(s.stone)
		setConcreteM3(s.concreteM3); setConcretePump(s.concretePump); setConcreteWinterMix(s.concreteWinterMix)
		setFoundCoating(s.foundCoating); setBennettsHH(s.bennettsHH)
		setTrussesIncluded(s.trussesIncluded); setTrussesAmt(s.trussesAmt)
		setWindowsDoorsAmt(s.windowsDoorsAmt); setWindowType(s.windowType); setFoundInsuSheets(s.foundInsuSheets)
		setPlumbingAmt(s.plumbingAmt); setPlumbingMisc(s.plumbingMisc); setSidingAmt(s.sidingAmt)
		setElectricalDwellingType(s.electricalDwellingType); setPaintMisc(s.paintMisc); setCabinets(s.cabinets)
		setFloorAllow(s.floorAllow); setFloorLabour(s.floorLabour); setFloorUnderlaySheets(s.floorUnderlaySheets)
		setFloorRailsSpindles(s.floorRailsSpindles); setFloorHardwoodStairs(s.floorHardwoodStairs); setFloorStairLabour(s.floorStairLabour)
		setHvacSecondaryHeat(s.hvacSecondaryHeat); setHvacMicrowave(s.hvacMicrowave)
		setTileMaterialRate(s.tileMaterialRate); setTileSqft(s.tileSqft)
		setFrontDeck(s.frontDeck); setRearDeck(s.rearDeck); setShingleBundles(s.shingleBundles)
		setLightsAllowance(s.lightsAllowance); setLightsPotLights(s.lightsPotLights)
		setPowderRooms(s.powderRooms); setEnsuiteCount(s.ensuiteCount); setEnsuiteShowerType(s.ensuiteShowerType)
		setMainBathCount(s.mainBathCount); setMainShowerType(s.mainShowerType)
		setAptBathCount(s.aptBathCount); setAptShowerType(s.aptShowerType)
		setLandscapingFull(s.landscapingFull); setDriveway(s.driveway); setWindowWells(s.windowWells)
		setUnforeseenLabour(s.unforeseenLabour); setCleaning(s.cleaning); setGarbage(s.garbage)
		setClosetShelves(s.closetShelves); setLuxWarranty(s.luxWarranty); setTempHeat(s.tempHeat)
		setMiscAmt(s.miscAmt); setProfit(s.profit)
		setReLandIncluded(s.reLandIncluded); setReCommPct(s.reCommPct)
		setSalePrice(s.salePrice); setLoanAmount(s.loanAmount); setLoanRatePct(s.loanRatePct)
		setLoanMonths(s.loanMonths); setContingencyPct(s.contingencyPct)
	}

	const handleSave = async () => {
		const name = saveName.trim()
		if (!name || saving) return
		setSaveError(null)
		setSaving(true)
		const entry: SavedEstimate = { version: 1, name, savedAt: new Date().toISOString(), ...serializeState() }
		const next = [...savedList.filter(s => s.name !== name), entry]
		setSavedList(next)
		localStorage.setItem("kh-estimates", JSON.stringify(next))
		try {
			const result = await saveEstimateAction(name, serializeState() as Record<string, unknown>, estimateId ?? undefined)
			if (result.id) {
				setEstimateId(result.id)
				setSaveName("")
			} else {
				setSaveError("Sign in first to enable quote requests.")
			}
		} catch {
			setSaveError("Save failed — check your connection and try again.")
		} finally {
			setSaving(false)
		}
	}

	const handleSaveForQuote = async (): Promise<string | null> => {
		const name = saveName.trim() || client.trim() || "Unnamed Estimate"
		const result = await saveEstimateAction(name, serializeState() as Record<string, unknown>, estimateId ?? undefined)
		if (result.id) setEstimateId(result.id)
		return result.id
	}

	const handleDelete = (name: string) => {
		const next = savedList.filter(s => s.name !== name)
		setSavedList(next)
		localStorage.setItem("kh-estimates", JSON.stringify(next))
	}

	const handlePrint = () => {
		const printDate = date || new Date().toLocaleDateString("en-CA")
		const rows = summarySections
			.filter(s => s.total > 0)
			.map(s => `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${s.label}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-variant-numeric:tabular-nums">${fd(s.total)}</td></tr>`)
			.join("")

		const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Estimate – ${client || "Kestrel Developments"}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Helvetica Neue",Helvetica,Arial,sans-serif;color:#1a1a1a;padding:48px;font-size:13px;line-height:1.6}
.hdr{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:3px solid #8b2c2c;margin-bottom:36px}
.co h1{font-size:22px;font-weight:700;color:#8b2c2c}
.co p{color:#666;font-size:12px;margin-top:2px}
.doctype{font-size:28px;font-weight:700;color:#8b2c2c;letter-spacing:3px}
.docdate{color:#666;font-size:12px;text-align:right;margin-top:4px}
.section-lbl{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#8b2c2c;margin-bottom:8px}
table{width:100%;border-collapse:collapse}
.proj-table td{padding:7px 12px;font-size:13px;border-bottom:1px solid #eee}
.proj-table td:first-child{font-weight:600;color:#555;width:130px;background:#f9f7f6}
.cost-table th{padding:8px 12px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#555;border-bottom:2px solid #ddd}
.cost-table th:last-child{text-align:right}
.total-row td{border-top:2px solid #1a1a1a!important;font-weight:700;font-size:14px;padding-top:14px!important;border-bottom:none!important}
.grand{background:#8b2c2c;color:#fff;padding:20px 24px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;margin:28px 0}
.grand .lbl{font-size:13px;font-weight:600;opacity:.85}
.grand .amt{font-size:28px;font-weight:700;font-variant-numeric:tabular-nums}
.note{border:1px solid #e5e5e5;border-radius:6px;padding:12px 16px;font-size:11px;color:#666;margin-bottom:40px}
.sigs{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:48px}
.sig-line{border-top:1px solid #333;margin-top:56px;padding-top:6px;font-size:11px;color:#666}
@media print{body{padding:24px}}
</style></head><body>
<div class="hdr">
  <div class="co"><h1>Kestrel Developments</h1><p>Custom Home Builder &middot; Newfoundland &amp; Labrador</p></div>
  <div><div class="doctype">ESTIMATE</div><div class="docdate">${printDate}</div></div>
</div>
${(client || location || agent) ? `
<p class="section-lbl">Project Details</p>
<table class="proj-table" style="margin-bottom:32px">
${client ? `<tr><td>Client</td><td>${client}</td></tr>` : ""}
${location ? `<tr><td>Location</td><td>${location}</td></tr>` : ""}
${date ? `<tr><td>Date</td><td>${date}</td></tr>` : ""}
${agent ? `<tr><td>Agent / Rep</td><td>${agent}</td></tr>` : ""}
</table>` : ""}
<p class="section-lbl">Cost Summary</p>
<table class="cost-table" style="margin-bottom:8px">
<thead><tr><th>Description</th><th style="text-align:right">Amount (incl. HST)</th></tr></thead>
<tbody>${rows}<tr class="total-row"><td style="padding:14px 12px 8px">Total</td><td style="padding:14px 12px 8px;text-align:right;font-variant-numeric:tabular-nums">${fd(c.grandTotal)}</td></tr></tbody>
</table>
<div class="grand"><div class="lbl">Total Estimate (incl. HST)</div><div class="amt">${fd(c.grandTotal)}</div></div>
<div class="note">This estimate is valid for 30 days from the date above and is subject to change based on final drawings, site conditions, and material availability. All amounts shown include HST (15%). This document is not a contract.</div>
<div class="sigs">
  <div><div class="sig-line">Authorized &mdash; Kestrel Developments</div></div>
  <div><div class="sig-line">Client Acceptance &amp; Date</div></div>
</div>
</body></html>`

		const blob = new Blob([html], { type: "text/html" })
		const url = URL.createObjectURL(blob)
		const w = window.open(url, "_blank")
		if (w) setTimeout(() => URL.revokeObjectURL(url), 60_000)
	}

	// ─── Calculations ─────────────────────────────────────────────────────────
	const c = useMemo(() => {
		// Phase 1: Geometry
		const floorSqft = houseWidth * houseLength
		const totalHouseSqft = floorSqft * storeys
		const perimLF = 2 * (houseWidth + houseLength)
		const wallHtEff = ([8, 9, 10] as number[]).includes(dimWallHt) ? dimWallHt : 9
		const wallSqft = perimLF * storeys * dimWallHt * 1.5
		const ceilingSqft = floorSqft
		const drywallSqft = wallSqft + (storeys + 1) * floorSqft

		// Phase 2: Resolved linked fields
		const effFootingLF = ovrFootingLF ?? perimLF
		const effWallLF = ovrWallLF ?? perimLF
		const effSlabSqft = ovrSlabSqft ?? dimBsmt
		const effElecBsmt = ovrElecBsmt ?? dimBsmt
		const effPaintSqft = ovrPaintSqft ?? drywallSqft
		const effFramingHouse = ovrFramingHouse ?? totalHouseSqft
		const effFramingBsmt = ovrFramingBsmt ?? dimBsmt
		const effFramingGarage = ovrFramingGarage ?? dimGarage
		const effInsulWall = ovrInsulWall ?? wallSqft
		const effInsulCeil = ovrInsulCeil ?? ceilingSqft
		const effGyrocSqft = ovrGyrocSqft ?? drywallSqft
		const effTrimOpenings = ovrTrimOpenings ?? dimOpenings
		const effTrimBaseboard = ovrTrimBaseboard ?? dimBaseboardLF

		// Phase 3: Section calculations
		// Soft Costs
		const lotHST = h(lotPrice)
		const permitAmt = PERMIT_COSTS[city] ?? 0
		const softSub = lotPrice + engineering + surveys + legal + permitAmt + blueprints
		const softHST = lotHST
		const softTotal = softSub + softHST

		// Lot Prep
		const excavAmt = excavationIncluded ? 0 : excavationAmt
		const wellAmt = wellCustom ? wellCustomAmt : (WELL_DRILL_COSTS[wellDepth] ?? 0) + (WELL_PUMP_COSTS[wellPumpDist] ?? 0)
		const rockAmt = rockBustingHrs * 275
		const stoneHST = h(stone)
		const lotPrepSub = excavAmt + wellAmt + septic + rockAmt + fill + stone
		const lotPrepHST = stoneHST
		const lotPrepTotal = lotPrepSub + lotPrepHST

		// Concrete
		const concMatSub = concreteM3 * CONCRETE_PER_M3 + (concretePump ? CONCRETE_PUMP : 0) + (concreteWinterMix ? CONCRETE_WINTER_MIX : 0)
		const concMatHST = h(concMatSub)
		const footingLabSub = effFootingLF * FOOTING_LABOUR_RATE
		const footingLabHST = h(footingLabSub)
		const wallLabRate = FOUND_WALL_RATES[wallHtEff] ?? 31.5
		const wallLabSub = effWallLF * wallLabRate
		const wallLabHST = h(wallLabSub)
		const slabSub = effSlabSqft * SLAB_FINISH_RATE
		const slabHST = h(slabSub)
		const foundCoatHST = h(foundCoating)
		const concreteSub = concMatSub + footingLabSub + wallLabSub + slabSub + foundCoating
		const concreteHST = concMatHST + footingLabHST + wallLabHST + slabHST + foundCoatHST
		const concreteTotal = concreteSub + concreteHST

		// Building Materials
		const windowMult = windowType === "Low E" ? 1.15 : 1
		const windowsSub = windowsDoorsAmt * windowMult
		const foundInsuSub = foundInsuSheets * FOUND_INSUL_CM2_RATE
		const trussActual = trussesIncluded ? 0 : trussesAmt
		const buildMatSub = bennettsHH + trussActual + windowsSub + foundInsuSub
		const buildMatHST = h(buildMatSub)
		const buildMatTotal = buildMatSub + buildMatHST

		// Subtrades
		const plumbSub = plumbingAmt + plumbingMisc
		const plumbHST = h(plumbSub)
		const sidingHST = h(sidingAmt)
		const elecBase = ELECTRICAL_RATES[electricalDwellingType] ?? 10000
		const elecSub = elecBase + effElecBsmt * ELECTRICAL_BSMT_RATE
		const elecHST = h(elecSub)
		const paintSub = effPaintSqft * PAINT_RATE + paintMisc
		const paintHST = h(paintSub)
		const cabHST = h(cabinets)
		const floorSub = floorAllow + floorLabour + floorUnderlaySheets * UNDERLAY_SHEET_RATE + floorRailsSpindles + floorHardwoodStairs + floorStairLabour
		const floorHST = h(floorSub)
		const hvacSub = HVAC_BASE + (HVAC_MINI_SPLITS[hvacSecondaryHeat] ?? 0) + (HVAC_MICROWAVE[hvacMicrowave] ?? 0)
		const hvacHST = h(hvacSub)
		const tileSub = tileSqft * (tileMaterialRate + TILE_INSTALL_RATE)
		const tileHST = h(tileSub)
		const subtradesSub = plumbSub + sidingAmt + elecSub + paintSub + cabinets + floorSub + hvacSub + tileSub
		const subtradesHST = plumbHST + sidingHST + elecHST + paintHST + cabHST + floorHST + hvacHST + tileHST
		const subtradesTotal = subtradesSub + subtradesHST

		// Labour Only
		const frontDeckHST = h(frontDeck)
		const rearDeckHST = h(rearDeck)
		const framingSub = effFramingHouse * FRAMING_HOUSE_RATE + effFramingBsmt * FRAMING_BSMT_RATE + effFramingGarage * FRAMING_GARAGE_RATE
		const framingHST = h(framingSub)
		const shinglesSub = shingleBundles * SHINGLE_PER_BUNDLE
		const shinglesHST = h(shinglesSub)
		const insulWallSub = effInsulWall * INSUL_WALL_RATE
		const insulWallHST = h(insulWallSub)
		const insulCeilSub = effInsulCeil * INSUL_CEIL_RATE
		const insulCeilHST = h(insulCeilSub)
		const gyrocSub = effGyrocSqft * GYPROC_RATE
		const gyrocHST = h(gyrocSub)
		const trimSub = effTrimOpenings * TRIM_OPENING_RATE + effTrimBaseboard * TRIM_BASEBOARD_RATE
		const trimHST = h(trimSub)
		const labourSub = frontDeck + rearDeck + framingSub + shinglesSub + insulWallSub + insulCeilSub + gyrocSub + trimSub
		const labourHST = frontDeckHST + rearDeckHST + framingHST + shinglesHST + insulWallHST + insulCeilHST + gyrocHST + trimHST
		const labourTotal = labourSub + labourHST

		// Interior Finishes
		const lightsSub = lightsAllowance + lightsPotLights
		const kitchenSub = electricalDwellingType === "Two-Apartment" ? KITCHEN_APT : KITCHEN_SINGLE
		const kitchenHST = h(kitchenSub)
		const powderSub = powderRooms * (SHOWER_TYPE_COSTS["Powder Room"] ?? 1000)
		const powderHST = h(powderSub)
		const ensuiteSub = ensuiteCount * ((SHOWER_TYPE_COSTS[ensuiteShowerType] ?? 1300) + SHOWER_FIXTURES)
		const ensuiteHST = h(ensuiteSub)
		const mainBathSub = mainBathCount * ((SHOWER_TYPE_COSTS[mainShowerType] ?? 1300) + SHOWER_FIXTURES)
		const mainBathHST = h(mainBathSub)
		const aptBathSub = electricalDwellingType === "Two-Apartment" ? aptBathCount * ((SHOWER_TYPE_COSTS[aptShowerType] ?? 1300) + SHOWER_FIXTURES) : 0
		const aptBathHST = h(aptBathSub)
		const intFinSub = lightsSub + kitchenSub + powderSub + ensuiteSub + mainBathSub + aptBathSub
		const intFinHST = kitchenHST + powderHST + ensuiteHST + mainBathHST + aptBathHST
		const intFinTotal = intFinSub + intFinHST

		// Landscaping
		const landFullHST = h(landscapingFull)
		const windowWellsHST = h(windowWells)
		const landscapeSub = landscapingFull + driveway + windowWells
		const landscapeHST = landFullHST + windowWellsHST
		const landscapeTotal = landscapeSub + landscapeHST

		// Contingency (on construction sections only)
		const constructionBase = lotPrepSub + concreteSub + buildMatSub + subtradesSub + labourSub
		const contingencyAmt = constructionBase * (contingencyPct / 100)
		const contingencyHST = h(contingencyAmt)
		const contingencyTotal = contingencyAmt + contingencyHST

		// Overhead
		const closetHST = h(closetShelves)
		const tempHeatHST = h(tempHeat)
		const overheadSub = unforeseenLabour + cleaning + garbage + closetShelves + luxWarranty + tempHeat + miscAmt + profit + contingencyAmt
		const overheadHST = closetHST + tempHeatHST + contingencyHST
		const overheadTotal = overheadSub + overheadHST

		// Financing
		const financingSub = loanAmount * (loanRatePct / 100) * (loanMonths / 12)
		const financingHST = h(financingSub)
		const financingTotal = financingSub + financingHST

		// Pre-commission total
		const preTotalSub = softSub + lotPrepSub + concreteSub + buildMatSub + subtradesSub + labourSub + intFinSub + landscapeSub + overheadSub + financingSub
		const preTotalHST = softHST + lotPrepHST + concreteHST + buildMatHST + subtradesHST + labourHST + intFinHST + landscapeHST + overheadHST + financingHST
		const preTotal = preTotalSub + preTotalHST

		// RE Commission
		const reBase = reLandIncluded ? preTotal : preTotal - (lotPrice + lotHST)
		const reCommSub = reBase * reCommPct
		const reCommHST = h(reCommSub)
		const reCommTotal = reCommSub + reCommHST

		// Grand Total
		const grandTotal = preTotal + reCommTotal

		// Dashboard metrics
		const netProfit = salePrice > 0 ? salePrice - grandTotal : 0
		const grossMarginPct = salePrice > 0 ? (netProfit / salePrice) * 100 : 0
		const costPerSqft = totalHouseSqft > 0 ? grandTotal / totalHouseSqft : 0
		const profitPerSqft = totalHouseSqft > 0 && salePrice > 0 ? netProfit / totalHouseSqft : 0

		// Per-section $/sqft
		const sqftOf = (v: number) => totalHouseSqft > 0 ? v / totalHouseSqft : 0

		return {
			// Geometry
			floorSqft, totalHouseSqft, perimLF, wallSqft, ceilingSqft, drywallSqft, wallHtEff,
			// Effective linked values (for display in inputs)
			effFootingLF, effWallLF, effSlabSqft, effElecBsmt, effPaintSqft,
			effFramingHouse, effFramingBsmt, effFramingGarage,
			effInsulWall, effInsulCeil, effGyrocSqft, effTrimOpenings, effTrimBaseboard,
			// Soft Costs
			lotHST, permitAmt, softSub, softHST, softTotal,
			// Lot Prep
			excavAmt, wellAmt, rockAmt, stoneHST, lotPrepSub, lotPrepHST, lotPrepTotal,
			// Concrete
			concMatSub, concMatHST, footingLabSub, footingLabHST, wallLabRate,
			wallLabSub, wallLabHST, slabSub, slabHST, foundCoatHST,
			concreteSub, concreteHST, concreteTotal,
			// Building Materials
			windowsSub, foundInsuSub, trussActual, buildMatSub, buildMatHST, buildMatTotal,
			// Subtrades
			plumbSub, plumbHST, sidingHST, elecSub, elecHST,
			paintSub, paintHST, cabHST, floorSub, floorHST,
			hvacSub, hvacHST, tileSub, tileHST,
			subtradesSub, subtradesHST, subtradesTotal,
			// Labour
			frontDeckHST, rearDeckHST, framingSub, framingHST,
			shinglesSub, shinglesHST, insulWallSub, insulWallHST,
			insulCeilSub, insulCeilHST, gyrocSub, gyrocHST, trimSub, trimHST,
			labourSub, labourHST, labourTotal,
			// Interior
			lightsSub, kitchenSub, kitchenHST, powderSub, powderHST,
			ensuiteSub, ensuiteHST, mainBathSub, mainBathHST,
			aptBathSub, aptBathHST, intFinSub, intFinHST, intFinTotal,
			// Landscaping
			landFullHST, windowWellsHST, landscapeSub, landscapeHST, landscapeTotal,
			// Contingency
			contingencyAmt, contingencyHST, contingencyTotal,
			// Overhead
			closetHST, tempHeatHST, overheadSub, overheadHST, overheadTotal,
			// Financing
			financingSub, financingHST, financingTotal,
			// Totals
			preTotal, reCommSub, reCommHST, reCommTotal, grandTotal,
			// Dashboard
			netProfit, grossMarginPct, costPerSqft, profitPerSqft, sqftOf,
		}
	}, [
		houseWidth, houseLength, storeys, dimBsmt, dimGarage, dimWallHt, dimOpenings, dimBaseboardLF,
		ovrFootingLF, ovrWallLF, ovrSlabSqft, ovrElecBsmt, ovrPaintSqft,
		ovrFramingHouse, ovrFramingBsmt, ovrFramingGarage,
		ovrInsulWall, ovrInsulCeil, ovrGyrocSqft, ovrTrimOpenings, ovrTrimBaseboard,
		lotPrice, engineering, surveys, legal, city, blueprints,
		excavationIncluded, excavationAmt, wellDepth, wellPumpDist, wellCustom, wellCustomAmt,
		septic, rockBustingHrs, fill, stone,
		concreteM3, concretePump, concreteWinterMix, foundCoating,
		bennettsHH, trussesIncluded, trussesAmt, windowsDoorsAmt, windowType, foundInsuSheets,
		plumbingAmt, plumbingMisc, sidingAmt, electricalDwellingType,
		paintMisc, cabinets, floorAllow, floorLabour, floorUnderlaySheets,
		floorRailsSpindles, floorHardwoodStairs, floorStairLabour,
		hvacSecondaryHeat, hvacMicrowave, tileMaterialRate, tileSqft,
		frontDeck, rearDeck, shingleBundles,
		lightsAllowance, lightsPotLights,
		powderRooms, ensuiteCount, ensuiteShowerType, mainBathCount, mainShowerType, aptBathCount, aptShowerType,
		landscapingFull, driveway, windowWells,
		unforeseenLabour, cleaning, garbage, closetShelves, luxWarranty, tempHeat, miscAmt, profit, contingencyPct,
		reLandIncluded, reCommPct, salePrice, loanAmount, loanRatePct, loanMonths,
	])

	const showerOpts = Object.keys(SHOWER_TYPE_COSTS).map(k => ({ value: k, label: k }))
	const marginColor = salePrice === 0 ? "text-neutral-400"
		: c.grossMarginPct < 10 ? "text-red-600"
		: c.grossMarginPct < 15 ? "text-yellow-600"
		: "text-green-600"

	const summarySections = [
		{ label: "Soft Costs", total: c.softTotal },
		{ label: "Lot Prep", total: c.lotPrepTotal },
		{ label: "Concrete", total: c.concreteTotal },
		{ label: "Building Materials", total: c.buildMatTotal },
		{ label: "Subtrades", total: c.subtradesTotal },
		{ label: "Labour Only", total: c.labourTotal },
		{ label: "Interior Finishes", total: c.intFinTotal },
		{ label: "Landscaping", total: c.landscapeTotal },
		{ label: "Overhead & Contingency", total: c.overheadTotal },
		{ label: "Financing", total: c.financingTotal },
		{ label: "RE Commission", total: c.reCommTotal },
	]

	const TAB_LABELS = { info: "Project Info", dimensions: "Dimensions", costs: "Cost Breakdown", rates: "Cost Rates", review: "Review & Send" }
	const TABS = ["info", "dimensions", "costs", "rates", "review"] as const

	return (
		<div className="space-y-4">

			{/* ── Sticky header: banner + tab bar ─────────────────────────────────── */}
			<div className="sticky top-0 z-10">
				{c.grandTotal > 0 && (
					<div className="rounded-t-xl border border-brand-700 bg-brand-600 px-5 py-3 shadow-lg">
						<div className="flex flex-wrap items-center justify-between gap-4">
							<div>
								<p className="text-xs font-medium text-brand-200 uppercase tracking-wide">Estimate Total (incl. HST)</p>
								<p className="text-3xl font-bold text-white tabular-nums">{fd(c.grandTotal)}</p>
							</div>
							<div className="flex flex-wrap gap-6 text-sm items-center">
								<div>
									<p className="text-brand-300 text-xs">Pre-commission</p>
									<p className="text-white font-semibold tabular-nums">{fd(c.preTotal)}</p>
								</div>
								{c.totalHouseSqft > 0 && (
									<div>
										<p className="text-brand-300 text-xs">Cost / sqft</p>
										<p className="text-white font-semibold tabular-nums">{fd(c.costPerSqft)}</p>
									</div>
								)}
								{salePrice > 0 && (
									<div>
										<p className="text-brand-300 text-xs">Margin</p>
										<p className={cn("font-semibold tabular-nums", c.grossMarginPct < 10 ? "text-red-300" : c.grossMarginPct < 15 ? "text-yellow-300" : "text-green-300")}>
											{c.grossMarginPct.toFixed(1)}%
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				)}
				<div className={cn(
					"flex bg-white border border-neutral-200 shadow-sm overflow-hidden",
					c.grandTotal > 0 ? "rounded-b-xl border-t-0" : "rounded-xl"
				)}>
					{TABS.map((key, i) => (
						<button key={key} onClick={() => setTab(key)}
							className={cn(
								"flex-1 px-3 py-3 text-sm font-medium border-b-2 transition-colors",
								i > 0 && "border-l border-neutral-100",
								tab === key
									? "border-brand-600 text-brand-700 bg-brand-50/50"
									: "border-transparent text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
							)}>
							{TAB_LABELS[key]}
						</button>
					))}
				</div>
			</div>

			{/* ── Tab: Project Info ─────────────────────────────────────────────────── */}
			{tab === "info" && (
				<div className="space-y-4">
					<div className="rounded-xl border border-neutral-200 bg-white p-5">
						<h2 className="text-lg font-semibold text-neutral-900 mb-4">Kestrel Developments — Estimate Form</h2>
						<div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
							<Txt label="Client" value={client} onChange={setClient} placeholder="Client name" />
							<Txt label="Date" value={date} onChange={setDate} placeholder="YYYY-MM-DD" />
							<Txt label="Location" value={location} onChange={setLocation} placeholder="Address" />
							<Txt label="Agent" value={agent} onChange={setAgent} placeholder="Agent name" />
						</div>
					</div>

					<div className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
						<p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">Sale Price & Margin</p>
						<div className="flex flex-wrap items-end gap-6">
							<Num label="Proposed sale price" value={salePrice} onChange={setSalePrice} wide />
							{salePrice > 0 && c.grandTotal > 0 && (
								<div className="flex flex-wrap gap-6 text-sm pb-0.5">
									<div>
										<p className="text-xs text-neutral-500">Gross margin</p>
										<p className={cn("text-xl font-bold tabular-nums", marginColor)}>{c.grossMarginPct.toFixed(1)}%</p>
									</div>
									<div>
										<p className="text-xs text-neutral-500">Net profit</p>
										<p className={cn("text-xl font-bold tabular-nums", c.netProfit >= 0 ? "text-green-600" : "text-red-600")}>{fd(c.netProfit)}</p>
									</div>
									{c.totalHouseSqft > 0 && (
										<>
											<div>
												<p className="text-xs text-neutral-500">Cost / sqft</p>
												<p className="text-xl font-bold text-neutral-800 tabular-nums">{fd(c.costPerSqft)}</p>
											</div>
											<div>
												<p className="text-xs text-neutral-500">Profit / sqft</p>
												<p className={cn("text-xl font-bold tabular-nums", c.profitPerSqft >= 0 ? "text-green-600" : "text-red-600")}>{fd(c.profitPerSqft)}</p>
											</div>
										</>
									)}
								</div>
							)}
							{salePrice > 0 && c.grandTotal > 0 && c.grossMarginPct < 10 && (
								<div className="rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-xs text-red-700">
									⚠ Margin below 10% — review costs or pricing
								</div>
							)}
						</div>
					</div>

					<div className="rounded-xl border border-neutral-200 bg-white p-5">
						<h3 className="font-semibold text-neutral-900 mb-1">Save Estimate</h3>
						<p className="text-xs text-neutral-500 mb-4">Saving syncs this estimate to your account and enables quote requests.</p>
						<div className="flex gap-2 mb-2">
							<input
								value={saveName}
								onChange={e => setSaveName(e.target.value)}
								onKeyDown={e => e.key === "Enter" && handleSave()}
								placeholder="Give this estimate a name…"
								className="flex-1 rounded border border-neutral-300 px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
							/>
							<button
								onClick={handleSave}
								disabled={!saveName.trim() || saving}
								className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 shrink-0 transition-colors"
							>
								{saving ? "Saving…" : "Save"}
							</button>
						</div>
						{saveError && <p className="text-xs text-red-600 mt-1">{saveError}</p>}
						{estimateId && <p className="text-xs text-green-600 mt-1">✓ Synced to account</p>}
					</div>

					{/* ── Saved estimates (from DB) ── */}
					{dbEstimates.length > 0 && (
						<div className="rounded-xl border border-neutral-200 bg-white p-5">
							<h3 className="font-semibold text-neutral-900 mb-1">Saved Estimates</h3>
							<p className="text-xs text-neutral-500 mb-4">Click any estimate to load it. Changes since last save will be lost.</p>
							<div className="space-y-2">
								{dbEstimates.map(est => {
									const linkedJob = availableJobs.find(j => j.id === est.jobId)
									const isActive = est.id === estimateId
									return (
										<div key={est.id} className={cn(
											"flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors",
											isActive ? "border-brand-300 bg-brand-50" : "border-neutral-100 bg-white hover:bg-neutral-50"
										)}>
											<button
												onClick={() => applyDbEstimate(est)}
												className="flex-1 min-w-0 text-left"
											>
												<p className={cn("text-sm font-medium truncate", isActive ? "text-brand-800" : "text-neutral-800")}>
													{est.name}
													{isActive && <span className="ml-2 text-xs font-normal text-brand-500">active</span>}
												</p>
												<p className="text-xs text-neutral-400 mt-0.5">
													{linkedJob ? <span className="text-brand-600 font-medium">{linkedJob.name}</span> : "No job linked"}
													{" · "}
													{new Date(est.updatedAt).toLocaleDateString("en-CA")}
												</p>
											</button>
										</div>
									)
								})}
							</div>
						</div>
					)}

					{/* ── Link to job ── */}
					{estimateId && (
						<div className="rounded-xl border border-neutral-200 bg-white p-5">
							<h3 className="font-semibold text-neutral-900 mb-1">Link to Job</h3>
							<p className="text-xs text-neutral-500 mb-3">Attach this estimate to a job so it appears on the job page.</p>
							<div className="flex items-center gap-2">
								<select
									value={linkedJobId ?? ""}
									onChange={e => handleLinkJob(e.target.value || null)}
									disabled={linkingJob}
									className="flex-1 rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none disabled:opacity-50"
								>
									<option value="">— No job —</option>
									{availableJobs.map(j => (
										<option key={j.id} value={j.id}>{j.name} ({j.client_name})</option>
									))}
								</select>
								{linkingJob && <span className="text-xs text-neutral-400">Saving…</span>}
								{!linkingJob && linkedJobId && (
									<span className="text-xs text-green-600 font-medium">✓ Linked</span>
								)}
							</div>
						</div>
					)}
				</div>
			)}

			{/* ── Tab: Dimensions ───────────────────────────────────────────────────── */}
			{tab === "dimensions" && (
				<div className="space-y-4">
					<div className="rounded-xl border border-brand-200 bg-brand-50/40 p-5">
						<div className="flex items-center gap-2 mb-1">
							<h3 className="font-semibold text-neutral-900">House Dimensions</h3>
							<span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-700 font-medium">Auto-links downstream fields</span>
						</div>
						<p className="text-xs text-neutral-500 mb-4">Set once — framing, insulation, paint, concrete, and trim inputs update automatically. Click any grey field below to override.</p>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
							<Num label="House width (ft)" value={houseWidth} onChange={setHouseWidth} />
							<Num label="House length (ft)" value={houseLength} onChange={setHouseLength} />
							<Sel label="Storeys" value={String(storeys)} onChange={v => setStoreys(Number(v))}
								options={[{ value: "1", label: "1 storey" }, { value: "2", label: "2 storeys" }]} />
							<Num label="Wall height (ft)" value={dimWallHt} onChange={setDimWallHt} />
							<Num label="Basement sqft" value={dimBsmt} onChange={setDimBsmt} />
							<Num label="Garage sqft" value={dimGarage} onChange={setDimGarage} />
							<Num label="# Window/door openings" value={dimOpenings} onChange={setDimOpenings} />
							<Num label="Baseboard lin ft" value={dimBaseboardLF} onChange={setDimBaseboardLF} />
						</div>
						{c.floorSqft > 0 && (
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg bg-white border border-brand-100 p-3 mb-4">
								{[
									["Floor sqft", c.floorSqft], ["Total house sqft", c.totalHouseSqft],
									["Perimeter lin ft", c.perimLF], ["Wall sqft", Math.round(c.wallSqft)],
									["Drywall sqft", Math.round(c.drywallSqft)], ["Ceiling sqft", c.ceilingSqft],
								].map(([label, val]) => (
									<div key={label as string}>
										<p className="text-xs text-neutral-500">{label as string}</p>
										<p className="text-sm font-semibold text-neutral-800 tabular-nums">{(val as number).toLocaleString()}</p>
									</div>
								))}
							</div>
						)}
						<p className="text-xs font-medium text-neutral-600 mb-2">Overridable auto-linked fields</p>
						<div className="flex flex-wrap gap-3">
							<LinkedNum label="Footing lin ft" derived={c.perimLF} override={ovrFootingLF} onOverride={setOvrFootingLF} />
							<LinkedNum label="Wall lin ft" derived={c.perimLF} override={ovrWallLF} onOverride={setOvrWallLF} />
							<LinkedNum label="Slab sqft" derived={dimBsmt} override={ovrSlabSqft} onOverride={setOvrSlabSqft} />
							<LinkedNum label="Elec. bsmt sqft" derived={dimBsmt} override={ovrElecBsmt} onOverride={setOvrElecBsmt} />
							<LinkedNum label="Paint sqft" derived={Math.round(c.drywallSqft)} override={ovrPaintSqft} onOverride={setOvrPaintSqft} />
							<LinkedNum label="Framing house sqft" derived={c.totalHouseSqft} override={ovrFramingHouse} onOverride={setOvrFramingHouse} />
							<LinkedNum label="Framing bsmt sqft" derived={dimBsmt} override={ovrFramingBsmt} onOverride={setOvrFramingBsmt} />
							<LinkedNum label="Framing garage sqft" derived={dimGarage} override={ovrFramingGarage} onOverride={setOvrFramingGarage} />
							<LinkedNum label="Insul. wall sqft" derived={Math.round(c.wallSqft)} override={ovrInsulWall} onOverride={setOvrInsulWall} />
							<LinkedNum label="Insul. ceiling sqft" derived={c.ceilingSqft} override={ovrInsulCeil} onOverride={setOvrInsulCeil} />
							<LinkedNum label="Gyproc sqft" derived={Math.round(c.drywallSqft)} override={ovrGyrocSqft} onOverride={setOvrGyrocSqft} />
							<LinkedNum label="Trim openings" derived={dimOpenings} override={ovrTrimOpenings} onOverride={setOvrTrimOpenings} />
							<LinkedNum label="Trim baseboard LF" derived={dimBaseboardLF} override={ovrTrimBaseboard} onOverride={setOvrTrimBaseboard} />
						</div>
					</div>

					<div>
						<h3 className="font-semibold text-neutral-900 mb-3">Quote Requests</h3>
						<QuotePanel
							estimateId={estimateId}
							projectName={client || location || "Unnamed Project"}
							tradeEstimates={{
								Framing: c.framingSub + c.framingHST,
								Electrical: c.elecSub + c.elecHST,
								Plumbing: c.plumbSub + c.plumbHST,
								HVAC: c.hvacSub + c.hvacHST,
								Insulation: c.insulWallSub + c.insulCeilSub + c.insulWallHST + c.insulCeilHST,
								Drywall: c.gyrocSub + c.gyrocHST,
								Flooring: c.floorSub + c.floorHST,
								Painting: c.paintSub + c.paintHST,
								Siding: sidingAmt + c.sidingHST,
								Roofing: c.shinglesSub + c.shinglesHST,
								Landscaping: c.landscapeTotal,
								Concrete: c.concreteTotal,
								Excavation: c.lotPrepTotal,
								Cabinets: cabinets + c.cabHST,
								Tile: c.tileSub + c.tileHST,
							}}
							onSaveFirst={handleSaveForQuote}
							onApplyQuote={(category, amount) => {
								const map: Record<string, (v: number) => void> = {
									Plumbing: setPlumbingAmt,
									Siding: setSidingAmt,
									Cabinets: setCabinets,
									Flooring: setFloorAllow,
									Landscaping: setLandscapingFull,
									Excavation: setExcavationAmt,
								}
								map[category]?.(amount)
							}}
						/>
					</div>
				</div>
			)}

			{/* ── Tab: Cost Breakdown ───────────────────────────────────────────────── */}
			{tab === "costs" && (
				<div>
					<Section title="Soft Costs" sectionTotal={c.softTotal}>
						<TR label="Lot Price" inputs={<Num label="Amount" value={lotPrice} onChange={setLotPrice} />}
							sub={lotPrice} hst={c.lotHST} total={lotPrice + c.lotHST} />
						<TR label="Engineering" inputs={<Num label="Amount" value={engineering} onChange={setEngineering} />}
							sub={engineering} hst={0} total={engineering} />
						<TR label="Surveys" inputs={<Num label="Amount" value={surveys} onChange={setSurveys} />}
							sub={surveys} hst={0} total={surveys} />
						<TR label="Legal" inputs={<Num label="Amount" value={legal} onChange={setLegal} />}
							sub={legal} hst={0} total={legal} />
						<TR label="Permits" note={`${city}: ${fd(c.permitAmt)}`}
							inputs={<Sel label="City" value={city} onChange={setCity} options={Object.keys(PERMIT_COSTS).map(k => ({ value: k, label: k }))} />}
							sub={c.permitAmt} hst={0} total={c.permitAmt} />
						<TR label="Blueprints" inputs={<Num label="Amount" value={blueprints} onChange={setBlueprints} />}
							sub={blueprints} hst={0} total={blueprints} />
					</Section>

					<Section title="Lot Prep" sectionTotal={c.lotPrepTotal}>
						<TR label="Excavation" muted={excavationIncluded}
							inputs={<>
								<Toggle label="Included in lot price" checked={excavationIncluded} onChange={setExcavationIncluded} />
								{!excavationIncluded && <Num label="Amount" value={excavationAmt} onChange={setExcavationAmt} />}
							</>}
							sub={c.excavAmt} hst={0} total={c.excavAmt} />
						<TR label="Well"
							note={!wellCustom ? `Drill: ${fd(WELL_DRILL_COSTS[wellDepth] ?? 0)} + Pump: ${fd(WELL_PUMP_COSTS[wellPumpDist] ?? 0)}` : undefined}
							inputs={<>
								<Toggle label="Custom amount" checked={wellCustom} onChange={setWellCustom} />
								{wellCustom ? <Num label="Amount" value={wellCustomAmt} onChange={setWellCustomAmt} />
									: <>
										<Sel label="Depth" value={String(wellDepth)} onChange={v => setWellDepth(Number(v))}
											options={Object.keys(WELL_DRILL_COSTS).map(k => ({ value: k, label: `${k} ft` }))} />
										<Sel label="Pump distance" value={wellPumpDist} onChange={setWellPumpDist}
											options={Object.keys(WELL_PUMP_COSTS).map(k => ({ value: k, label: k }))} />
									</>}
							</>}
							sub={c.wellAmt} hst={0} total={c.wellAmt} />
						<TR label="Septic" inputs={<Num label="Amount" value={septic} onChange={setSeptic} />}
							sub={septic} hst={0} total={septic} />
						<TR label="Rock Busting" note="$275/hr"
							inputs={<Num label="Hours" value={rockBustingHrs} onChange={setRockBustingHrs} />}
							sub={c.rockAmt} hst={0} total={c.rockAmt} />
						<TR label="Fill" inputs={<Num label="Amount" value={fill} onChange={setFill} />}
							sub={fill} hst={0} total={fill} />
						<TR label="Stone" inputs={<Num label="Amount" value={stone} onChange={setStone} />}
							sub={stone} hst={c.stoneHST} total={stone + c.stoneHST} />
					</Section>

					<Section title="Concrete" sectionTotal={c.concreteTotal}>
						<TR label="Material"
							note={`$${CONCRETE_PER_M3}/m³${concretePump ? ` + $${CONCRETE_PUMP} pump` : ""}${concreteWinterMix ? ` + $${CONCRETE_WINTER_MIX} winter mix` : ""}`}
							inputs={<>
								<Num label="Quantity (m³)" value={concreteM3} onChange={setConcreteM3} decimals />
								<Toggle label="Pump truck" checked={concretePump} onChange={setConcretePump} />
								<Toggle label="Winter mix" checked={concreteWinterMix} onChange={setConcreteWinterMix} />
							</>}
							sub={c.concMatSub} hst={c.concMatHST} total={c.concMatSub + c.concMatHST} />
						<TR label="Footing Labour" note={`$${FOOTING_LABOUR_RATE}/lin ft · auto-linked from perimeter`}
							inputs={<LinkedNum label="Linear feet" derived={c.perimLF} override={ovrFootingLF} onOverride={setOvrFootingLF} />}
							sub={c.footingLabSub} hst={c.footingLabHST} total={c.footingLabSub + c.footingLabHST} />
						<TR label="Concrete Walls Labour"
							note={`$${c.wallLabRate}/lin ft (${c.wallHtEff}ft wall from dimensions)`}
							inputs={<LinkedNum label="Linear feet" derived={c.perimLF} override={ovrWallLF} onOverride={setOvrWallLF} />}
							sub={c.wallLabSub} hst={c.wallLabHST} total={c.wallLabSub + c.wallLabHST} />
						<TR label="Concrete Floor Finish" note={`$${SLAB_FINISH_RATE}/sqft · auto-linked to basement sqft`}
							inputs={<LinkedNum label="Square feet" derived={dimBsmt} override={ovrSlabSqft} onOverride={setOvrSlabSqft} />}
							sub={c.slabSub} hst={c.slabHST} total={c.slabSub + c.slabHST} />
						<TR label="Foundation Coating"
							inputs={<Num label="Amount" value={foundCoating} onChange={setFoundCoating} />}
							sub={foundCoating} hst={c.foundCoatHST} total={foundCoating + c.foundCoatHST} />
					</Section>

					<Section title="Building Materials" sectionTotal={c.buildMatTotal}>
						<TR label="Bennetts HH Takeoff"
							inputs={<Num label="Amount" value={bennettsHH} onChange={setBennettsHH} />}
							sub={bennettsHH} hst={h(bennettsHH)} total={bennettsHH + h(bennettsHH)} />
						<TR label="Trusses & Floor" muted={trussesIncluded}
							inputs={<>
								<Toggle label="Included with BHH" checked={trussesIncluded} onChange={setTrussesIncluded} />
								{!trussesIncluded && <Num label="Amount" value={trussesAmt} onChange={setTrussesAmt} />}
							</>}
							sub={c.trussActual} hst={h(c.trussActual)} total={c.trussActual + h(c.trussActual)} />
						<TR label="Windows & Doors"
							note={windowType === "Low E" ? `Low E ×1.15 applied → ${fd(c.windowsSub)}` : undefined}
							inputs={<>
								<Num label="Amount" value={windowsDoorsAmt} onChange={setWindowsDoorsAmt} />
								<Sel label="Window type" value={windowType} onChange={setWindowType}
									options={[{ value: "None", label: "Standard" }, { value: "Low E", label: "Low E (×1.15)" }]} />
							</>}
							sub={c.windowsSub} hst={h(c.windowsSub)} total={c.windowsSub + h(c.windowsSub)} />
						<TR label="Foundation Insulation" note={`CM Type 2 — $${FOUND_INSUL_CM2_RATE}/sheet`}
							inputs={<Num label="# Sheets" value={foundInsuSheets} onChange={setFoundInsuSheets} decimals />}
							sub={c.foundInsuSub} hst={h(c.foundInsuSub)} total={c.foundInsuSub + h(c.foundInsuSub)} />
					</Section>

					<Section title="Subtrades (Supply & Install)" sectionTotal={c.subtradesTotal}>
						<TR label="Plumbing"
							inputs={<>
								<Num label="Base amount" value={plumbingAmt} onChange={setPlumbingAmt} />
								<Num label="Misc." value={plumbingMisc} onChange={setPlumbingMisc} />
							</>}
							sub={c.plumbSub} hst={c.plumbHST} total={c.plumbSub + c.plumbHST} />
						<TR label="Siding & Labour"
							inputs={<Num label="Amount" value={sidingAmt} onChange={setSidingAmt} />}
							sub={sidingAmt} hst={c.sidingHST} total={sidingAmt + c.sidingHST} />
						<TR label="Electrical"
							note={`${electricalDwellingType} base: ${fd(ELECTRICAL_RATES[electricalDwellingType] ?? 0)} + $${ELECTRICAL_BSMT_RATE}/bsmt sqft`}
							inputs={<>
								<Sel label="Dwelling type" value={electricalDwellingType} onChange={setElectricalDwellingType}
									options={[{ value: "Single-Family", label: "Single-Family" }, { value: "Two-Apartment", label: "Two-Apartment" }]} />
								<LinkedNum label="Bsmt sqft" derived={dimBsmt} override={ovrElecBsmt} onOverride={setOvrElecBsmt} />
							</>}
							sub={c.elecSub} hst={c.elecHST} total={c.elecSub + c.elecHST} />
						<TR label="Paint & Plastering" note={`$${PAINT_RATE}/sqft labour · auto-linked to drywall sqft`}
							inputs={<>
								<LinkedNum label="Drywall sqft" derived={Math.round(c.drywallSqft)} override={ovrPaintSqft} onOverride={setOvrPaintSqft} />
								<Num label="Misc." value={paintMisc} onChange={setPaintMisc} />
							</>}
							sub={c.paintSub} hst={c.paintHST} total={c.paintSub + c.paintHST} />
						<TR label="Cabinets"
							inputs={<Sel label="Allowance" value={String(cabinets)} onChange={v => setCabinets(Number(v))}
								options={CABINET_OPTIONS.map(n => ({ value: String(n), label: fd(n) }))} />}
							sub={cabinets} hst={c.cabHST} total={cabinets + c.cabHST} />
						<TR label="Flooring" note={`Underlay @ $${UNDERLAY_SHEET_RATE}/sheet`}
							inputs={<>
								<Num label="Floor allow." value={floorAllow} onChange={setFloorAllow} />
								<Num label="Floor labour" value={floorLabour} onChange={setFloorLabour} />
								<Num label="Underlay sheets" value={floorUnderlaySheets} onChange={setFloorUnderlaySheets} decimals />
								<Num label="Rails/spindles" value={floorRailsSpindles} onChange={setFloorRailsSpindles} />
								<Num label="Hardwood stairs" value={floorHardwoodStairs} onChange={setFloorHardwoodStairs} />
								<Num label="Stair labour" value={floorStairLabour} onChange={setFloorStairLabour} />
							</>}
							sub={c.floorSub} hst={c.floorHST} total={c.floorSub + c.floorHST} />
						<TR label="HVAC" note={`Base $${HVAC_BASE} (Air Exchanger + HRV)`}
							inputs={<>
								<Sel label="Secondary heat" value={hvacSecondaryHeat} onChange={setHvacSecondaryHeat}
									options={Object.entries(HVAC_MINI_SPLITS).map(([k, v]) => ({ value: k, label: v > 0 ? `${k} (+${fd(v)})` : k }))} />
								<Sel label="Microwave/hood" value={hvacMicrowave} onChange={setHvacMicrowave}
									options={Object.entries(HVAC_MICROWAVE).map(([k, v]) => ({ value: k, label: v > 0 ? `${k} (+${fd(v)})` : k }))} />
							</>}
							sub={c.hvacSub} hst={c.hvacHST} total={c.hvacSub + c.hvacHST} />
						<TR label="Tile" note={`Material + install ($${TILE_INSTALL_RATE}/sqft)`}
							inputs={<>
								<Num label="Material $/sqft" value={tileMaterialRate} onChange={setTileMaterialRate} decimals />
								<Num label="Sqft" value={tileSqft} onChange={setTileSqft} />
							</>}
							sub={c.tileSub} hst={c.tileHST} total={c.tileSub + c.tileHST} />
					</Section>

					<Section title="Labour Only" sectionTotal={c.labourTotal}>
						<TR label="Front Deck"
							inputs={<Num label="Amount" value={frontDeck} onChange={setFrontDeck} />}
							sub={frontDeck} hst={c.frontDeckHST} total={frontDeck + c.frontDeckHST} />
						<TR label="Rear Deck"
							inputs={<Num label="Amount" value={rearDeck} onChange={setRearDeck} />}
							sub={rearDeck} hst={c.rearDeckHST} total={rearDeck + c.rearDeckHST} />
						<TR label="Framing"
							note={`House $${FRAMING_HOUSE_RATE} · Bsmt $${FRAMING_BSMT_RATE} · Garage $${FRAMING_GARAGE_RATE} / sqft`}
							inputs={<>
								<LinkedNum label="House sqft" derived={c.totalHouseSqft} override={ovrFramingHouse} onOverride={setOvrFramingHouse} />
								<LinkedNum label="Bsmt sqft" derived={dimBsmt} override={ovrFramingBsmt} onOverride={setOvrFramingBsmt} />
								<LinkedNum label="Garage sqft" derived={dimGarage} override={ovrFramingGarage} onOverride={setOvrFramingGarage} />
							</>}
							sub={c.framingSub} hst={c.framingHST} total={c.framingSub + c.framingHST} />
						<TR label="Shingles Labour" note={`$${SHINGLE_PER_BUNDLE}/bundle ($90/3 bundles)`}
							inputs={<Num label="# Bundles" value={shingleBundles} onChange={setShingleBundles} />}
							sub={c.shinglesSub} hst={c.shinglesHST} total={c.shinglesSub + c.shinglesHST} />
						<TR label="Insulation/VB — Walls" note={`Install batts/VB @ $${INSUL_WALL_RATE}/sqft`}
							inputs={<LinkedNum label="Wall sqft" derived={Math.round(c.wallSqft)} override={ovrInsulWall} onOverride={setOvrInsulWall} />}
							sub={c.insulWallSub} hst={c.insulWallHST} total={c.insulWallSub + c.insulWallHST} />
						<TR label="Insulation/VB — Ceiling" note={`VB + Attic R50 @ $${INSUL_CEIL_RATE}/sqft`}
							inputs={<LinkedNum label="Ceiling sqft" derived={c.ceilingSqft} override={ovrInsulCeil} onOverride={setOvrInsulCeil} />}
							sub={c.insulCeilSub} hst={c.insulCeilHST} total={c.insulCeilSub + c.insulCeilHST} />
						<TR label="Gyproc Install" note={`$${GYPROC_RATE}/sqft (4×8 sheet)`}
							inputs={<LinkedNum label="Drywall sqft" derived={Math.round(c.drywallSqft)} override={ovrGyrocSqft} onOverride={setOvrGyrocSqft} />}
							sub={c.gyrocSub} hst={c.gyrocHST} total={c.gyrocSub + c.gyrocHST} />
						<TR label="Trim" note={`$${TRIM_OPENING_RATE}/opening + $${TRIM_BASEBOARD_RATE}/lin ft baseboard`}
							inputs={<>
								<LinkedNum label="# Openings" derived={dimOpenings} override={ovrTrimOpenings} onOverride={setOvrTrimOpenings} />
								<LinkedNum label="Baseboard LF" derived={dimBaseboardLF} override={ovrTrimBaseboard} onOverride={setOvrTrimBaseboard} />
							</>}
							sub={c.trimSub} hst={c.trimHST} total={c.trimSub + c.trimHST} />
					</Section>

					<Section title="Interior Finishes (Material Only)" sectionTotal={c.intFinTotal}>
						<TR label="Lights" note="No HST"
							inputs={<>
								<Num label="Allowance" value={lightsAllowance} onChange={setLightsAllowance} />
								<Num label="# Pot lights" value={lightsPotLights} onChange={setLightsPotLights} />
							</>}
							sub={c.lightsSub} hst={0} total={c.lightsSub} />
						<TR label="Kitchen Sink/Fixtures"
							note={`${electricalDwellingType === "Two-Apartment" ? "Two kitchens" : "Single kitchen"}: ${fd(c.kitchenSub)}`}
							inputs={null} sub={c.kitchenSub} hst={c.kitchenHST} total={c.kitchenSub + c.kitchenHST} />
						<TR label="Bathroom — Powder Room" note="$1,000/powder room"
							inputs={<Num label="# Powder rooms" value={powderRooms} onChange={setPowderRooms} />}
							sub={c.powderSub} hst={c.powderHST} total={c.powderSub + c.powderHST} />
						<TR label="Bathroom — Ensuite" note="Shower type + fixtures ($1,485)"
							inputs={<>
								<Num label="# Ensuites" value={ensuiteCount} onChange={setEnsuiteCount} />
								<Sel label="Shower type" value={ensuiteShowerType} onChange={setEnsuiteShowerType} options={showerOpts} />
							</>}
							sub={c.ensuiteSub} hst={c.ensuiteHST} total={c.ensuiteSub + c.ensuiteHST} />
						<TR label="Bathroom — Main" note="Shower type + fixtures ($1,485)"
							inputs={<>
								<Num label="# Main baths" value={mainBathCount} onChange={setMainBathCount} />
								<Sel label="Shower type" value={mainShowerType} onChange={setMainShowerType} options={showerOpts} />
							</>}
							sub={c.mainBathSub} hst={c.mainBathHST} total={c.mainBathSub + c.mainBathHST} />
						{electricalDwellingType === "Two-Apartment" && (
							<TR label="Bathroom — Apartment" note="Shower type + fixtures ($1,485)"
								inputs={<>
									<Num label="# Apt baths" value={aptBathCount} onChange={setAptBathCount} />
									<Sel label="Shower type" value={aptShowerType} onChange={setAptShowerType} options={showerOpts} />
								</>}
								sub={c.aptBathSub} hst={c.aptBathHST} total={c.aptBathSub + c.aptBathHST} />
						)}
					</Section>

					<Section title="Landscaping Finishes" sectionTotal={c.landscapeTotal}>
						<TR label="Full Landscaping"
							inputs={<Num label="Amount" value={landscapingFull} onChange={setLandscapingFull} />}
							sub={landscapingFull} hst={c.landFullHST} total={landscapingFull + c.landFullHST} />
						<TR label="Driveway" note="No HST"
							inputs={<Num label="Amount" value={driveway} onChange={setDriveway} />}
							sub={driveway} hst={0} total={driveway} />
						<TR label="Window Wells"
							inputs={<Num label="Amount" value={windowWells} onChange={setWindowWells} />}
							sub={windowWells} hst={c.windowWellsHST} total={windowWells + c.windowWellsHST} />
					</Section>

					<Section title="Overhead" sectionTotal={c.overheadTotal}>
						<TR label="Unforeseen Labour" note="No HST"
							inputs={<Num label="Amount" value={unforeseenLabour} onChange={setUnforeseenLabour} />}
							sub={unforeseenLabour} hst={0} total={unforeseenLabour} />
						<TR label="Cleaning" note="No HST"
							inputs={<Sel label="Allowance" value={String(cleaning)} onChange={v => setCleaning(Number(v))}
								options={CLEANING_OPTIONS.map(n => ({ value: String(n), label: fd(n) }))} />}
							sub={cleaning} hst={0} total={cleaning} />
						<TR label="Garbage" note="No HST"
							inputs={<Num label="Amount" value={garbage} onChange={setGarbage} />}
							sub={garbage} hst={0} total={garbage} />
						<TR label="Closet Shelves"
							inputs={<Num label="Amount" value={closetShelves} onChange={setClosetShelves} />}
							sub={closetShelves} hst={c.closetHST} total={closetShelves + c.closetHST} />
						<TR label="LUX Warranty" note="No HST"
							inputs={<Num label="Amount" value={luxWarranty} onChange={setLuxWarranty} />}
							sub={luxWarranty} hst={0} total={luxWarranty} />
						<TR label="Temp. Heat"
							inputs={<Sel label="Amount" value={String(tempHeat)} onChange={v => setTempHeat(Number(v))}
								options={TEMP_HEAT_OPTIONS.map(n => ({ value: String(n), label: fd(n) }))} />}
							sub={tempHeat} hst={c.tempHeatHST} total={tempHeat + c.tempHeatHST} />
						<TR label="Miscellaneous" note="No HST (incl. boom lift, etc.)"
							inputs={<Num label="Amount" value={miscAmt} onChange={setMiscAmt} />}
							sub={miscAmt} hst={0} total={miscAmt} />
						<TR label="Contingency"
							note={`${contingencyPct}% of construction costs (lot prep + concrete + materials + subtrades + labour)`}
							inputs={<>
								<Num label="Rate %" value={contingencyPct} onChange={setContingencyPct} min={0} step={1} />
								<div className="text-xs text-neutral-500 self-end pb-1.5">Base: {fd(c.contingencyAmt)}</div>
							</>}
							sub={c.contingencyAmt} hst={c.contingencyHST} total={c.contingencyTotal} />
						<TR label="Profit (Turn Key)" note="No HST"
							inputs={<Sel label="Profit amount" value={String(profit)} onChange={v => setProfit(Number(v))}
								options={PROFIT_OPTIONS.map(n => ({ value: String(n), label: fd(n) }))} />}
							sub={profit} hst={0} total={profit} />
					</Section>

					<Section title="Financing / Carrying Costs" sectionTotal={c.financingTotal}>
						<TR label="Construction Loan Interest"
							note={`Interest = loan × rate × months/12`}
							inputs={<>
								<Num label="Loan amount" value={loanAmount} onChange={setLoanAmount} wide />
								<Num label="Rate %" value={loanRatePct} onChange={setLoanRatePct} decimals />
								<Num label="Months" value={loanMonths} onChange={setLoanMonths} />
							</>}
							sub={c.financingSub} hst={c.financingHST} total={c.financingTotal} />
					</Section>

					<Section title="Real Estate Commission" sectionTotal={c.reCommTotal}>
						<TR label="Commission"
							note={`${Math.round(reCommPct * 100)}% of ${reLandIncluded ? "total" : "total excl. lot"}`}
							inputs={<>
								<Sel label="Rate" value={String(reCommPct)} onChange={v => setReCommPct(Number(v))}
									options={[0.04, 0.05, 0.06, 0.07].map(n => ({ value: String(n), label: `${Math.round(n * 100)}%` }))} />
								<Toggle label="Land included in base" checked={reLandIncluded} onChange={setReLandIncluded} />
							</>}
							sub={c.reCommSub} hst={c.reCommHST} total={c.reCommTotal} />
					</Section>
				</div>
			)}

			{/* ── Tab: Cost Rates ──────────────────────────────────────────────────── */}
			{tab === "rates" && <RatesEditor initial={rates} />}

			{/* ── Tab: Review & Send ────────────────────────────────────────────────── */}
			{tab === "review" && (
				<div className="space-y-4">
					{/* Action card */}
					<div className="rounded-xl border border-neutral-200 bg-white p-6">
						<div className="flex flex-wrap items-start justify-between gap-4 mb-5">
							<div>
								<h3 className="font-semibold text-neutral-900">Client Estimate Sheet</h3>
								<p className="text-sm text-neutral-500 mt-0.5">Opens a print-ready document — use your browser&apos;s &ldquo;Save as PDF&rdquo; to download.</p>
							</div>
							<button
								onClick={handlePrint}
								disabled={c.grandTotal === 0}
								className="flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 transition-colors shrink-0"
							>
								<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
								</svg>
								Print / Download PDF
							</button>
						</div>
						{/* Mini preview of what the estimate looks like */}
						<div className="rounded-lg border border-neutral-100 bg-neutral-50 p-5 text-sm">
							<div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-brand-700/30">
								<div>
									<p className="font-bold text-neutral-900">Kestrel Developments</p>
									<p className="text-xs text-neutral-500 mt-0.5">Custom Home Builder · Newfoundland & Labrador</p>
								</div>
								<div className="text-right">
									<p className="text-xs font-bold text-brand-700 tracking-widest">ESTIMATE</p>
									<p className="text-xs text-neutral-400 mt-0.5">{date || new Date().toLocaleDateString("en-CA")}</p>
								</div>
							</div>
							{(client || location) && (
								<div className="mb-4 grid grid-cols-2 gap-1 text-xs">
									{client && <div><span className="text-neutral-400">Client: </span><span className="font-medium text-neutral-700">{client}</span></div>}
									{location && <div><span className="text-neutral-400">Location: </span><span className="font-medium text-neutral-700">{location}</span></div>}
								</div>
							)}
							<div className="mb-3">
								{summarySections.filter(s => s.total > 0).map(s => (
									<div key={s.label} className="flex justify-between py-1 border-b border-neutral-100 text-xs">
										<span className="text-neutral-600">{s.label}</span>
										<span className="tabular-nums font-medium text-neutral-800">{fd(s.total)}</span>
									</div>
								))}
							</div>
							<div className="flex justify-between items-center rounded-lg bg-brand-700 text-white px-4 py-3">
								<span className="text-xs font-semibold opacity-80">Total (incl. HST)</span>
								<span className="font-bold tabular-nums">{fd(c.grandTotal)}</span>
							</div>
						</div>
					</div>

					{/* Internal breakdown chart */}
					{c.grandTotal > 0 && (
						<div className="rounded-xl border border-neutral-200 bg-white p-5">
							<h3 className="font-semibold text-neutral-900 mb-4">Cost Breakdown</h3>
							<BreakdownChart sections={summarySections.map(s => ({ label: s.label, value: s.total }))} />
						</div>
					)}
				</div>
			)}
		</div>
	)
}
