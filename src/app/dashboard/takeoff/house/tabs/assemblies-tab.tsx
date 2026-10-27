"use client"

import { useMemo, useState, useTransition } from "react"
import type { Assembly, AssemblyLineItem, AssemblyUnit } from "@/lib/db/assemblies"
import type { UserRole } from "@/lib/types"
import { CATEGORY_ORDER } from "@/lib/db/assemblies-seed"
import {
	createAssemblyAction,
	deleteAssemblyAction,
	updateAssemblyAction,
} from "../actions"
import { formatCAD } from "../lib/format"

const UNITS: AssemblyUnit[] = ["LF", "SF", "EA", "LS"]

interface Props {
	assemblies: Assembly[]
	onAssembliesChange: (next: Assembly[]) => void
	role: UserRole
}

export function AssembliesTab({ assemblies, onAssembliesChange, role }: Props) {
	const canEdit = role === "admin" || role === "foreman"
	const [showNew, setShowNew] = useState(false)

	// Group + sort with the brief's preferred category ordering, but include
	// any unknown categories (e.g. user-added) alphabetically after the known set.
	const grouped = useMemo(() => {
		const map = new Map<string, Assembly[]>()
		for (const a of assemblies) {
			if (!map.has(a.category)) map.set(a.category, [])
			map.get(a.category)!.push(a)
		}
		const known = (CATEGORY_ORDER as readonly string[]).filter(c => map.has(c))
		const extras = [...map.keys()].filter(c => !(CATEGORY_ORDER as readonly string[]).includes(c)).sort()
		return [...known, ...extras].map(cat => ({
			category: cat,
			assemblies: map.get(cat)!.slice().sort((a, b) => a.name.localeCompare(b.name)),
		}))
	}, [assemblies])

	const replaceAssembly = (updated: Assembly) =>
		onAssembliesChange(assemblies.map(a => a.id === updated.id ? updated : a))

	const removeAssembly = (id: string) =>
		onAssembliesChange(assemblies.filter(a => a.id !== id))

	const addAssembly = (created: Assembly) =>
		onAssembliesChange([...assemblies, created])

	return (
		<div className="space-y-5">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="text-base font-semibold text-neutral-900">Assemblies</h2>
					<p className="text-xs text-neutral-500 mt-0.5">
						{assemblies.length} total · changes save instantly to Supabase
					</p>
				</div>
				{canEdit && (
					<button
						type="button"
						onClick={() => setShowNew(true)}
						className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
					>
						+ New Assembly
					</button>
				)}
			</div>

			{showNew && (
				<NewAssemblyModal
					onCancel={() => setShowNew(false)}
					onCreated={a => { addAssembly(a); setShowNew(false) }}
				/>
			)}

			{assemblies.length === 0 ? (
				<div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center text-sm text-neutral-500">
					Seeding default assemblies…
				</div>
			) : (
				<div className="space-y-3">
					{grouped.map(g => (
						<CategoryBlock
							key={g.category}
							category={g.category}
							assemblies={g.assemblies}
							canEdit={canEdit}
							onChange={replaceAssembly}
							onRemove={removeAssembly}
						/>
					))}
				</div>
			)}
		</div>
	)
}

// ─── Category block (collapsible card) ──────────────────────────────────────

function CategoryBlock({
	category,
	assemblies,
	canEdit,
	onChange,
	onRemove,
}: {
	category: string
	assemblies: Assembly[]
	canEdit: boolean
	onChange: (a: Assembly) => void
	onRemove: (id: string) => void
}) {
	return (
		<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
			<div className="flex items-center justify-between px-5 py-3 bg-neutral-50 border-b border-neutral-200">
				<h3 className="text-sm font-semibold text-neutral-900">{category}</h3>
				<span className="text-xs text-neutral-500">{assemblies.length}</span>
			</div>
			<div className="divide-y divide-neutral-100">
				{assemblies.map(a => (
					<AssemblyRow
						key={a.id}
						assembly={a}
						canEdit={canEdit}
						onChange={onChange}
						onRemove={onRemove}
					/>
				))}
			</div>
		</div>
	)
}

// ─── Assembly row ───────────────────────────────────────────────────────────

function AssemblyRow({
	assembly,
	canEdit,
	onChange,
	onRemove,
}: {
	assembly: Assembly
	canEdit: boolean
	onChange: (a: Assembly) => void
	onRemove: (id: string) => void
}) {
	const [open, setOpen] = useState(false)
	const [, startTransition] = useTransition()

	const subtotals = useMemo(() => {
		let mat = 0, lab = 0
		for (const it of assembly.items) {
			if (it.kind === "material") mat += it.rate
			else lab += it.rate
		}
		return { mat, lab, total: mat + lab }
	}, [assembly.items])

	const persistItems = (items: AssemblyLineItem[]) => {
		const next = { ...assembly, items }
		onChange(next)
		startTransition(async () => { await updateAssemblyAction(assembly.id, { items }) })
	}

	const persistName = (name: string) => {
		if (name === assembly.name) return
		onChange({ ...assembly, name })
		startTransition(async () => { await updateAssemblyAction(assembly.id, { name }) })
	}

	const persistUnit = (unit: AssemblyUnit) => {
		if (unit === assembly.unit) return
		onChange({ ...assembly, unit })
		startTransition(async () => { await updateAssemblyAction(assembly.id, { unit }) })
	}

	const handleAddItem = () => {
		const newItem: AssemblyLineItem = {
			id: crypto.randomUUID(),
			label: "New line item",
			rate: 0,
			kind: "material",
		}
		persistItems([...assembly.items, newItem])
		setOpen(true)
	}

	const handleDeleteAssembly = async () => {
		if (!confirm(`Delete assembly "${assembly.name}"?`)) return
		onRemove(assembly.id)
		await deleteAssemblyAction(assembly.id)
	}

	return (
		<div>
			<button
				type="button"
				onClick={() => setOpen(o => !o)}
				className="w-full flex items-center justify-between px-5 py-3 hover:bg-neutral-50 text-left"
			>
				<div className="flex items-center gap-3 min-w-0">
					<svg className={`h-4 w-4 text-neutral-400 transition-transform shrink-0 ${open ? "rotate-90" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
					</svg>
					<div className="min-w-0">
						<p className="text-sm font-medium text-neutral-900 truncate">{assembly.name}</p>
						<p className="text-xs text-neutral-500 mt-0.5">
							{assembly.items.length} item{assembly.items.length !== 1 ? "s" : ""} · {assembly.unit}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-4 shrink-0">
					<span className="text-sm font-semibold text-neutral-900 tabular-nums">
						{formatCAD(subtotals.total)}<span className="text-xs text-neutral-400">/{assembly.unit}</span>
					</span>
				</div>
			</button>

			{open && (
				<div className="px-5 pb-4 pt-1 bg-neutral-50/50 border-t border-neutral-100">
					{canEdit && (
						<div className="flex flex-wrap items-end gap-3 mb-3 py-3 border-b border-neutral-200">
							<label className="block">
								<span className="text-xs text-neutral-600">Name</span>
								<input
									defaultValue={assembly.name}
									onBlur={e => persistName(e.target.value.trim() || assembly.name)}
									className="mt-1 w-64 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
								/>
							</label>
							<label className="block">
								<span className="text-xs text-neutral-600">Unit</span>
								<select
									value={assembly.unit}
									onChange={e => persistUnit(e.target.value as AssemblyUnit)}
									className="mt-1 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
								>
									{UNITS.map(u => <option key={u} value={u}>{u}</option>)}
								</select>
							</label>
							<div className="flex-1" />
							<button
								type="button"
								onClick={handleDeleteAssembly}
								className="rounded border border-red-200 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
							>
								Delete assembly
							</button>
						</div>
					)}

					<table className="w-full text-sm">
						<thead>
							<tr className="text-xs text-neutral-500 uppercase tracking-wide">
								<th className="py-1.5 pr-3 text-left font-medium">Line item</th>
								<th className="py-1.5 pr-3 text-left font-medium w-32">Kind</th>
								<th className="py-1.5 pr-3 text-right font-medium w-28">Rate</th>
								<th className="py-1.5 text-right font-medium w-16" />
							</tr>
						</thead>
						<tbody>
							{assembly.items.map(item => (
								<LineItemRow
									key={item.id}
									item={item}
									unit={assembly.unit}
									canEdit={canEdit}
									onChange={updated => persistItems(assembly.items.map(i => i.id === item.id ? updated : i))}
									onRemove={() => persistItems(assembly.items.filter(i => i.id !== item.id))}
								/>
							))}
							{assembly.items.length === 0 && (
								<tr>
									<td colSpan={4} className="py-3 text-center text-xs text-neutral-400">No line items.</td>
								</tr>
							)}
						</tbody>
						<tfoot>
							<tr className="border-t border-neutral-200">
								<td colSpan={2} className="py-2 pr-3 text-right text-xs text-neutral-500 font-medium">Subtotal</td>
								<td className="py-2 pr-3 text-right text-sm font-semibold text-neutral-900 tabular-nums">
									{formatCAD(subtotals.total)}<span className="text-xs text-neutral-400">/{assembly.unit}</span>
								</td>
								<td />
							</tr>
							<tr>
								<td colSpan={2} className="py-1 pr-3 text-right text-xs text-neutral-400">
									Material {formatCAD(subtotals.mat)} · Labour {formatCAD(subtotals.lab)}
								</td>
								<td />
								<td />
							</tr>
						</tfoot>
					</table>

					{canEdit && (
						<div className="mt-3">
							<button
								type="button"
								onClick={handleAddItem}
								className="text-xs font-medium text-brand-600 hover:text-brand-800"
							>
								+ Add line item
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	)
}

// ─── Line item row ──────────────────────────────────────────────────────────

function LineItemRow({
	item,
	unit,
	canEdit,
	onChange,
	onRemove,
}: {
	item: AssemblyLineItem
	unit: AssemblyUnit
	canEdit: boolean
	onChange: (updated: AssemblyLineItem) => void
	onRemove: () => void
}) {
	return (
		<tr className="border-t border-neutral-100">
			<td className="py-1.5 pr-3">
				{canEdit ? (
					<input
						defaultValue={item.label}
						onBlur={e => {
							const label = e.target.value.trim() || item.label
							if (label !== item.label) onChange({ ...item, label })
						}}
						className="w-full rounded border border-transparent bg-transparent px-1.5 py-1 text-sm text-neutral-900 hover:border-neutral-200 focus:border-brand-500 focus:bg-white focus:outline-none"
					/>
				) : (
					<span className="text-sm text-neutral-800">{item.label}</span>
				)}
			</td>
			<td className="py-1.5 pr-3">
				{canEdit ? (
					<select
						value={item.kind}
						onChange={e => onChange({ ...item, kind: e.target.value as "material" | "labour" })}
						className="rounded border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-700 focus:border-brand-500 focus:outline-none"
					>
						<option value="material">Material</option>
						<option value="labour">Labour</option>
					</select>
				) : (
					<span className="text-xs text-neutral-500 capitalize">{item.kind}</span>
				)}
			</td>
			<td className="py-1.5 pr-3 text-right">
				{canEdit ? (
					<div className="inline-flex items-center gap-1">
						<input
							type="number"
							min={0}
							step={0.01}
							defaultValue={item.rate}
							onBlur={e => {
								const rate = parseFloat(e.target.value)
								if (!isNaN(rate) && rate !== item.rate) onChange({ ...item, rate })
							}}
							className="w-24 rounded border border-neutral-200 bg-white px-2 py-1 text-sm text-right tabular-nums text-neutral-900 focus:border-brand-500 focus:outline-none"
						/>
						<span className="text-xs text-neutral-400 w-8">/{unit}</span>
					</div>
				) : (
					<span className="text-sm tabular-nums text-neutral-900">{formatCAD(item.rate)}<span className="text-xs text-neutral-400">/{unit}</span></span>
				)}
			</td>
			<td className="py-1.5 text-right">
				{canEdit && (
					<button
						type="button"
						onClick={onRemove}
						className="text-neutral-300 hover:text-red-500 text-lg leading-none px-1"
						aria-label="Delete line item"
					>×</button>
				)}
			</td>
		</tr>
	)
}

// ─── New assembly modal ─────────────────────────────────────────────────────

function NewAssemblyModal({
	onCancel,
	onCreated,
}: {
	onCancel: () => void
	onCreated: (a: Assembly) => void
}) {
	const [category, setCategory] = useState(CATEGORY_ORDER[0])
	const [customCategory, setCustomCategory] = useState("")
	const [name, setName] = useState("")
	const [unit, setUnit] = useState<AssemblyUnit>("LF")
	const [items, setItems] = useState<Omit<AssemblyLineItem, "id">[]>([
		{ label: "Material", rate: 0, kind: "material" },
	])
	const [pending, startTransition] = useTransition()
	const [error, setError] = useState<string | null>(null)

	const submit = () => {
		const finalCategory = category === "__custom" ? customCategory.trim() : category
		if (!finalCategory) {
			setError("Category is required")
			return
		}
		if (!name.trim()) {
			setError("Name is required")
			return
		}
		setError(null)
		startTransition(async () => {
			const res = await createAssemblyAction({
				category: finalCategory,
				name: name.trim(),
				unit,
				items,
			})
			if (res.error || !res.id) {
				setError(res.error ?? "Could not create assembly")
				return
			}
			onCreated({
				id: res.id,
				orgId: "",
				category: finalCategory,
				name: name.trim(),
				unit,
				items: items.map(i => ({ id: crypto.randomUUID(), ...i })),
				sortOrder: 0,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})
		})
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
			<div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
				<h2 className="text-lg font-semibold text-neutral-900 mb-4">New Assembly</h2>
				<div className="space-y-3">
					<label className="block">
						<span className="text-xs font-medium text-neutral-600">Category</span>
						<select
							value={category}
							onChange={e => setCategory(e.target.value)}
							className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
						>
							{CATEGORY_ORDER.map(c => <option key={c} value={c}>{c}</option>)}
							<option value="__custom">+ New category…</option>
						</select>
						{category === "__custom" && (
							<input
								value={customCategory}
								onChange={e => setCustomCategory(e.target.value)}
								placeholder="New category name"
								className="mt-2 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
							/>
						)}
					</label>
					<div className="flex gap-3">
						<label className="block flex-1">
							<span className="text-xs font-medium text-neutral-600">Name</span>
							<input
								value={name}
								onChange={e => setName(e.target.value)}
								className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
							/>
						</label>
						<label className="block w-32">
							<span className="text-xs font-medium text-neutral-600">Unit</span>
							<select
								value={unit}
								onChange={e => setUnit(e.target.value as AssemblyUnit)}
								className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
							>
								{UNITS.map(u => <option key={u} value={u}>{u}</option>)}
							</select>
						</label>
					</div>

					<div>
						<span className="text-xs font-medium text-neutral-600">Line items</span>
						<div className="mt-1 space-y-2">
							{items.map((it, idx) => (
								<div key={idx} className="flex items-center gap-2">
									<input
										value={it.label}
										onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, label: e.target.value } : x))}
										placeholder="Label"
										className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
									/>
									<select
										value={it.kind}
										onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, kind: e.target.value as "material" | "labour" } : x))}
										className="rounded border border-neutral-300 bg-white px-2 py-1.5 text-xs focus:border-brand-500 focus:outline-none"
									>
										<option value="material">Material</option>
										<option value="labour">Labour</option>
									</select>
									<input
										type="number"
										min={0}
										step={0.01}
										value={it.rate || ""}
										placeholder="0.00"
										onChange={e => setItems(items.map((x, i) => i === idx ? { ...x, rate: parseFloat(e.target.value) || 0 } : x))}
										className="w-24 rounded border border-neutral-300 bg-white px-2 py-1.5 text-sm text-right tabular-nums focus:border-brand-500 focus:outline-none"
									/>
									<button
										type="button"
										onClick={() => setItems(items.filter((_, i) => i !== idx))}
										className="text-neutral-300 hover:text-red-500 text-lg leading-none px-1"
									>×</button>
								</div>
							))}
							<button
								type="button"
								onClick={() => setItems([...items, { label: "", rate: 0, kind: "material" }])}
								className="text-xs font-medium text-brand-600 hover:text-brand-800"
							>
								+ Add line item
							</button>
						</div>
					</div>

					{error && <p className="text-xs text-red-600">{error}</p>}
				</div>
				<div className="mt-5 flex justify-end gap-2">
					<button
						type="button"
						onClick={onCancel}
						className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={submit}
						disabled={pending}
						className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
					>
						{pending ? "Creating…" : "Create"}
					</button>
				</div>
			</div>
		</div>
	)
}
