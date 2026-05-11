import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { insertJobPhoto } from "@/lib/db/job-photos"

const MAX_SIZE = 100 * 1024 * 1024 // 100MB for video
const ALLOWED_TYPES = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/heic",
	"image/gif",
	"video/mp4",
	"video/quicktime",
	"video/x-msvideo",
	"video/webm",
]

export async function POST(request: NextRequest) {
	const formData = await request.formData()
	const files = formData.getAll("files") as File[]
	const jobId = formData.get("jobId") as string | null
	const category = (formData.get("category") as string) || "Progress"
	const caption = (formData.get("caption") as string) || null

	if (!files.length || !jobId) {
		return NextResponse.json({ error: "Missing files or jobId" }, { status: 400 })
	}

	const supabase = await createClient()
	const { data: { user } } = await supabase.auth.getUser()
	if (!user) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const admin = createAdminClient()
	const results: { id: string; name: string }[] = []
	const errors: string[] = []

	for (const file of files) {
		if (file.size > MAX_SIZE) { errors.push(`${file.name}: exceeds 100MB`); continue }
		if (!ALLOWED_TYPES.includes(file.type)) { errors.push(`${file.name}: unsupported type`); continue }

		const safeName = file.name.replace(/[^a-zA-Z0-9._\-\s]/g, "_")
		const storagePath = `jobs/${jobId}/photos/${Date.now()}-${safeName}`

		const { error: uploadError } = await admin.storage
			.from("project-documents")
			.upload(storagePath, file, { contentType: file.type, upsert: false })

		if (uploadError) { errors.push(`${file.name}: ${uploadError.message}`); continue }

		try {
			const id = await insertJobPhoto({
				jobId,
				name: file.name,
				storagePath,
				mimeType: file.type,
				fileSize: file.size,
				category,
				caption: caption || undefined,
				uploadedBy: user.id,
			})
			results.push({ id, name: file.name })
		} catch (e) {
			await admin.storage.from("project-documents").remove([storagePath])
			errors.push(`${file.name}: ${(e as Error).message}`)
		}
	}

	return NextResponse.json({ uploaded: results, errors })
}
