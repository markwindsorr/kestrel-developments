import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { insertJobDocumentAdmin } from "@/lib/db/job-documents"

const MAX_SIZE = 50 * 1024 * 1024
const ALLOWED_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/heic",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	"application/msword",
]

export async function POST(request: NextRequest) {
	const formData = await request.formData()
	const file = formData.get("file") as File | null
	const jobId = formData.get("jobId") as string | null
	const category = (formData.get("category") as string) || "Plans"
	const description = (formData.get("description") as string) || null

	if (!file || !jobId) {
		return NextResponse.json({ error: "Missing file or jobId" }, { status: 400 })
	}
	if (file.size > MAX_SIZE) {
		return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 400 })
	}
	if (!ALLOWED_TYPES.includes(file.type)) {
		return NextResponse.json({ error: "File type not supported" }, { status: 400 })
	}

	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const admin = createAdminClient()
	const safeName = file.name.replace(/[^a-zA-Z0-9._\-\s]/g, "_")
	const storagePath = `jobs/${jobId}/${Date.now()}-${safeName}`

	const { error: uploadError } = await admin.storage
		.from("project-documents")
		.upload(storagePath, file, { contentType: file.type, upsert: false })

	if (uploadError) {
		return NextResponse.json({ error: uploadError.message }, { status: 500 })
	}

	try {
		const id = await insertJobDocumentAdmin({
			jobId,
			name: file.name,
			description: description || undefined,
			storagePath,
			mimeType: file.type,
			fileSize: file.size,
			category,
			uploadedBy: user.id,
		})
		return NextResponse.json({ id, name: file.name, mimeType: file.type })
	} catch (e) {
		// Clean up storage if DB insert fails
		await admin.storage.from("project-documents").remove([storagePath])
		return NextResponse.json({ error: (e as Error).message }, { status: 500 })
	}
}
