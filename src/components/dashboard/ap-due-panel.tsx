"use client"

import { useState, useTransition } from "react"
import type { APItem } from "@/lib/db/ap-items"
import { addAPItemAction, markAPPaidAction, deleteAPItemAction } from "@/app/dashboard/actions"

export function APDuePanel({
	items,
	allItems,
	company,
}: {
	items: APItem[]
	allItems: APItem[]
	company: string
}) {
	const [showAll, setShowAll] = useState(false)
	const [showAdd, setShowAdd] = useState(false)
	const [pending, startTransition] = useTransition()

	const displayed = showAll ? allItems : items

	const markPaid = (id: string) => {
		startTransition(async () => { await markAPPaidAction(id) })
	}

	const remove = (id: string) => {
		startTransition(async () => { await deleteAPItemAction(id) })
	}

	return (
		<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
			<div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
				<div>
					<h2 className="font-semibold text-neutral-900">Accounts Payable</h2>
					<p className="text-xs text-neutral-500 mt-0.5">
						{items.length > 0 ? `${items.length} payment${items.length > 1 ? "s" : ""} due this week` : "Nothing due this week"}
					</p>
				</div>
				<button
					onClick={() => setShowAdd(s => !s)}
					className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 transition-colors"
				>
					+ Add
				</button>
			</div>

			{/* Add form */}
			{showAdd && (
				<form
					action={async (fd) => {
						fd.set("company", company)
						await addAPItemAction(fd)
						setShowAdd(false)
					}}
					className="px-5 py-4 border-b border-neutral-100 bg-neutral-50 space-y-3"
				>
					<div className="grid grid-cols-2 gap-3">
						<div className="col-span-2">
							<label className="text-xs text-neutral-500 block mb-1">Vendor *</label>
							<input name="vendor" required placeholder="ABC Concrete Ltd." className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
						</div>
						<div>
							<label className="text-xs text-neutral-500 block mb-1">Amount *</label>
							<input name="amount" type="number" step="0.01" min="0" required placeholder="0.00" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
						</div>
						<div>
							<label className="text-xs text-neutral-500 block mb-1">Due Date *</label>
							<input name="dueDate" type="date" required className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
						</div>
						<div className="col-span-2">
							<label className="text-xs text-neutral-500 block mb-1">Description</label>
							<input name="description" placeholder="Invoice #1042 — framing labour" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
						</div>
					</div>
					<div className="flex gap-2">
						<button type="submit" className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Save</button>
						<button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50">Cancel</button>
					</div>
				</form>
			)}

			{/* Item list */}
			{displayed.length === 0 && !showAdd ? (
				<div className="px-5 py-6 text-center">
					<p className="text-sm text-neutral-400">No unpaid items</p>
				</div>
			) : (
				<ul className={`divide-y divide-neutral-100 ${pending ? "opacity-60 pointer-events-none" : ""}`}>
					{displayed.map(item => {
						const due = new Date(item.dueDate)
						const today = new Date(); today.setHours(0,0,0,0)
						const overdue = due < today
						const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1)
						const dueLabel = due < today ? "Overdue" : due.getTime() === today.getTime() ? "Today" : due.getTime() === tomorrow.getTime() ? "Tomorrow" : due.toLocaleDateString("en-CA", { month: "short", day: "numeric" })

						return (
							<li key={item.id} className="flex items-start gap-3 px-5 py-3">
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-neutral-800 truncate">{item.vendor}</p>
									{item.description && <p className="text-xs text-neutral-400 truncate mt-0.5">{item.description}</p>}
									<div className="flex items-center gap-2 mt-1">
										<span className={`text-xs font-semibold ${overdue ? "text-red-600" : "text-neutral-500"}`}>{dueLabel}</span>
										<span className="text-xs font-bold text-neutral-900">${Math.round(item.amount).toLocaleString("en-CA")}</span>
									</div>
								</div>
								<div className="flex items-center gap-1 shrink-0">
									<button onClick={() => markPaid(item.id)} title="Mark paid"
										className="rounded px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 transition-colors">
										Paid
									</button>
									<button onClick={() => remove(item.id)} title="Delete"
										className="rounded px-1.5 py-1 text-neutral-300 hover:text-red-500 transition-colors text-base leading-none">
										×
									</button>
								</div>
							</li>
						)
					})}
				</ul>
			)}

			{allItems.length > items.length && (
				<div className="border-t border-neutral-100 px-5 py-2.5">
					<button onClick={() => setShowAll(s => !s)} className="text-xs text-brand-600 hover:underline">
						{showAll ? "Show due this week only" : `Show all ${allItems.length} unpaid items`}
					</button>
				</div>
			)}
		</div>
	)
}
