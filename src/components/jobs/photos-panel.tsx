"use client"

import { useState, useTransition, useRef } from "react"
import type { JobPhoto } from "@/lib/db/job-photos"
import { deleteJobPhotoAction } from "@/app/dashboard/jobs/[id]/pm-actions"

const CATEGORIES = ["Progress", "Before", "After", "Milestone", "Issue", "Other"]

type PhotoWithUrl = JobPhoto & { signedUrl: string | null }

function isVideo(mimeType: string) {
	return mimeType.startsWith("video/")
}

export function PhotosPanel({
	jobId,
	photos,
}: {
	jobId: string
	photos: PhotoWithUrl[]
}) {
	const [activeCategory, setActiveCategory] = useState<string>("all")
	const [showAdd, setShowAdd] = useState(false)
	const [uploading, setUploading] = useState(false)
	const [uploadError, setUploadError] = useState("")
	const [uploadProgress, setUploadProgress] = useState("")
	const [, startTransition] = useTransition()
	const fileRef = useRef<HTMLInputElement>(null)

	const filtered = activeCategory === "all" ? photos : photos.filter(p => p.category === activeCategory)
	const images = filtered.filter(p => !isVideo(p.mimeType))
	const videos = filtered.filter(p => isVideo(p.mimeType))

	const categoryCount = (cat: string) => photos.filter(p => p.category === cat).length

	const remove = (id: string) => {
		if (!confirm("Delete this photo?")) return
		startTransition(async () => { await deleteJobPhotoAction(jobId, id) })
	}

	const handleUpload = async (e: { preventDefault: () => void; currentTarget: HTMLFormElement }) => {
		e.preventDefault()
		const form = e.currentTarget
		const fd = new FormData(form)
		const files = fd.getAll("files") as File[]
		if (!files.length || !files[0].name) { setUploadError("Please select at least one file."); return }

		setUploading(true)
		setUploadError("")
		setUploadProgress(`Uploading ${files.length} file${files.length !== 1 ? "s" : ""}…`)

		const uploadFd = new FormData()
		files.forEach(f => uploadFd.append("files", f))
		uploadFd.set("jobId", jobId)
		uploadFd.set("category", fd.get("category") as string)
		uploadFd.set("caption", fd.get("caption") as string)

		try {
			const res = await fetch("/api/jobs/upload-photo", { method: "POST", body: uploadFd })
			const json = await res.json()
			if (json.errors?.length) { setUploadError(json.errors.join(", ")) }
			if (json.uploaded?.length) {
				form.reset()
				setShowAdd(false)
				window.location.reload()
			}
		} catch {
			setUploadError("Upload failed. Please try again.")
		} finally {
			setUploading(false)
			setUploadProgress("")
		}
	}

	return (
		<div>
			{/* Toolbar */}
			<div className="flex items-center justify-between mb-4 flex-wrap gap-3">
				{/* Category filter */}
				<div className="flex gap-1 flex-wrap">
					<button
						onClick={() => setActiveCategory("all")}
						className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeCategory === "all" ? "bg-brand-600 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}
					>
						All ({photos.length})
					</button>
					{CATEGORIES.filter(c => categoryCount(c) > 0).map(c => (
						<button
							key={c}
							onClick={() => setActiveCategory(c)}
							className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeCategory === c ? "bg-brand-600 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}
						>
							{c} ({categoryCount(c)})
						</button>
					))}
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
				<form onSubmit={handleUpload} className="mb-6 rounded-xl border border-neutral-200 bg-white px-5 py-4 space-y-3">
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
						<div className="col-span-2 sm:col-span-2">
							<label className="text-xs text-neutral-500 block mb-1">Photos / Videos * (select multiple)</label>
							<input
								ref={fileRef}
								name="files"
								type="file"
								required
								multiple
								accept="image/jpeg,image/png,image/webp,image/heic,image/gif,video/mp4,video/quicktime,video/webm"
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
							<label className="text-xs text-neutral-500 block mb-1">Caption</label>
							<input name="caption" placeholder="Optional note…" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
						</div>
					</div>
					{uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
					{uploadProgress && <p className="text-xs text-neutral-500">{uploadProgress}</p>}
					<div className="flex gap-2">
						<button type="submit" disabled={uploading} className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
							{uploading ? "Uploading…" : "Upload"}
						</button>
						<button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50">Cancel</button>
					</div>
				</form>
			)}

			{/* Empty state */}
			{photos.length === 0 && (
				<div className="rounded-xl border border-neutral-200 bg-white py-20 text-center">
					<p className="text-sm text-neutral-400">No photos or videos yet</p>
					<p className="text-xs text-neutral-300 mt-1">Upload progress photos, before/after shots, or site videos</p>
				</div>
			)}

			{/* Photo grid */}
			{images.length > 0 && (
				<div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3 mb-6">
					{images.map(photo => (
						<div key={photo.id} className="relative group break-inside-avoid rounded-lg overflow-hidden bg-neutral-100">
							{photo.signedUrl ? (
								<a href={photo.signedUrl} target="_blank" rel="noopener noreferrer">
									{/* eslint-disable-next-line @next/next/no-img-element */}
									<img
										src={photo.signedUrl}
										alt={photo.caption ?? photo.name}
										className="w-full object-cover"
										loading="lazy"
									/>
								</a>
							) : (
								<div className="aspect-square flex items-center justify-center bg-neutral-200">
									<p className="text-xs text-neutral-400">No preview</p>
								</div>
							)}
							{/* Overlay */}
							<div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
								<div className="w-full p-2 translate-y-full group-hover:translate-y-0 transition-transform">
									<div className="flex items-center justify-between">
										{photo.caption && (
											<p className="text-xs text-white font-medium truncate flex-1">{photo.caption}</p>
										)}
										<button
											onClick={() => remove(photo.id)}
											className="ml-auto shrink-0 rounded bg-red-500/80 hover:bg-red-600 text-white text-xs px-1.5 py-0.5"
										>
											Delete
										</button>
									</div>
								</div>
							</div>
							{/* Category badge */}
							<div className="absolute top-2 left-2">
								<span className="rounded px-1.5 py-0.5 text-xs font-medium bg-black/40 text-white backdrop-blur-sm">
									{photo.category}
								</span>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Video list */}
			{videos.length > 0 && (
				<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
					<div className="px-5 py-3 border-b border-neutral-100 bg-neutral-50">
						<p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">Videos ({videos.length})</p>
					</div>
					<div className="divide-y divide-neutral-100">
						{videos.map(video => (
							<div key={video.id} className="flex items-center gap-3 px-5 py-3 hover:bg-neutral-50/50 group">
								<div className="shrink-0 h-10 w-10 rounded bg-neutral-100 flex items-center justify-center">
									<svg className="h-5 w-5 text-neutral-400" fill="currentColor" viewBox="0 0 24 24">
										<path d="M8 5v14l11-7z" />
									</svg>
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-neutral-900 truncate">{video.name}</p>
									<p className="text-xs text-neutral-400">{video.category}{video.caption ? ` · ${video.caption}` : ""} · {new Date(video.uploadedAt).toLocaleDateString("en-CA")}</p>
								</div>
								<div className="flex items-center gap-2 shrink-0">
									{video.signedUrl && (
										<a href={video.signedUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-100 transition-colors">
											Play
										</a>
									)}
									<button onClick={() => remove(video.id)} className="text-neutral-200 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity">×</button>
								</div>
							</div>
						))}
					</div>
				</div>
			)}
		</div>
	)
}
