import { createClient } from "@/lib/supabase/server"

export interface ProjectDocument {
	id: string
	estimateId: string
	name: string
	driveFileId: string
	driveUrl: string
	mimeType: string
	tradeCategory: string | null
	uploadedAt: string
}

export async function getProjectDocuments(estimateId: string): Promise<ProjectDocument[]> {
	const supabase = await createClient()
	const { data } = await supabase
		.from("project_documents")
		.select("*")
		.eq("estimate_id", estimateId)
		.order("uploaded_at", { ascending: false })

	return (data ?? []).map(mapRow)
}

export async function addProjectDocument(doc: {
	estimateId: string
	name: string
	driveFileId: string
	driveUrl: string
	mimeType?: string
	tradeCategory?: string | null
}): Promise<ProjectDocument | null> {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return null

	const { data } = await supabase
		.from("project_documents")
		.insert({
			estimate_id: doc.estimateId,
			user_id: user.id,
			name: doc.name,
			drive_file_id: doc.driveFileId,
			drive_url: doc.driveUrl,
			mime_type: doc.mimeType ?? "application/pdf",
			trade_category: doc.tradeCategory ?? null,
		})
		.select("*")
		.single()

	return data ? mapRow(data) : null
}

export async function deleteProjectDocument(id: string): Promise<void> {
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) return

	await supabase
		.from("project_documents")
		.delete()
		.eq("id", id)
		.eq("user_id", user.id)
}

function mapRow(row: Record<string, unknown>): ProjectDocument {
	return {
		id: row.id as string,
		estimateId: row.estimate_id as string,
		name: row.name as string,
		driveFileId: row.drive_file_id as string,
		driveUrl: row.drive_url as string,
		mimeType: row.mime_type as string,
		tradeCategory: row.trade_category as string | null,
		uploadedAt: row.uploaded_at as string,
	}
}
