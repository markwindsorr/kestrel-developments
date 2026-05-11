"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { type CostRates } from "@/lib/house-calc"
import { saveRatesAction } from "./actions"

interface RateRow {
	key: keyof CostRates
	label: string
	unit: string
	decimals?: boolean
}

const RATE_GROUPS: { category: string; rows: RateRow[] }[] = [
	{
		category: "Permits",
		rows: [
			{ key: "PERMIT_ST_JOHNS", label: "St. John's", unit: "flat fee" },
			{ key: "PERMIT_PARADISE", label: "Paradise", unit: "flat fee" },
			{ key: "PERMIT_MOUNT_PEARL", label: "Mount Pearl", unit: "flat fee" },
		],
	},
	{
		category: "Well & Site",
		rows: [
			{ key: "WELL_DRILL_300FT", label: "Well drill — 300 ft", unit: "flat fee" },
			{ key: "WELL_DRILL_400FT", label: "Well drill — 400 ft", unit: "flat fee" },
			{ key: "WELL_DRILL_500FT", label: "Well drill — 500 ft", unit: "flat fee" },
			{ key: "WELL_PUMP_300FT", label: "Well pump — 300 ft", unit: "flat fee" },
			{ key: "WELL_PUMP_500FT", label: "Well pump — 500 ft", unit: "flat fee" },
		],
	},
	{
		category: "Concrete",
		rows: [
			{ key: "CONCRETE_PER_M3", label: "Concrete", unit: "$/m³" },
			{ key: "CONCRETE_PUMP", label: "Pump truck", unit: "flat fee" },
			{ key: "CONCRETE_WINTER_MIX", label: "Winter mix", unit: "flat fee" },
		],
	},
	{
		category: "Foundation Labour",
		rows: [
			{ key: "FOOTING_LABOUR_RATE", label: "Footing", unit: "$/lin ft" },
			{ key: "SLAB_FINISH_RATE", label: "Slab finish", unit: "$/sqft", decimals: true },
			{ key: "FOUND_WALL_8FT", label: "Foundation wall — 8 ft", unit: "$/lin ft", decimals: true },
			{ key: "FOUND_WALL_9FT", label: "Foundation wall — 9 ft", unit: "$/lin ft", decimals: true },
			{ key: "FOUND_WALL_10FT", label: "Foundation wall — 10 ft", unit: "$/lin ft", decimals: true },
			{ key: "FOUND_INSUL_CM2_RATE", label: "Foundation insul. CM type 2", unit: "$/sheet" },
		],
	},
	{
		category: "Framing",
		rows: [
			{ key: "FRAMING_HOUSE_RATE", label: "House", unit: "$/sqft" },
			{ key: "FRAMING_BSMT_RATE", label: "Basement", unit: "$/sqft" },
			{ key: "FRAMING_GARAGE_RATE", label: "Garage", unit: "$/sqft" },
		],
	},
	{
		category: "Electrical",
		rows: [
			{ key: "ELEC_SINGLE_FAMILY", label: "Single-family dwelling", unit: "flat fee" },
			{ key: "ELEC_TWO_APARTMENT", label: "Two-apartment dwelling", unit: "flat fee" },
			{ key: "ELEC_BSMT_RATE", label: "Basement", unit: "$/sqft" },
		],
	},
	{
		category: "Insulation",
		rows: [
			{ key: "INSUL_WALL_RATE", label: "Wall batts + VB", unit: "$/sqft", decimals: true },
			{ key: "INSUL_CEIL_RATE", label: "Ceiling VB + attic R50", unit: "$/sqft", decimals: true },
		],
	},
	{
		category: "Drywall & Trim",
		rows: [
			{ key: "GYPROC_RATE", label: "Gyproc install", unit: "$/sqft", decimals: true },
			{ key: "TRIM_BASEBOARD_RATE", label: "Baseboard", unit: "$/lin ft" },
			{ key: "TRIM_OPENING_RATE", label: "Window / door opening", unit: "per opening" },
		],
	},
	{
		category: "Paint",
		rows: [
			{ key: "PAINT_RATE", label: "Paint", unit: "$/drywall sqft" },
		],
	},
	{
		category: "Roofing",
		rows: [
			{ key: "SHINGLE_PER_BUNDLE", label: "Shingles", unit: "$/bundle" },
		],
	},
	{
		category: "Flooring",
		rows: [
			{ key: "TILE_INSTALL_RATE", label: "Tile install", unit: "$/sqft", decimals: true },
			{ key: "UNDERLAY_SHEET_RATE", label: "Underlay sheet", unit: "$/sheet" },
		],
	},
	{
		category: "Plumbing & Fixtures",
		rows: [
			{ key: "SHOWER_FIXTURES", label: "Fixtures per bathroom (faucet, toilet, vanity, shower head)", unit: "$/bath" },
			{ key: "SHOWER_ALL_TILE", label: "Shower surround — all tile", unit: "$/unit" },
			{ key: "SHOWER_TILE_WALL_ACRYLIC", label: "Shower surround — tile wall + acrylic base", unit: "$/unit" },
			{ key: "SHOWER_TILE_WALL_TUB", label: "Shower surround — tile wall + tub base", unit: "$/unit" },
			{ key: "SHOWER_TUB_SURROUND", label: "Shower surround — tub surround", unit: "$/unit" },
			{ key: "SHOWER_POWDER_ROOM", label: "Shower surround — powder room", unit: "$/unit" },
			{ key: "SHOWER_SHOWER_SURROUND", label: "Shower surround — shower surround", unit: "$/unit" },
			{ key: "KITCHEN_SINGLE", label: "Kitchen fixtures — single", unit: "flat fee" },
			{ key: "KITCHEN_APT", label: "Kitchen fixtures — apartment (2 kitchens)", unit: "flat fee" },
		],
	},
	{
		category: "HVAC",
		rows: [
			{ key: "HVAC_BASE", label: "Base system", unit: "flat fee" },
			{ key: "HVAC_MINI_SPLIT_SINGLE", label: "Mini split — single zone", unit: "flat fee" },
			{ key: "HVAC_MINI_SPLIT_DUAL", label: "Mini split — dual zone", unit: "flat fee" },
			{ key: "HVAC_MINI_SPLIT_TRIPLE", label: "Mini split — triple zone", unit: "flat fee" },
			{ key: "HVAC_MINI_SPLIT_HEAT_PUMP", label: "Heat pump", unit: "flat fee" },
			{ key: "HVAC_MICROWAVE_RANGE_HOOD", label: "Range hood", unit: "flat fee" },
			{ key: "HVAC_MICROWAVE_VENTED_COMBO", label: "Vented microwave combo", unit: "flat fee" },
		],
	},
]

export function RatesEditor({ initial }: { initial: CostRates }) {
	const [draft, setDraft] = useState<CostRates>({ ...initial })
	const [saving, setSaving] = useState(false)
	const [saved, setSaved] = useState(false)
	const [error, setError] = useState<string | null>(null)

	const changed = (Object.keys(draft) as (keyof CostRates)[]).some(k => draft[k] !== initial[k])

	const set = (key: keyof CostRates, raw: string) => {
		const v = parseFloat(raw)
		if (!isNaN(v)) setDraft(d => ({ ...d, [key]: v }))
		setSaved(false)
	}

	const handleSave = async () => {
		setSaving(true)
		setError(null)
		const result = await saveRatesAction(draft as unknown as Record<string, number>)
		setSaving(false)
		if (result.error) {
			setError(result.error)
		} else {
			setSaved(true)
		}
	}

	return (
		<div className="space-y-6">
			{/* Sticky save bar */}
			<div className={cn(
				"sticky top-0 z-10 flex items-center justify-between gap-4 rounded-xl border px-5 py-3 transition-colors",
				changed ? "border-brand-300 bg-brand-50 shadow-sm" : "border-neutral-200 bg-white"
			)}>
				<div>
					{changed
						? <p className="text-sm font-medium text-brand-700">Unsaved changes</p>
						: saved
							? <p className="text-sm font-medium text-green-700">All changes saved</p>
							: <p className="text-sm text-neutral-500">Edit any rate below, then save.</p>
					}
					{error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
				</div>
				<button
					onClick={handleSave}
					disabled={!changed || saving}
					className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-40 transition-colors shrink-0"
				>
					{saving ? "Saving…" : "Save Changes"}
				</button>
			</div>

			{/* Rate groups */}
			{RATE_GROUPS.map(group => (
				<div key={group.category} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
					<div className="bg-neutral-50 border-b border-neutral-200 px-5 py-3">
						<h2 className="font-semibold text-neutral-900">{group.category}</h2>
					</div>
					<table className="w-full">
						<thead>
							<tr className="text-xs text-neutral-500 uppercase tracking-wide border-b border-neutral-100">
								<th className="py-2 pl-5 pr-3 text-left font-medium">Description</th>
								<th className="py-2 pr-3 text-left font-medium w-36">Rate</th>
								<th className="py-2 pr-5 text-left font-medium w-40">Unit</th>
							</tr>
						</thead>
						<tbody>
							{group.rows.map((row, i) => {
								const val = draft[row.key]
								const isChanged = val !== initial[row.key]
								return (
									<tr key={row.key} className={cn(
										"border-t border-neutral-100",
										i === 0 && "border-t-0"
									)}>
										<td className="py-2.5 pl-5 pr-3">
											<span className="text-sm text-neutral-800">{row.label}</span>
										</td>
										<td className="py-2.5 pr-3">
											<input
												type="number"
												min={0}
												step={row.decimals ? 0.01 : 1}
												value={val}
												onChange={e => set(row.key, e.target.value)}
												className={cn(
													"w-28 rounded border px-2 py-1.5 text-sm tabular-nums focus:outline-none focus:border-brand-500",
													isChanged
														? "border-brand-400 bg-brand-50 text-brand-900 font-medium"
														: "border-neutral-300 bg-white text-neutral-900"
												)}
											/>
										</td>
										<td className="py-2.5 pr-5">
											<span className="text-xs text-neutral-500">{row.unit}</span>
										</td>
									</tr>
								)
							})}
						</tbody>
					</table>
				</div>
			))}
		</div>
	)
}
