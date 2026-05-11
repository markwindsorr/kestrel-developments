"use client"

import { useState, useTransition } from "react"
import type { WarrantyItem, WarrantyStatus, WarrantyPriority } from "@/lib/db/warranty-items"
import {
	addWarrantyItemAction,
	updateWarrantyStatusAction,
	deleteWarrantyItemAction,
} from "@/app/dashboard/jobs/[id]/pm-actions"

const PRIORITY_STYLES: Record<WarrantyPriority, string> = {
	low: "bg-neutral-100 text-neutral-500",
	medium: "bg-amber-100 text-amber-700",
	high: "bg-red-100 text-red-600",
}

const STATUS_STYLES: Record<WarrantyStatus, string> = {
	open: "bg-red-50 text-red-600",
	in_progress: "bg-blue-50 text-blue-600",
	completed: "bg-green-50 text-green-700",
}

const STATUS_LABELS: Record<WarrantyStatus, string> = {
	open: "Open",
	in_progress: "In Progress",
	completed: "Completed",
}

export function WarrantyPanel({
	jobId,
	warrantyItems,
	canEdit,
}: {
	jobId: string
	warrantyItems: WarrantyItem[]
	canEdit: boolean
}) {
	const [showAdd, setShowAdd] = useState(false)
	const [, startTransition] = useTransition()

	const openCount = warrantyItems.filter(w => w.status === "open").length
	const inProgressCount = warrantyItems.filter(w => w.status === "in_progress").length
	const completedCount = warrantyItems.filter(w => w.status === "completed").length

	const updateStatus = (id: string, status: WarrantyStatus) => {
		startTransition(async () => { await updateWarrantyStatusAction(jobId, id, status) })
	}

	const remove = (id: string) => {
		if (!confirm("Delete this warranty item?")) return
		startTransition(async () => { await deleteWarrantyItemAction(jobId, id) })
	}

	const today = new Date().toISOString().split("T")[0]

	return (
		<div>
			{/* Summary */}
			<div className="grid grid-cols-3 gap-4 mb-6">
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<p className="text-xl font-bold tabular-nums text-red-600">{openCount}</p>
					<p className="text-xs text-neutral-500 mt-0.5">Open</p>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<p className="text-xl font-bold tabular-nums text-blue-600">{inProgressCount}</p>
					<p className="text-xs text-neutral-500 mt-0.5">In Progress</p>
				</div>
				<div className="rounded-xl border border-neutral-200 bg-white p-4">
					<p className="text-xl font-bold tabular-nums text-green-600">{completedCount}</p>
					<p className="text-xs text-neutral-500 mt-0.5">Completed</p>
				</div>
			</div>

			<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
				{/* Toolbar */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
					<h2 className="font-semibold text-neutral-900">Warranty Items</h2>
					{canEdit && (
						<button
							onClick={() => setShowAdd(v => !v)}
							className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
						>
							+ Report Issue
						</button>
					)}
				</div>

				{/* Add form */}
				{showAdd && (
					<form
						action={async (fd) => {
							await addWarrantyItemAction(jobId, fd)
							setShowAdd(false)
						}}
						className="px-5 py-4 border-b border-neutral-100 bg-neutral-50 space-y-3"
					>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
							<div className="col-span-2">
								<label className="text-xs text-neutral-500 block mb-1">Issue Title *</label>
								<input name="title" required placeholder="Basement window leaking" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Priority</label>
								<select name="priority" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none bg-white">
									<option value="low">Low</option>
									<option value="medium" selected>Medium</option>
									<option value="high">High</option>
								</select>
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Date Reported</label>
								<input name="reportedDate" type="date" defaultValue={today} className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div className="col-span-2 sm:col-span-4">
								<label className="text-xs text-neutral-500 block mb-1">Description</label>
								<textarea name="description" rows={2} placeholder="Additional details…" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none resize-none" />
							</div>
						</div>
						<div className="flex gap-2">
							<button type="submit" className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Save</button>
							<button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50">Cancel</button>
						</div>
					</form>
				)}

				{/* List */}
				{warrantyItems.length === 0 ? (
					<div className="py-16 text-center">
						<p className="text-sm text-neutral-400">No warranty items reported</p>
					</div>
				) : (
					<div className="divide-y divide-neutral-100">
						{warrantyItems.map(w => (
							<div key={w.id} className="flex items-start gap-4 px-5 py-4 hover:bg-neutral-50/50 group">
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2 flex-wrap">
										<span className={`rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide ${PRIORITY_STYLES[w.priority]}`}>
											{w.priority}
										</span>
										<p className="text-sm font-semibold text-neutral-900">{w.title}</p>
									</div>
									{w.description && <p className="text-xs text-neutral-500 mt-1">{w.description}</p>}
									<div className="flex items-center gap-3 mt-1 flex-wrap">
										<p className="text-xs text-neutral-400">
											Reported {new Date(w.reportedDate).toLocaleDateString("en-CA")}
										</p>
										{w.completedDate && (
											<p className="text-xs text-neutral-400">
												· Completed {new Date(w.completedDate).toLocaleDateString("en-CA")}
											</p>
										)}
									</div>
								</div>
								<div className="flex items-center gap-3 shrink-0">
									{canEdit ? (
										<select
											value={w.status}
											onChange={e => updateStatus(w.id, e.target.value as WarrantyStatus)}
											className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400 ${STATUS_STYLES[w.status]}`}
										>
											<option value="open">Open</option>
											<option value="in_progress">In Progress</option>
											<option value="completed">Completed</option>
										</select>
									) : (
										<span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[w.status]}`}>
											{STATUS_LABELS[w.status]}
										</span>
									)}
									{canEdit && (
										<button onClick={() => remove(w.id)} className="text-neutral-200 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity">×</button>
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
