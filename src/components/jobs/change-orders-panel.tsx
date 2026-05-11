"use client"

import { useState, useTransition } from "react"
import type { ChangeOrder, ChangeOrderStatus } from "@/lib/db/change-orders"
import {
	addChangeOrderAction,
	updateChangeOrderStatusAction,
	deleteChangeOrderAction,
} from "@/app/dashboard/jobs/[id]/pm-actions"

const STATUS_STYLES: Record<ChangeOrderStatus, string> = {
	pending: "bg-amber-100 text-amber-700",
	approved: "bg-green-100 text-green-700",
	rejected: "bg-red-100 text-red-600",
}

function fmt(n: number) {
	const abs = Math.abs(n).toLocaleString("en-CA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
	return n < 0 ? `-$${abs}` : `+$${abs}`
}

export function ChangeOrdersPanel({
	jobId,
	changeOrders,
	canEdit,
}: {
	jobId: string
	changeOrders: ChangeOrder[]
	canEdit: boolean
}) {
	const [showAdd, setShowAdd] = useState(false)
	const [, startTransition] = useTransition()

	const approvedTotal = changeOrders.filter(c => c.status === "approved").reduce((s, c) => s + c.amount, 0)
	const pendingTotal = changeOrders.filter(c => c.status === "pending").reduce((s, c) => s + c.amount, 0)

	const updateStatus = (id: string, status: ChangeOrderStatus) => {
		startTransition(async () => { await updateChangeOrderStatusAction(jobId, id, status) })
	}

	const remove = (id: string) => {
		if (!confirm("Delete this change order?")) return
		startTransition(async () => { await deleteChangeOrderAction(jobId, id) })
	}

	return (
		<div>
			{/* Summary */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 mb-6">
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<p className="text-xl font-bold tabular-nums text-green-600">{fmt(approvedTotal)}</p>
					<p className="text-xs text-neutral-500 mt-0.5">Approved Changes</p>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<p className="text-xl font-bold tabular-nums text-amber-600">{fmt(pendingTotal)}</p>
					<p className="text-xs text-neutral-500 mt-0.5">Pending Approval</p>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<p className="text-xl font-bold tabular-nums text-neutral-700">{changeOrders.length}</p>
					<p className="text-xs text-neutral-500 mt-0.5">Total Change Orders</p>
				</div>
			</div>

			<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
				{/* Toolbar */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
					<h2 className="font-semibold text-neutral-900">Change Orders</h2>
					{canEdit && (
						<button
							onClick={() => setShowAdd(v => !v)}
							className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
						>
							+ New CO
						</button>
					)}
				</div>

				{/* Add form */}
				{showAdd && (
					<form
						action={async (fd) => {
							await addChangeOrderAction(jobId, fd)
							setShowAdd(false)
						}}
						className="px-5 py-4 border-b border-neutral-100 bg-neutral-50 space-y-3"
					>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<div className="col-span-2">
								<label className="text-xs text-neutral-500 block mb-1">Title *</label>
								<input name="title" required placeholder="Add garage extension" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Type</label>
								<select name="type" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none bg-white">
									<option value="addition">Addition (+)</option>
									<option value="deduction">Deduction (−)</option>
								</select>
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Amount ($) *</label>
								<input name="amount" type="number" min="0" step="0.01" required placeholder="45000" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div className="col-span-2 sm:col-span-4">
								<label className="text-xs text-neutral-500 block mb-1">Description</label>
								<textarea name="description" rows={2} placeholder="Details of the change…" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none resize-none" />
							</div>
						</div>
						<div className="flex gap-2">
							<button type="submit" className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Save</button>
							<button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50">Cancel</button>
						</div>
					</form>
				)}

				{/* List */}
				{changeOrders.length === 0 ? (
					<div className="py-16 text-center">
						<p className="text-sm text-neutral-400">No change orders yet</p>
					</div>
				) : (
					<div className="divide-y divide-neutral-100">
						{changeOrders.map(co => (
							<div key={co.id} className="flex items-start gap-4 px-5 py-4 hover:bg-neutral-50/50 group">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<span className="text-xs font-mono text-neutral-400">CO #{co.number}</span>
										<p className="text-sm font-semibold text-neutral-900">{co.title}</p>
									</div>
									{co.description && <p className="text-xs text-neutral-500 mt-1">{co.description}</p>}
									<p className="text-xs text-neutral-400 mt-1">
										{new Date(co.requestedAt).toLocaleDateString("en-CA")}
										{co.approvedAt && ` · Approved ${new Date(co.approvedAt).toLocaleDateString("en-CA")}`}
									</p>
								</div>
								<div className="flex items-center gap-3 shrink-0">
									<p className={`text-sm font-bold tabular-nums ${co.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
										{fmt(co.amount)}
									</p>
									{canEdit ? (
										<select
											value={co.status}
											onChange={e => updateStatus(co.id, e.target.value as ChangeOrderStatus)}
											className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400 ${STATUS_STYLES[co.status]}`}
										>
											<option value="pending">Pending</option>
											<option value="approved">Approved</option>
											<option value="rejected">Rejected</option>
										</select>
									) : (
										<span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[co.status]}`}>
											{co.status.charAt(0).toUpperCase() + co.status.slice(1)}
										</span>
									)}
									{canEdit && (
										<button onClick={() => remove(co.id)} className="text-neutral-200 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity">×</button>
									)}
								</div>
							</div>
						))}
					</div>
				)}
			</div>
		</div>
	)
}
