import { createClient } from "@/lib/supabase/server"

export interface JobDocument {
	id: string
	jobId: string
	name: string
	description: string | null
	storagePath: string
	mimeType: string
	fileSize: number | null
	category: string
	uploadedBy: string | null
	uploadedAt: string
}

function toDoc(r: Record<string, unknown>): JobDocument {
	return {
		id: r.id as string,
		jobId: r.job_id as string,
		name: r.name as string,
		description: r.description as string | null,
		storagePath: r.storage_path as string,
		mimeType: r.mime_type as string,
		fileSize: r.file_size as number | null,
		category: r.category as string,
		uploadedBy: r.uploaded_by as string | null,
		uploadedAt: r.uploaded_at as string,
	}
}

export async function getJobDocuments(jobId: string): Promise<JobDocument[]> {
	try {
		const supabase = await createClient()
		const { data, error } = await supabase
			.from("job_documents")
			.select("*")
			.eq("job_id", jobId)
			.order("category")
		if (error) return []
		return (data ?? []).map(toDoc)
	} catch { return [] }
}

export async function insertJobDocument(fields: {
	jobId: string
	name: string
	description?: string
	storagePath: string
	mimeType: string
	fileSize?: number
	category: string
	uploadedBy?: string
}): Promise<string> {
	const supabase = await createClient()
	const { data, error } = await supabase
		.from("job_documents")
		.insert({
			job_id: fields.jobId,
			name: fields.name,
			description: fields.description ?? null,
			storage_path: fields.storagePath,
			mime_type: fields.mimeType,
			file_size: fields.fileSize ?? null,
			category: fields.category,
			uploaded_by: fields.uploadedBy ?? null,
		})
		.select("id")
		.single()
	if (error) throw new Error(error.message)
	return data.id
}

export async function deleteJobDocument(id: string): Promise<string | null> {
	const supabase = await createClient()
	const { data } = await supabase
		.from("job_documents")
		.select("storage_path")
		.eq("id", id)
		.single()
	const path = data?.storage_path as string | null
	await supabase.from("job_documents").delete().eq("id", id)
	return path
}

export async function getSignedUrl(storagePath: string): Promise<string | null> {
	try {
		const supabase = await createClient()
		const { data } = await supabase.storage
			.from("project-documents")
			.createSignedUrl(storagePath, 3600)
		return data?.signedUrl ?? null
	} catch { return null }
}
