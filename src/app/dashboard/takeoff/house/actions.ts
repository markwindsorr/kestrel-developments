"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { requireOrgContext } from "@/lib/db/org"
import {
	bulkInsertAssemblies,
	createAssembly,
	deleteAssembly,
	getAssemblies,
	isAssembliesEmpty,
	updateAssembly,
	type Assembly,
	type AssemblyInput,
	type AssemblyLineItem,
	type AssemblyUnit,
} from "@/lib/db/assemblies"
import { ASSEMBLIES_SEED } from "@/lib/db/assemblies-seed"
import {
	createProject,
	deleteProject,
	getProjectById,
	updateProject,
	type Measurement,
} from "@/lib/db/projects"

const TAKEOFF_PATH = "/dashboard/takeoff/house"

// ─── Assemblies ─────────────────────────────────────────────────────────────

export async function seedAssembliesIfEmptyAction(): Promise<{
	assemblies: Assembly[]
	seeded: number
	error?: string
}> {
	try {
		const empty = await isAssembliesEmpty()
		if (!empty) {
			// Catalog already populated (possibly by another tab or a previous run
			// where the row inserts succeeded but the client never noticed).
			// Return the current catalog so the caller can sync its local state.
			const assemblies = await getAssemblies()
			return { assemblies, seeded: 0 }
		}
		const inserted = await bulkInsertAssemblies(ASSEMBLIES_SEED)
		revalidatePath(TAKEOFF_PATH)
		return { assemblies: inserted, seeded: inserted.length }
	} catch (e) {
		console.error("seedAssembliesIfEmptyAction failed:", e)
		const message = e instanceof Error ? e.message : "Failed to seed assemblies"
		return { assemblies: [], seeded: 0, error: message }
	}
}

export async function createAssemblyAction(input: AssemblyInput): Promise<{ id: string | null; error?: string }> {
	try {
		const id = await createAssembly(input)
		revalidatePath(TAKEOFF_PATH)
		return { id }
	} catch (e) {
		console.error(e)
		return { id: null, error: "Failed to create assembly" }
	}
}

export async function updateAssemblyAction(
	id: string,
	patch: { category?: string; name?: string; unit?: AssemblyUnit; items?: AssemblyLineItem[] },
): Promise<{ error?: string }> {
	try {
		await updateAssembly(id, patch)
		revalidatePath(TAKEOFF_PATH)
		return {}
	} catch (e) {
		console.error(e)
		return { error: "Failed to update assembly" }
	}
}

export async function deleteAssemblyAction(id: string): Promise<{ error?: string }> {
	try {
		await deleteAssembly(id)
		revalidatePath(TAKEOFF_PATH)
		return {}
	} catch (e) {
		console.error(e)
		return { error: "Failed to delete assembly" }
	}
}

// ─── Projects ───────────────────────────────────────────────────────────────

export async function createProjectAction(input: {
	name: string
	address?: string
	hstRate?: number
}): Promise<{ id: string | null; error?: string }> {
	try {
		const id = await createProject(input)
		revalidatePath(TAKEOFF_PATH)
		return { id }
	} catch (e) {
		console.error(e)
		return { id: null, error: "Failed to create project" }
	}
}

export async function updateProjectAction(
	id: string,
	patch: {
		name?: string
		address?: string
		jobId?: string | null
		pdfPath?: string | null
		scalePxPerFt?: number | null
		measurements?: Measurement[]
		contingencyPct?: number
		profitPct?: number
		hstEnabled?: boolean
		hstRate?: number
	},
): Promise<{ error?: string }> {
	try {
		await updateProject(id, patch)
		revalidatePath(TAKEOFF_PATH)
		return {}
	} catch (e) {
		console.error(e)
		return { error: "Failed to update project" }
	}
}

export async function deleteProjectAction(id: string): Promise<{ error?: string }> {
	try {
		await deleteProject(id)
		revalidatePath(TAKEOFF_PATH)
		return {}
	} catch (e) {
		console.error(e)
		return { error: "Failed to delete project" }
	}
}

// ─── Measurements (delegate to project update, but typed for clarity) ───────

export async function addMeasurementAction(
	projectId: string,
	measurement: Measurement,
): Promise<{ error?: string }> {
	const project = await getProjectById(projectId)
	if (!project) return { error: "Project not found" }
	const next = [...project.measurements, measurement]
	return updateProjectAction(projectId, { measurements: next })
}

export async function deleteMeasurementAction(
	projectId: string,
	measurementId: string,
): Promise<{ error?: string }> {
	const project = await getProjectById(projectId)
	if (!project) return { error: "Project not found" }
	const next = project.measurements.filter(m => m.id !== measurementId)
	return updateProjectAction(projectId, { measurements: next })
}

// ─── PDF upload ─────────────────────────────────────────────────────────────

export async function uploadProjectPdfAction(
	projectId: string,
	formData: FormData,
): Promise<{ path: string | null; error?: string }> {
	const file = formData.get("file") as File | null
	if (!file) return { path: null, error: "No file provided" }
	if (file.type !== "application/pdf") return { path: null, error: "Only PDF files are accepted" }
	if (file.size > 50 * 1024 * 1024) return { path: null, error: "File exceeds 50 MB limit" }

	const supabase = await createClient()
	const { orgContext } = await requireOrgContext()

	const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
	const path = `${orgContext.orgId}/${projectId}/${Date.now()}-${safeName}`

	const { error: uploadError } = await supabase.storage
		.from("project-plans")
		.upload(path, file, { contentType: "application/pdf", upsert: false })
	if (uploadError) {
		console.error(uploadError)
		return { path: null, error: uploadError.message }
	}

	await updateProject(projectId, { pdfPath: path })
	revalidatePath(TAKEOFF_PATH)
	return { path }
}

export async function getProjectPdfUrlAction(path: string): Promise<{ url: string | null; error?: string }> {
	const supabase = await createClient()
	const { data, error } = await supabase.storage
		.from("project-plans")
		.createSignedUrl(path, 60 * 60) // 1 hour
	if (error || !data) return { url: null, error: error?.message ?? "Could not sign URL" }
	return { url: data.signedUrl }
}
