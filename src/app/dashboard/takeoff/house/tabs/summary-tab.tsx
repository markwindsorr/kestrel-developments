"use client"

import { useEffect, useMemo, useRef } from "react"
import type { Measurement, Project } from "@/lib/db/projects"
import { CATEGORY_ORDER } from "@/lib/db/assemblies-seed"
import { updateProjectAction } from "../actions"
import { formatCAD } from "../lib/format"

interface Props {
	project: Project
	onProjectUpdate: (p: Project) => void
}

interface CategoryGroup {
	category: string
	rows: Measurement[]
	material: number
	labour: number
	total: number
}

export function SummaryTab({ project, onProjectUpdate }: Props) {
	// Values live on the project itself. Local edits flow through onProjectUpdate
	// for instant reactivity; a ref-based debounce coalesces rapid changes into
	// a single DB write (so typing "12.5" doesn't fire three updates).
	const contingencyPct = project.contingencyPct
	const profitPct = project.profitPct
	const hstEnabled = project.hstEnabled
	const hstRatePct = project.hstRate * 100

	const projectRef = useRef(project)
	const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	// Keep the ref synced after each commit so debounced persists + setters
	// always operate on the latest project snapshot.
	useEffect(() => { projectRef.current = project })

	const schedulePersist = () => {
		if (persistTimer.current) clearTimeout(persistTimer.current)
		persistTimer.current = setTimeout(() => {
			const p = projectRef.current
			updateProjectAction(p.id, {
				contingencyPct: p.contingencyPct,
				profitPct: p.profitPct,
				hstEnabled: p.hstEnabled,
				hstRate: p.hstRate,
			})
		}, 600)
	}

	useEffect(() => () => {
		if (persistTimer.current) clearTimeout(persistTimer.current)
	}, [])

	const setContingencyPct = (v: number) => { onProjectUpdate({ ...projectRef.current, contingencyPct: v }); schedulePersist() }
	const setProfitPct      = (v: number) => { onProjectUpdate({ ...projectRef.current, profitPct: v });      schedulePersist() }
	const setHstEnabled     = (v: boolean) => { onProjectUpdate({ ...projectRef.current, hstEnabled: v });    schedulePersist() }
	const setHstRatePct     = (v: number) => { onProjectUpdate({ ...projectRef.current, hstRate: v / 100 });  schedulePersist() }

	// ─── Group by category in the brief's preferred order ────────────────────
	const groups: CategoryGroup[] = useMemo(() => {
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
			for (const r of rows) {
				material += r.materialCost
				labour += r.labourCost
				total += r.totalCost
			}
			return { category: cat, rows, material, labour, total }
		})
	}, [project.measurements])

	const subtotal = useMemo(() => groups.reduce((s, g) => s + g.total, 0), [groups])
	const subMaterial = useMemo(() => groups.reduce((s, g) => s + g.material, 0), [groups])
	const subLabour = useMemo(() => groups.reduce((s, g) => s + g.labour, 0), [groups])

	// Both contingency and profit are markups on the line-item subtotal. HST is
	// then applied to (subtotal + contingency + profit) when enabled.
	const contingencyAmt = subtotal * (contingencyPct / 100)
	const profitAmt = subtotal * (profitPct / 100)
	const preTaxTotal = subtotal + contingencyAmt + profitAmt
	const hstAmt = hstEnabled ? preTaxTotal * (hstRatePct / 100) : 0
	const grandTotal = preTaxTotal + hstAmt

	const hasData = project.measurements.length > 0

	return (
		<div className="space-y-4">
			{/* Header */}
			<div className="rounded-xl border border-neutral-200 bg-white p-5">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div>
						<h2 className="text-base font-semibold text-neutral-900">{project.name}</h2>
						{project.address && <p className="text-xs text-neutral-500 mt-0.5">{project.address}</p>}
					</div>
					<div className="text-right">
						<p className="text-xs text-neutral-500">Grand Total</p>
						<p className="text-2xl font-bold text-neutral-900 tabular-nums">{formatCAD(grandTotal)}</p>
					</div>
				</div>
			</div>

			{/* Settings (contingency / profit / HST) */}
			<div className="rounded-xl border border-neutral-200 bg-white p-5">
				<h3 className="text-sm font-semibold text-neutral-900 mb-3">Markups</h3>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					<PctInput
						label="Contingency %"
						hint="Applied to the line-item subtotal"
						value={contingencyPct}
						onChange={setContingencyPct}
					/>
					<PctInput
						label="Profit margin %"
						hint="Applied to the line-item subtotal"
						value={profitPct}
						onChange={setProfitPct}
					/>
					<div className="space-y-1">
						<span className="text-xs font-medium text-neutral-600">HST</span>
						<div className="flex items-center gap-2">
							<label className="flex items-center gap-1.5 cursor-pointer select-none">
								<input
									type="checkbox"
									checked={hstEnabled}
									onChange={e => setHstEnabled(e.target.checked)}
									className="h-4 w-4 rounded border-neutral-300 text-brand-600 focus:ring-brand-500"
								/>
								<span className="text-sm text-neutral-700">Apply</span>
							</label>
							<input
								type="number"
								min={0}
								max={100}
								step={0.5}
								value={hstRatePct}
								onChange={e => setHstRatePct(clampPct(parseFloat(e.target.value) || 0))}
								disabled={!hstEnabled}
								className="w-20 rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-right tabular-nums focus:border-brand-500 focus:outline-none disabled:bg-neutral-50 disabled:text-neutral-400"
							/>
							<span className="text-xs text-neutral-500">%</span>
						</div>
						<p className="text-xs text-neutral-400 mt-1">
							{hstEnabled ? `Applied to subtotal + markups` : "Not applied"}
						</p>
					</div>
				</div>
			</div>

			{/* Line items table */}
			<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
				<div className="flex items-center justify-between px-5 py-3 border-b border-neutral-200 bg-neutral-50">
					<h3 className="text-sm font-semibold text-neutral-900">
						Line Items <span className="text-xs text-neutral-500 ml-2">({project.measurements.length})</span>
					</h3>
				</div>

				{!hasData ? (
					<p className="px-5 py-12 text-center text-sm text-neutral-400">
						No measurements yet. Use the Takeoff tab to measure assemblies.
					</p>
				) : (
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="text-xs text-neutral-500 uppercase tracking-wide bg-neutral-50/50">
									<th className="py-2 pl-5 pr-3 text-left font-medium">Category</th>
									<th className="py-2 pr-3 text-left font-medium">Assembly</th>
									<th className="py-2 pr-3 text-left font-medium">Label</th>
									<th className="py-2 pr-3 text-right font-medium">Measurement</th>
									<th className="py-2 pr-3 text-right font-medium">Unit</th>
									<th className="py-2 pr-3 text-right font-medium">Material</th>
									<th className="py-2 pr-3 text-right font-medium">Labour</th>
									<th className="py-2 pr-5 text-right font-medium">Total</th>
								</tr>
							</thead>
							<tbody>
								{groups.map(g => (
									<CategoryBlock key={g.category} group={g} />
								))}
								<tr className="border-t-2 border-neutral-300 bg-neutral-50">
									<td className="py-3 pl-5 pr-3 text-sm font-semibold text-neutral-900" colSpan={5}>
										Subtotal
									</td>
									<td className="py-3 pr-3 text-right tabular-nums text-sm text-neutral-700">
										{formatCAD(subMaterial)}
									</td>
									<td className="py-3 pr-3 text-right tabular-nums text-sm text-neutral-700">
										{formatCAD(subLabour)}
									</td>
									<td className="py-3 pr-5 text-right tabular-nums text-sm font-semibold text-neutral-900">
										{formatCAD(subtotal)}
									</td>
								</tr>
								{contingencyPct > 0 && (
									<tr>
										<td className="py-2 pl-5 pr-3 text-sm text-neutral-700" colSpan={7}>
											Contingency ({contingencyPct.toLocaleString("en-CA", { maximumFractionDigits: 2 })}%)
										</td>
										<td className="py-2 pr-5 text-right tabular-nums text-sm text-neutral-700">
											{formatCAD(contingencyAmt)}
										</td>
									</tr>
								)}
								{profitPct > 0 && (
									<tr>
										<td className="py-2 pl-5 pr-3 text-sm text-neutral-700" colSpan={7}>
											Profit margin ({profitPct.toLocaleString("en-CA", { maximumFractionDigits: 2 })}%)
										</td>
										<td className="py-2 pr-5 text-right tabular-nums text-sm text-neutral-700">
											{formatCAD(profitAmt)}
										</td>
									</tr>
								)}
								{(contingencyPct > 0 || profitPct > 0) && (
									<tr className="border-t border-neutral-200 bg-neutral-50/50">
										<td className="py-2 pl-5 pr-3 text-sm font-medium text-neutral-800" colSpan={7}>
											Pre-tax total
										</td>
										<td className="py-2 pr-5 text-right tabular-nums text-sm font-semibold text-neutral-900">
											{formatCAD(preTaxTotal)}
										</td>
									</tr>
								)}
								{hstEnabled && (
									<tr>
										<td className="py-2 pl-5 pr-3 text-sm text-neutral-700" colSpan={7}>
											HST ({hstRatePct.toLocaleString("en-CA", { maximumFractionDigits: 2 })}%)
										</td>
										<td className="py-2 pr-5 text-right tabular-nums text-sm text-neutral-700">
											{formatCAD(hstAmt)}
										</td>
									</tr>
								)}
							</tbody>
						</table>
					</div>
				)}
			</div>

			{/* Grand total */}
			{hasData && (
				<div className="rounded-xl bg-brand-700 text-white p-6 flex items-center justify-between">
					<div>
						<p className="text-xs uppercase tracking-wide text-brand-100/80">Project Total</p>
						<p className="text-xs text-brand-100/60 mt-0.5">
							{hstEnabled ? "Includes HST" : "HST not applied"}
						</p>
					</div>
					<p className="text-3xl font-bold tabular-nums">{formatCAD(grandTotal)}</p>
				</div>
			)}
		</div>
	)
}

// ─── Subcomponents ──────────────────────────────────────────────────────────

function CategoryBlock({ group }: { group: CategoryGroup }) {
	return (
		<>
			<tr className="bg-neutral-50/60 border-t border-neutral-200">
				<td className="py-2 pl-5 pr-3 text-xs font-semibold text-neutral-700 uppercase tracking-wide" colSpan={8}>
					{group.category}
				</td>
			</tr>
			{group.rows.map(m => (
				<tr key={m.id} className="border-t border-neutral-100">
					<td className="py-2 pl-5 pr-3 text-neutral-500 text-xs">{m.assemblyCategory}</td>
					<td className="py-2 pr-3 text-neutral-700">{m.assemblyName}</td>
					<td className="py-2 pr-3 text-neutral-900 font-medium">{m.label}</td>
					<td className="py-2 pr-3 text-right tabular-nums text-neutral-700">
						{m.value.toLocaleString("en-CA", { maximumFractionDigits: 2 })}
					</td>
					<td className="py-2 pr-3 text-right text-xs text-neutral-500">{m.unit}</td>
					<td className="py-2 pr-3 text-right tabular-nums text-neutral-600">{formatCAD(m.materialCost)}</td>
					<td className="py-2 pr-3 text-right tabular-nums text-neutral-600">{formatCAD(m.labourCost)}</td>
					<td className="py-2 pr-5 text-right tabular-nums text-neutral-900 font-semibold">{formatCAD(m.totalCost)}</td>
				</tr>
			))}
			<tr className="border-t border-neutral-100 bg-neutral-50/30">
				<td className="py-2 pl-5 pr-3 text-xs font-medium text-neutral-500" colSpan={5}>
					{group.category} subtotal
				</td>
				<td className="py-2 pr-3 text-right tabular-nums text-xs text-neutral-600">{formatCAD(group.material)}</td>
				<td className="py-2 pr-3 text-right tabular-nums text-xs text-neutral-600">{formatCAD(group.labour)}</td>
				<td className="py-2 pr-5 text-right tabular-nums text-sm font-semibold text-neutral-800">{formatCAD(group.total)}</td>
			</tr>
		</>
	)
}

function PctInput({
	label,
	hint,
	value,
	onChange,
}: {
	label: string
	hint?: string
	value: number
	onChange: (v: number) => void
}) {
	return (
		<div className="space-y-1">
			<span className="text-xs font-medium text-neutral-600">{label}</span>
			<div className="flex items-center gap-2">
				<input
					type="number"
					min={0}
					max={100}
					step={0.5}
					value={value === 0 ? "" : value}
					placeholder="0"
					onChange={e => onChange(clampPct(parseFloat(e.target.value) || 0))}
					className="w-24 rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-right tabular-nums focus:border-brand-500 focus:outline-none"
				/>
				<span className="text-xs text-neutral-500">%</span>
			</div>
			{hint && <p className="text-xs text-neutral-400">{hint}</p>}
		</div>
	)
}

function clampPct(n: number): number {
	if (isNaN(n) || n < 0) return 0
	if (n > 100) return 100
	return n
}
