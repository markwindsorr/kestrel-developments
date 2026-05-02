"use client"

import { useActionState, useRef, useState } from "react"
import {
	addChecklistItem,
	toggleChecklistItem,
	deleteChecklistItem,
} from "@/app/dashboard/jobs/actions"
import type { DbChecklistItem } from "@/lib/types"
import { Button } from "@/components/ui/button"

interface ChecklistProps {
	items: DbChecklistItem[]
	jobId: string
	canEdit: boolean
}

export function Checklist({ items, jobId, canEdit }: ChecklistProps) {
	const formRef = useRef<HTMLFormElement>(null)
	const [addState, addAction, addPending] = useActionState(addChecklistItem, {
		error: "",
	})
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

	const sections = new Map<string, DbChecklistItem[]>()
	for (const item of items) {
		const key = item.section || "Other"
		if (!sections.has(key)) sections.set(key, [])
		sections.get(key)!.push(item)
	}

	const totalCount = items.length
	const completedCount = items.filter((i) => i.is_completed).length

	function toggleSection(section: string) {
		setCollapsedSections((prev) => {
			const next = new Set(prev)
			if (next.has(section)) next.delete(section)
			else next.add(section)
			return next
		})
	}

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
								<div className="border-t border-neutral-100 px-4 py-2">
									<div className="space-y-1">
										{sectionItems.map((item) => (
											<div
												key={item.id}
												className="flex items-start gap-3 rounded-md px-2 py-1.5 hover:bg-neutral-50"
											>
												<form action={toggleChecklistItem} className="pt-0.5">
													<input type="hidden" name="id" value={item.id} />
													<input type="hidden" name="jobId" value={jobId} />
													<input
														type="hidden"
														name="isCompleted"
														value={String(item.is_completed)}
													/>
													<button
														type="submit"
														className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
															item.is_completed
																? "border-success bg-success text-white"
																: "border-neutral-300 bg-white"
														}`}
													>
														{item.is_completed && (
															<svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
																<path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
															</svg>
														)}
													</button>
												</form>
												<span
													className={`flex-1 text-sm ${
														item.is_completed
															? "text-neutral-400 line-through"
															: "text-neutral-700"
													}`}
												>
													{item.label}
												</span>
												{canEdit && (
													<form action={deleteChecklistItem}>
														<input type="hidden" name="id" value={item.id} />
														<input type="hidden" name="jobId" value={jobId} />
														<button
															type="submit"
															className="text-neutral-300 hover:text-danger"
														>
															<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
																<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
															</svg>
														</button>
													</form>
												)}
											</div>
										))}

										{canEdit && (
											<form
												ref={formRef}
												action={addAction}
												className="mt-2 flex gap-2"
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
										)}
									</div>
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
		</div>
	)
}
