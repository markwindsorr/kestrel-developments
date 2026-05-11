import { createClient } from "@/lib/supabase/server"

export interface JobPhoto {
	id: string
	jobId: string
	name: string
	storagePath: string
	mimeType: string
	fileSize: number | null
	category: string
	caption: string | null
	uploadedBy: string | null
	uploadedAt: string
}

function toPhoto(r: Record<string, unknown>): JobPhoto {
	return {
		id: r.id as string,
		jobId: r.job_id as string,
		name: r.name as string,
		storagePath: r.storage_path as string,
		mimeType: r.mime_type as string,
		fileSize: r.file_size as number | null,
		category: r.category as string,
		caption: r.caption as string | null,
		uploadedBy: r.uploaded_by as string | null,
		uploadedAt: r.uploaded_at as string,
	}
}

export async function getJobPhotos(jobId: string): Promise<JobPhoto[]> {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase
			.from("job_photos")
			.select("*")
			.eq("job_id", jobId)
			.order("uploaded_at", { ascending: false })
		if (error) return []
		return (data ?? []).map(toPhoto)
	} catch { return [] }
}

export async function insertJobPhoto(fields: {
	jobId: string
	name: string
	storagePath: string
	mimeType: string
	fileSize?: number
	category: string
	caption?: string
	uploadedBy?: string
}): Promise<string> {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("job_photos")
		.insert({
			job_id: fields.jobId,
			name: fields.name,
			storage_path: fields.storagePath,
			mime_type: fields.mimeType,
			file_size: fields.fileSize ?? null,
			category: fields.category,
			caption: fields.caption ?? null,
			uploaded_by: fields.uploadedBy ?? null,
		})
		.select("id")
		.single()
	if (error) throw new Error(error.message)
	return data.id
}

export async function deleteJobPhoto(id: string): Promise<string | null> {
	const supabase = await createClient()
	const { data } = await supabase
		.from("job_photos")
		.select("storage_path")
		.eq("id", id)
		.single()
	const path = data?.storage_path as string | null
	await supabase.from("job_photos").delete().eq("id", id)
	return path
}

export async function getSignedPhotoUrls(photos: JobPhoto[]): Promise<(JobPhoto & { signedUrl: string | null })[]> {
	if (photos.length === 0) return []
	try {
		const supabase = await createClient()
		const paths = photos.map(p => p.storagePath)
		const { data } = await supabase.storage
			.from("project-documents")
			.createSignedUrls(paths, 3600)
		const urlMap = new Map((data ?? []).map(d => [d.path, d.signedUrl]))
		return photos.map(p => ({ ...p, signedUrl: urlMap.get(p.storagePath) ?? null }))
	} catch {
		return photos.map(p => ({ ...p, signedUrl: null }))
	}
}
