import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_SIZE = 50 * 1024 * 1024
const ALLOWED_TYPES = [
	"application/pdf",
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/heic",
	"application/vnd.ms-excel",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]

export async function POST(request: NextRequest) {
	const formData = await request.formData()
	const file = formData.get("file") as File | null
	const estimateId = formData.get("estimateId") as string | null
	const tradeCategory = formData.get("tradeCategory") as string | null

	if (!file || !estimateId) {
		return NextResponse.json({ error: "Missing file or estimateId" }, { status: 400 })
	}

	if (file.size > MAX_SIZE) {
		return NextResponse.json({ error: "File exceeds 50MB limit" }, { status: 400 })
	}

	if (!ALLOWED_TYPES.includes(file.type)) {
		return NextResponse.json({ error: "File type not supported" }, { status: 400 })
	}

	// Verify user is authenticated
	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const admin = createAdminClient()
	const safeName = file.name.replace(/[^a-zA-Z0-9._\-\s]/g, "_")
	const storagePath = `${estimateId}/${Date.now()}-${safeName}`

	// Upload file using admin client (bypasses bucket RLS)
	const { error: uploadError } = await admin.storage
		.from("project-documents")
		.upload(storagePath, file, { contentType: file.type, upsert: false })

	if (uploadError) {
		console.error("Storage upload error:", uploadError)
		return NextResponse.json({ error: uploadError.message }, { status: 500 })
	}

	// Insert document record using admin client
	const { data, error: dbError } = await admin
		.from("project_documents")
		.insert({
			estimate_id: estimateId,
			user_id: user.id,
			name: file.name,
			drive_file_id: storagePath,
			drive_url: storagePath,
			mime_type: file.type,
			trade_category: tradeCategory || null,
		})
		.select("id, name, mime_type")
		.single()

	if (dbError || !data) {
		console.error("DB insert error:", dbError)
		return NextResponse.json({ error: "Failed to save document record" }, { status: 500 })
	}

	return NextResponse.json({ id: data.id, name: data.name, mimeType: data.mime_type })
}
