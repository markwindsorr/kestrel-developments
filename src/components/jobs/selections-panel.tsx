"use client"

import { useState, useTransition } from "react"
import type { Selection, SelectionStatus } from "@/lib/db/selections"
import {
	addSelectionAction,
	updateSelectionAction,
	deleteSelectionAction,
} from "@/app/dashboard/jobs/[id]/pm-actions"

const STATUS_STYLES: Record<SelectionStatus, string> = {
	pending: "bg-neutral-100 text-neutral-600",
	selected: "bg-blue-100 text-blue-700",
	ordered: "bg-amber-100 text-amber-700",
	installed: "bg-green-100 text-green-700",
}

const STATUS_LABELS: Record<SelectionStatus, string> = {
	pending: "Pending",
	selected: "Selected",
	ordered: "Ordered",
	installed: "Installed",
}

const CATEGORIES = ["Flooring", "Cabinets", "Countertops", "Tile", "Fixtures", "Appliances", "Lighting", "Paint", "Windows & Doors", "Other"]

function fmtMoney(n: number) {
	return `$${n.toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function SelectionsPanel({
	jobId,
	selections,
	canEdit,
}: {
	jobId: string
	selections: Selection[]
	canEdit: boolean
}) {
	const [showAdd, setShowAdd] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editChoice, setEditChoice] = useState("")
	const [editCost, setEditCost] = useState("")
	const [editStatus, setEditStatus] = useState<SelectionStatus>("pending")
	const [, startTransition] = useTransition()

	const totalAllowance = selections.reduce((s, sel) => s + (sel.allowance ?? 0), 0)
	const totalActual = selections.filter(s => s.actualCost !== null).reduce((s, sel) => s + (sel.actualCost ?? 0), 0)
	const pendingCount = selections.filter(s => s.status === "pending").length

	const groups = selections.reduce<Record<string, Selection[]>>((acc, sel) => {
		if (!acc[sel.category]) acc[sel.category] = []
		acc[sel.category].push(sel)
		return acc
	}, {})

	const remove = (id: string) => {
		if (!confirm("Delete this selection?")) return
		startTransition(async () => { await deleteSelectionAction(jobId, id) })
	}

	const startEdit = (sel: Selection) => {
		setEditingId(sel.id)
		setEditChoice(sel.clientChoice ?? "")
		setEditCost(sel.actualCost?.toString() ?? "")
		setEditStatus(sel.status)
	}

	const saveEdit = (id: string) => {
		const actualCost = editCost ? parseFloat(editCost) : undefined
		startTransition(async () => {
			await updateSelectionAction(jobId, id, editStatus, editChoice || undefined, actualCost)
			setEditingId(null)
		})
	}

	return (
		<div>
			{/* Summary */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-6">
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<p className="text-xl font-bold tabular-nums text-neutral-700">{fmtMoney(totalAllowance)}</p>
					<p className="text-xs text-neutral-500 mt-0.5">Total Allowances</p>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<p className={`text-xl font-bold tabular-nums ${totalActual > totalAllowance ? "text-red-600" : "text-green-600"}`}>
						{fmtMoney(totalActual)}
					</p>
					<p className="text-xs text-neutral-500 mt-0.5">Actual Spend</p>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<p className="text-xl font-bold tabular-nums text-amber-600">{pendingCount}</p>
					<p className="text-xs text-neutral-500 mt-0.5">Pending Selections</p>
				</div>
			</div>

			<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
				{/* Toolbar */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
					<h2 className="font-semibold text-neutral-900">Client Selections</h2>
					{canEdit && (
						<button
							onClick={() => setShowAdd(v => !v)}
							className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
						>
							+ Add Item
						</button>
					)}
				</div>

				{/* Add form */}
				{showAdd && (
					<form
						action={async (fd) => {
							await addSelectionAction(jobId, fd)
							setShowAdd(false)
						}}
						className="px-5 py-4 border-b border-neutral-100 bg-neutral-50 space-y-3"
					>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Category *</label>
								<select name="category" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none bg-white">
									{CATEGORIES.map(c => <option key={c}>{c}</option>)}
								</select>
							</div>
							<div className="col-span-2">
								<label className="text-xs text-neutral-500 block mb-1">Item Description *</label>
								<input name="item" required placeholder="Master Bedroom Flooring" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Allowance ($)</label>
								<input name="allowance" type="number" min="0" step="0.01" placeholder="8500" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Due Date</label>
								<input name="dueDate" type="date" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div className="col-span-2 sm:col-span-3">
								<label className="text-xs text-neutral-500 block mb-1">Notes</label>
								<input name="notes" placeholder="Any notes…" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
						</div>
						<div className="flex gap-2">
							<button type="submit" className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Save</button>
							<button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50">Cancel</button>
						</div>
					</form>
				)}

				{/* Grouped list */}
				{selections.length === 0 ? (
					<div className="py-16 text-center">
						<p className="text-sm text-neutral-400">No selections tracked yet</p>
					</div>
				) : (
					<div>
						{Object.entries(groups).map(([category, items]) => (
							<div key={category}>
								<div className="px-5 py-2 bg-neutral-50 border-b border-neutral-100">
									<p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{category}</p>
								</div>
								<div className="divide-y divide-neutral-50">
									{items.map(sel => (
										<div key={sel.id} className="px-5 py-3 hover:bg-neutral-50/50 group">
											{editingId === sel.id ? (
												<div className="space-y-2">
													<div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
														<div className="col-span-2">
															<label className="text-xs text-neutral-500 block mb-1">Client Choice</label>
															<input
																value={editChoice}
																onChange={e => setEditChoice(e.target.value)}
																placeholder="e.g. Oak Hardwood"
																className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
															/>
														</div>
														<div>
															<label className="text-xs text-neutral-500 block mb-1">Actual Cost ($)</label>
															<input
																value={editCost}
																onChange={e => setEditCost(e.target.value)}
																type="number" min="0" step="0.01"
																className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
															/>
														</div>
														<div>
															<label className="text-xs text-neutral-500 block mb-1">Status</label>
															<select
																value={editStatus}
																onChange={e => setEditStatus(e.target.value as SelectionStatus)}
																className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none bg-white"
															>
																{(Object.keys(STATUS_LABELS) as SelectionStatus[]).map(s => (
																	<option key={s} value={s}>{STATUS_LABELS[s]}</option>
																))}
															</select>
														</div>
													</div>
													<div className="flex gap-2">
														<button onClick={() => saveEdit(sel.id)} className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700">Save</button>
														<button onClick={() => setEditingId(null)} className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50">Cancel</button>
													</div>
												</div>
											) : (
												<div className="flex items-start gap-3">
													<div className="flex-1 min-w-0">
														<div className="flex items-center gap-2 flex-wrap">
															<p className="text-sm font-medium text-neutral-900">{sel.item}</p>
															<span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[sel.status]}`}>
																{STATUS_LABELS[sel.status]}
															</span>
															{sel.dueDate && (
																<span className="text-xs text-neutral-400">Due {new Date(sel.dueDate).toLocaleDateString("en-CA")}</span>
															)}
														</div>
														{sel.clientChoice && (
															<p className="text-xs text-neutral-600 mt-0.5 font-medium">Choice: {sel.clientChoice}</p>
														)}
														{sel.notes && <p className="text-xs text-neutral-400 mt-0.5 italic">{sel.notes}</p>}
													</div>
													<div className="flex items-center gap-3 shrink-0">
														{sel.allowance !== null && (
															<div className="text-right">
																<p className="text-xs text-neutral-400">Allowance</p>
																<p className="text-sm font-semibold text-neutral-700">{fmtMoney(sel.allowance)}</p>
															</div>
														)}
														{sel.actualCost !== null && (
															<div className="text-right">
																<p className="text-xs text-neutral-400">Actual</p>
																<p className={`text-sm font-semibold ${sel.allowance !== null && sel.actualCost > sel.allowance ? "text-red-600" : "text-green-600"}`}>
																	{fmtMoney(sel.actualCost)}
																</p>
															</div>
														)}
														{canEdit && (
															<div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
																<button onClick={() => startEdit(sel)} className="text-xs text-brand-500 hover:text-brand-700 px-2 py-1 rounded hover:bg-brand-50">Edit</button>
																<button onClick={() => remove(sel.id)} className="text-neutral-300 hover:text-red-400 text-lg leading-none">×</button>
															</div>
														)}
													</div>
												</div>
											)}
										</div>
									))}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
