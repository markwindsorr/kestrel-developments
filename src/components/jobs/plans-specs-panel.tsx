"use client"

import { useState, useTransition, useRef } from "react"
import type { JobDocument } from "@/lib/db/job-documents"
import { deleteJobDocumentAction } from "@/app/dashboard/jobs/[id]/pm-actions"

const CATEGORIES = ["Architectural", "Structural", "Electrical", "Mechanical / Plumbing", "Site Plan", "Specifications", "Other"]

function fileIcon(mimeType: string) {
	if (mimeType === "application/pdf") return (
		<svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
			<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM8.5 18H7v-4h1.5c.83 0 1.5.67 1.5 1.5S9.33 18 8.5 18zm0-3H8v2h.5c.28 0 .5-.22.5-.5v-1c0-.28-.22-.5-.5-.5zm4.5 3h-1.5v-4H13c.83 0 1.5.67 1.5 1.5v1c0 .83-.67 1.5-1.5 1.5zm0-3h-.5v2H13c.28 0 .5-.22.5-.5v-1c0-.28-.22-.5-.5-.5zm3 3h-1v-4h1v4z"/>
		</svg>
	)
	if (mimeType.startsWith("image/")) return (
		<svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
			<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
		</svg>
	)
	return (
		<svg className="h-5 w-5 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
			<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
		</svg>
	)
}

function fmtSize(bytes: number | null) {
	if (!bytes) return ""
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
	return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

interface DocWithUrl extends JobDocument {
	signedUrl: string | null
}

export function PlansSpecsPanel({
	jobId,
	documents,
	canEdit,
}: {
	jobId: string
	documents: DocWithUrl[]
	canEdit: boolean
}) {
	const [showAdd, setShowAdd] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [uploadError, setUploadError] = useState("")
	const [, startTransition] = useTransition()
	const fileRef = useRef<HTMLInputElement>(null)

	const groups = documents.reduce<Record<string, DocWithUrl[]>>((acc, doc) => {
		if (!acc[doc.category]) acc[doc.category] = []
		acc[doc.category].push(doc)
		return acc
	}, {})

	const handleUpload = async (e: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
		e.preventDefault()
		const form = e.currentTarget
		const fd = new FormData(form)
		const file = fd.get("file") as File
		if (!file || !file.name) { setUploadError("Please select a file."); return }

		setUploading(true)
		setUploadError("")
		fd.set("jobId", jobId)

		try {
			const res = await fetch("/api/jobs/upload-document", { method: "POST", body: fd })
			const json = await res.json()
			if (!res.ok) { setUploadError(json.error ?? "Upload failed"); return }
			form.reset()
			setShowAdd(false)
			// Trigger revalidation by router refresh
			window.location.reload()
		} catch {
			setUploadError("Upload failed. Please try again.")
		} finally {
			setUploading(false)
		}
	}

	const remove = (id: string) => {
		if (!confirm("Delete this document?")) return
		startTransition(async () => { await deleteJobDocumentAction(jobId, id) })
	}

	return (
		<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
			{/* Toolbar */}
			<div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200">
				<div>
					<h2 className="font-semibold text-neutral-900">Plans & Specs</h2>
					<p className="text-xs text-neutral-500 mt-0.5">{documents.length} document{documents.length !== 1 ? "s" : ""}</p>
				</div>
					<button
					onClick={() => setShowAdd(v => !v)}
					className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
				>
					+ Upload
				</button>
			</div>

			{/* Upload form */}
			{showAdd && (
				<form onSubmit={handleUpload} className="px-5 py-4 border-b border-neutral-100 bg-neutral-50 space-y-3">
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<div className="col-span-2">
							<label className="text-xs text-neutral-500 block mb-1">File *</label>
							<input
								ref={fileRef}
								name="file"
								type="file"
								required
								accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.xls,.xlsx,.doc,.docx"
								className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none file:mr-2 file:rounded file:border-0 file:bg-brand-50 file:px-2 file:py-0.5 file:text-xs file:font-medium file:text-brand-700"
							/>
						</div>
						<div>
							<label className="text-xs text-neutral-500 block mb-1">Category</label>
							<select name="category" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none bg-white">
								{CATEGORIES.map(c => <option key={c}>{c}</option>)}
							</select>
						</div>
						<div>
							<label className="text-xs text-neutral-500 block mb-1">Description</label>
							<input name="description" placeholder="e.g. Rev 3" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
						</div>
					</div>
					{uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
					<div className="flex gap-2">
						<button type="submit" disabled={uploading} className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
							{uploading ? "Uploading…" : "Upload"}
						</button>
						<button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50">Cancel</button>
					</div>
				</form>
			)}

			{/* Document list */}
			{documents.length === 0 ? (
				<div className="py-16 text-center">
					<p className="text-sm text-neutral-400">No documents uploaded yet</p>
					<p className="text-xs text-neutral-300 mt-1">Upload plans, specs, permits, or any project file</p>
				</div>
			) : (
				<div>
					{Object.entries(groups).map(([category, docs]) => (
						<div key={category}>
							<div className="px-5 py-2 bg-neutral-50 border-b border-neutral-100">
								<p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{category}</p>
							</div>
							<div className="divide-y divide-neutral-50">
								{docs.map(doc => (
									<div key={doc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50/50 group">
										<div className="shrink-0">{fileIcon(doc.mimeType)}</div>
										<div className="flex-1 min-w-0">
											<p className="text-sm font-medium text-neutral-900 truncate">{doc.name}</p>
											<p className="text-xs text-neutral-400">
												{doc.description && <span className="mr-2">{doc.description}</span>}
												{fmtSize(doc.fileSize)}
												{doc.fileSize && " · "}
												{new Date(doc.uploadedAt).toLocaleDateString("en-CA")}
											</p>
										</div>
										<div className="flex items-center gap-2 shrink-0">
											{doc.signedUrl && (
												<a
													href={doc.signedUrl}
													target="_blank"
													rel="noopener noreferrer"
													className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
												>
													View
												</a>
											)}
											{canEdit && (
												<button
													onClick={() => remove(doc.id)}
													className="text-neutral-200 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity"
												>
													×
												</button>
											)}
										</div>
									</div>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	)
}
