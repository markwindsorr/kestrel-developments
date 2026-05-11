"use client"

import { useActionState, useRef, useState, useCallback } from "react"
import {
	addChecklistItem,
	toggleChecklistItem,
} from "@/app/dashboard/jobs/actions"
import type { DbChecklistItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Modal } from "@/components/ui/modal"

interface ChecklistProps {
	items: DbChecklistItem[]
	jobId: string
	canEdit: boolean
	memberNames: Record<string, string>
}

export const Checklist = ({ items, jobId, canEdit, memberNames }: ChecklistProps) => {
	const formRef = useRef<HTMLFormElement>(null)
	const [addState, addAction, addPending] = useActionState(addChecklistItem, {
		error: "",
	})
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
	const [selectedItem, setSelectedItem] = useState<DbChecklistItem | null>(null)

	const sections = new Map<string, DbChecklistItem[]>()
	for (const item of items) {
		const key = item.section || "Other"
		if (!sections.has(key)) sections.set(key, [])
		sections.get(key)!.push(item)
	}

	const totalCount = items.length
	const completedCount = items.filter((i) => i.is_completed).length

	const toggleSection = (section: string) => {
		setCollapsedSections((prev) => {
			const next = new Set(prev)
			if (next.has(section)) next.delete(section)
			else next.add(section)
			return next
		})
	}

	const handleCloseModal = useCallback(() => setSelectedItem(null), [])
	const handleItemUpdated = useCallback(() => setSelectedItem(null), [])

	return (
		<div>
			{totalCount > 0 && (
				<div className="mb-4">
					<div className="mb-1 flex items-center justify-between text-xs text-neutral-500">
						<span>{completedCount} of {totalCount} complete</span>
						<span>{Math.round((completedCount / totalCount) * 100)}%</span>
					</div>
					<div className="h-2 overflow-hidden rounded-full bg-neutral-100">
						<div
							className="h-full rounded-full bg-success transition-all"
							style={{ width: `${(completedCount / totalCount) * 100}%` }}
						/>
					</div>
				</div>
			)}

			<div className="space-y-4">
				{Array.from(sections.entries()).map(([section, sectionItems]) => {
					const sectionCompleted = sectionItems.filter((i) => i.is_completed).length
					const isCollapsed = collapsedSections.has(section)

					return (
						<div key={section} className="rounded-lg border border-neutral-200">
							<button
								type="button"
								onClick={() => toggleSection(section)}
								className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50"
							>
								<div className="flex items-center gap-2">
									<svg
										className={`h-4 w-4 text-neutral-400 transition-transform ${isCollapsed ? "" : "rotate-90"}`}
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										strokeWidth={2}
									>
										<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
									</svg>
									<span className="text-sm font-semibold text-neutral-900">
										{section}
									</span>
								</div>
								<span className="text-xs text-neutral-400">
									{sectionCompleted}/{sectionItems.length}
								</span>
							</button>

							{!isCollapsed && (
								<div className="border-t border-neutral-100">
									<div className="divide-y divide-neutral-100">
										{sectionItems.map((item) => (
											<button
												key={item.id}
												type="button"
												onClick={() => setSelectedItem(item)}
												className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-neutral-50 active:bg-neutral-100"
											>
												<div
													className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
														item.is_completed
															? "bg-success text-white"
															: "border-2 border-neutral-300"
													}`}
												>
													{item.is_completed && (
														<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
															<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
														</svg>
													)}
												</div>
												<div className="flex-1 min-w-0">
													<p
														className={`text-sm leading-snug ${
															item.is_completed
																? "text-neutral-400"
																: "text-neutral-800"
														}`}
													>
														{item.label}
													</p>
													{item.is_completed && item.completed_by && (
														<p className="mt-0.5 text-xs text-neutral-400">
															{memberNames[item.completed_by] ?? "Unknown"}
															{item.completed_at && ` · ${formatShortDate(item.completed_at)}`}
														</p>
													)}
													{item.notes && item.is_completed && (
														<p className="mt-0.5 truncate text-xs text-neutral-400 italic">
															{item.notes}
														</p>
													)}
												</div>
												<svg className="h-4 w-4 shrink-0 text-neutral-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
													<path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
												</svg>
											</button>
										))}
									</div>

									{canEdit && (
										<div className="border-t border-neutral-100 px-4 py-3">
											<form
												ref={formRef}
												action={addAction}
												className="flex gap-2"
												onSubmit={() => {
													setTimeout(() => formRef.current?.reset(), 0)
												}}
											>
												<input type="hidden" name="jobId" value={jobId} />
												<input type="hidden" name="section" value={section} />
												<input
													name="label"
													type="text"
													required
													placeholder="Add item..."
													className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
												/>
												<Button type="submit" variant="primary" size="sm" disabled={addPending}>
													Add
												</Button>
											</form>
										</div>
									)}
								</div>
							)}
						</div>
					)
				})}
			</div>

			{addState.error !== "" && (
				<p className="mt-2 text-xs text-danger">{addState.error}</p>
			)}

			{items.length === 0 && !canEdit && (
				<p className="text-sm text-neutral-400">No checklist items yet.</p>
			)}

			{selectedItem && (
				<ChecklistItemModal
					item={selectedItem}
					jobId={jobId}
					memberNames={memberNames}
					onClose={handleCloseModal}
					onUpdated={handleItemUpdated}
				/>
			)}
		</div>
	)
}

interface ChecklistItemModalProps {
	item: DbChecklistItem
	jobId: string
	memberNames: Record<string, string>
	onClose: () => void
	onUpdated: () => void
}

const ChecklistItemModal = ({
	item,
	jobId,
	memberNames,
	onClose,
	onUpdated,
}: ChecklistItemModalProps) => {
	const [notes, setNotes] = useState(item.notes ?? "")
	const [submitting, setSubmitting] = useState(false)

	const handleToggle = async () => {
		setSubmitting(true)
		const formData = new FormData()
		formData.set("id", item.id)
		formData.set("jobId", jobId)
		formData.set("isCompleted", String(item.is_completed))
		if (!item.is_completed && notes.trim()) {
			formData.set("notes", notes.trim())
		}
		await toggleChecklistItem(formData)
		onUpdated()
	}

	return (
		<Modal open onClose={onClose} title={item.section || "Checklist Item"}>
			<div className="space-y-4">
				<p className="text-sm text-neutral-700">{item.label}</p>

				{item.is_completed ? (
					<div className="rounded-lg bg-success/10 px-4 py-3">
						<div className="flex items-center gap-2">
							<div className="flex h-6 w-6 items-center justify-center rounded-full bg-success text-white">
								<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							</div>
							<span className="text-sm font-medium text-success">Completed</span>
						</div>
						{item.completed_by && (
							<p className="mt-2 text-sm text-neutral-600">
								<span className="font-medium">By:</span>{" "}
								{memberNames[item.completed_by] ?? "Unknown"}
							</p>
						)}
						{item.completed_at && (
							<p className="text-sm text-neutral-600">
								<span className="font-medium">Date:</span>{" "}
								{formatCompletedDate(item.completed_at)}
							</p>
						)}
						{item.notes && (
							<p className="mt-2 text-sm text-neutral-600">
								<span className="font-medium">Notes:</span> {item.notes}
							</p>
						)}
					</div>
				) : (
					<div>
						<label
							htmlFor="modal-notes"
							className="mb-1 block text-sm font-medium text-neutral-700"
						>
							Notes (optional)
						</label>
						<textarea
							id="modal-notes"
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							rows={3}
							placeholder="Add any notes before marking complete..."
							className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						/>
					</div>
				)}

				<div className="flex items-center gap-2 border-t border-neutral-100 pt-4">
					{item.is_completed ? (
						<Button
							type="button"
							variant="secondary"
							onClick={handleToggle}
							disabled={submitting}
						>
							{submitting ? "Updating..." : "Mark Incomplete"}
						</Button>
					) : (
						<Button
							type="button"
							variant="primary"
							onClick={handleToggle}
							disabled={submitting}
						>
							{submitting ? "Updating..." : "Mark Complete"}
						</Button>
					)}
				</div>
			</div>
		</Modal>
	)
}

const formatShortDate = (isoString: string): string => {
	const date = new Date(isoString)
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
	})
}

const formatCompletedDate = (isoString: string): string => {
	const date = new Date(isoString)
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	})
}
