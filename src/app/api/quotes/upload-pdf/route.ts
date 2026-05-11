import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
	const formData = await request.formData()
	const file = formData.get("file") as File | null
	const token = formData.get("token") as string | null

	if (!file || !token) {
		return NextResponse.json({ error: "Missing file or token" }, { status: 400 })
	}

	if (file.type !== "application/pdf") {
		return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 })
	}

	if (file.size > 20 * 1024 * 1024) {
		return NextResponse.json({ error: "File exceeds 20MB limit" }, { status: 400 })
	}

	const supabase = await createClient()
	const path = `quotes/${token}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`

	const { error } = await supabase.storage
		.from("quote-submissions")
		.upload(path, file, { contentType: "application/pdf", upsert: false })

	if (error) {
		return NextResponse.json({ error: "Upload failed" }, { status: 500 })
	}

	return NextResponse.json({ path })
}
