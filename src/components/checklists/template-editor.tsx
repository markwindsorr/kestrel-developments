"use client"

import { useActionState, useRef, useState } from "react"
import {
	updateTemplateName,
	addTemplateItemAction,
	deleteTemplateItemAction,
} from "@/app/dashboard/checklists/actions"
import type { DbChecklistTemplate, DbChecklistTemplateItem } from "@/lib/types"
import { Button } from "@/components/ui/button"

interface TemplateEditorProps {
	template: DbChecklistTemplate
	items: DbChecklistTemplateItem[]
	canEdit: boolean
}

export const TemplateEditor = ({ template, items, canEdit }: TemplateEditorProps) => {
	const addFormRef = useRef<HTMLFormElement>(null)
	const [renameState, renameAction, renamePending] = useActionState(
		updateTemplateName,
		{ error: "" }
	)
	const [addState, addAction, addPending] = useActionState(
		addTemplateItemAction,
		{ error: "" }
	)
	const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
	const [newSection, setNewSection] = useState("")
	const [showNewSection, setShowNewSection] = useState(false)

	const sections = new Map<string, DbChecklistTemplateItem[]>()
	for (const item of items) {
		const key = item.section || "Other"
		if (!sections.has(key)) sections.set(key, [])
		sections.get(key)!.push(item)
	}

	const sectionNames = Array.from(sections.keys())

	const toggleSection = (section: string) => {
		setCollapsedSections((prev) => {
			const next = new Set(prev)
			if (next.has(section)) next.delete(section)
			else next.add(section)
			return next
		})
	}

	return (
		<div className="space-y-6">
			{canEdit && (
				<form action={renameAction} className="flex items-end gap-3">
					<input type="hidden" name="id" value={template.id} />
					<div className="flex-1">
						<label
							htmlFor="templateName"
							className="mb-1 block text-sm font-medium text-neutral-700"
						>
							Template Name
						</label>
						<input
							id="templateName"
							name="name"
							type="text"
							defaultValue={template.name}
							required
							className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
						/>
					</div>
					<Button type="submit" variant="secondary" disabled={renamePending}>
						{renamePending ? "Saving..." : "Rename"}
					</Button>
				</form>
			)}

			{renameState.error !== "" && (
				<p className="text-xs text-danger">{renameState.error}</p>
			)}

			<div className="space-y-4">
				{Array.from(sections.entries()).map(([section, sectionItems]) => {
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
									{sectionItems.length} item{sectionItems.length !== 1 ? "s" : ""}
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
												<span className="flex-1 text-sm text-neutral-700">
													{item.label}
												</span>
												{canEdit && (
													<form action={deleteTemplateItemAction}>
														<input type="hidden" name="id" value={item.id} />
														<input type="hidden" name="templateId" value={template.id} />
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
												ref={addFormRef}
												action={addAction}
												className="mt-2 flex gap-2"
												onSubmit={() => {
													setTimeout(() => addFormRef.current?.reset(), 0)
												}}
											>
												<input type="hidden" name="templateId" value={template.id} />
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

			{canEdit && (
				<div className="rounded-lg border border-dashed border-neutral-300 p-4">
					{showNewSection ? (
						<form
							action={addAction}
							className="space-y-3"
							onSubmit={() => {
								setShowNewSection(false)
								setNewSection("")
							}}
						>
							<input type="hidden" name="templateId" value={template.id} />
							<div>
								<label className="mb-1 block text-sm font-medium text-neutral-700">
									Section Name
								</label>
								<input
									name="section"
									type="text"
									required
									value={newSection}
									onChange={(e) => setNewSection(e.target.value)}
									placeholder="e.g. Drywall & Painting"
									className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
								/>
							</div>
							<div>
								<label className="mb-1 block text-sm font-medium text-neutral-700">
									First Item
								</label>
								<input
									name="label"
									type="text"
									required
									placeholder="First checklist item for this section"
									className="w-full rounded-lg border border-neutral-200 px-3 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
								/>
							</div>
							<div className="flex gap-2">
								<Button type="submit" variant="primary" size="sm" disabled={addPending}>
									Add Section
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => {
										setShowNewSection(false)
										setNewSection("")
									}}
								>
									Cancel
								</Button>
							</div>
						</form>
					) : (
						<button
							type="button"
							onClick={() => setShowNewSection(true)}
							className="flex w-full items-center justify-center gap-2 text-sm text-neutral-500 hover:text-neutral-700"
						>
							<svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
								<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
							</svg>
							Add New Section
						</button>
					)}
				</div>
			)}

			{addState.error !== "" && (
				<p className="text-xs text-danger">{addState.error}</p>
			)}

			{items.length === 0 && (
				<div className="rounded-lg bg-neutral-50 p-6 text-center">
					<p className="text-sm text-neutral-500">
						This template has no items yet. Add a section to get started.
					</p>
				</div>
			)}
		</div>
	)
}
