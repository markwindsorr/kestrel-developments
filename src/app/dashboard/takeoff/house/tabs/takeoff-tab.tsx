"use client"

import { useEffect, useMemo, useRef, useState, useTransition } from "react"
import type { Assembly, AssemblyUnit } from "@/lib/db/assemblies"
import type { Project } from "@/lib/db/projects"
import {
	addMeasurementAction,
	deleteMeasurementAction,
	getProjectPdfUrlAction,
	updateProjectAction,
	uploadProjectPdfAction,
} from "../actions"
import { buildMeasurement } from "../lib/measurement"
import { formatCAD } from "../lib/format"
import {
	PlanCanvas,
	feetFromPx,
	sqftFromPxArea,
	type MeasurementDraft,
	type PlanCanvasHandle,
	type ScaleDraft,
	type ToolMode,
} from "../canvas/plan-canvas"

interface Props {
	project: Project
	assemblies: Assembly[]
	onProjectUpdate: (p: Project) => void
}

interface SaveDraft {
	kind: "linear" | "area" | "count"
	value: number   // converted to ft / sqft / count
	unit: AssemblyUnit
	points: import("@/lib/db/projects").MeasurementPoint[]
}

export function TakeoffTab({ project, assemblies, onProjectUpdate }: Props) {
	const canvasRef = useRef<PlanCanvasHandle>(null)
	const fileRef = useRef<HTMLInputElement>(null)

	const [pdfUrl, setPdfUrl] = useState<string | null>(null)
	const [uploading, setUploading] = useState(false)
	const [uploadError, setUploadError] = useState<string | null>(null)

	const [tool, setTool] = useState<ToolMode>("none")
	const [inProgressCount, setInProgressCount] = useState(0)

	const [scaleDraft, setScaleDraft] = useState<ScaleDraft | null>(null)
	const [saveDraft, setSaveDraft] = useState<SaveDraft | null>(null)

	const [, startTransition] = useTransition()

	// Fetch (or refresh) the signed URL whenever the project's pdfPath changes.
	// A pdfPath that's null on first render means "no PDF yet" — pdfUrl is
	// already null from the initial useState, no synchronous reset needed.
	useEffect(() => {
		if (!project.pdfPath) return
		let cancelled = false
		;(async () => {
			const res = await getProjectPdfUrlAction(project.pdfPath!)
			if (cancelled) return
			if (res.url) setPdfUrl(res.url)
			else setUploadError(res.error ?? "Could not load plan PDF")
		})()
		return () => { cancelled = true }
	}, [project.pdfPath])

	// ─── PDF upload ─────────────────────────────────────────────────────────
	const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0]
		if (!file) return
		setUploadError(null)
		setUploading(true)
		const form = new FormData()
		form.append("file", file)
		const res = await uploadProjectPdfAction(project.id, form)
		setUploading(false)
		if (res.error || !res.path) {
			setUploadError(res.error ?? "Upload failed")
			if (fileRef.current) fileRef.current.value = ""
			return
		}
		// Optimistically update project; signed URL refetches via effect.
		onProjectUpdate({ ...project, pdfPath: res.path })
		if (fileRef.current) fileRef.current.value = ""
	}

	// ─── Tool switching ─────────────────────────────────────────────────────
	const switchTool = (next: ToolMode) => {
		canvasRef.current?.cancelInProgress()
		setTool(next)
		setInProgressCount(0)
	}

	// ─── Scale handling ────────────────────────────────────────────────────
	const handleScaleComplete = (draft: ScaleDraft) => {
		setScaleDraft(draft)
		// keep tool on "scale" until user enters a distance; modal handles next step
	}

	const persistScale = async (realFt: number) => {
		if (!scaleDraft || realFt <= 0) return
		const pxPerFt = scaleDraft.distancePx / realFt
		const updated = { ...project, scalePxPerFt: pxPerFt }
		onProjectUpdate(updated)
		setScaleDraft(null)
		setTool("none")
		await updateProjectAction(project.id, { scalePxPerFt: pxPerFt })
	}

	// ─── Measurement complete (linear / area / count) ──────────────────────
	const requireScale = (): boolean => {
		if (project.scalePxPerFt && project.scalePxPerFt > 0) return true
		alert("Set the scale first — pick two known points on the plan and enter the real-world distance.")
		canvasRef.current?.cancelInProgress()
		return false
	}

	const handleLinearComplete = (d: MeasurementDraft) => {
		if (!requireScale()) return
		const valueFt = feetFromPx(d.valueRawPx, project.scalePxPerFt!)
		setSaveDraft({ kind: "linear", value: valueFt, unit: "LF", points: d.points })
	}

	const handleAreaComplete = (d: MeasurementDraft) => {
		if (!requireScale()) return
		const sqft = sqftFromPxArea(d.valueRawPx, project.scalePxPerFt!)
		setSaveDraft({ kind: "area", value: sqft, unit: "SF", points: d.points })
	}

	const handleCountComplete = (d: MeasurementDraft) => {
		setSaveDraft({ kind: "count", value: d.valueRawPx, unit: "EA", points: d.points })
	}

	// ─── Save measurement ──────────────────────────────────────────────────
	const persistMeasurement = async (label: string, assemblyId: string) => {
		if (!saveDraft) return
		const assembly = assemblies.find(a => a.id === assemblyId)
		if (!assembly) return
		const m = buildMeasurement({
			label,
			kind: saveDraft.kind,
			value: saveDraft.value,
			assembly,
			points: saveDraft.points,
		})
		const updated = { ...project, measurements: [...project.measurements, m] }
		onProjectUpdate(updated)
		setSaveDraft(null)
		setTool("none")
		startTransition(async () => {
			await addMeasurementAction(project.id, m)
		})
	}

	const cancelSaveDraft = () => {
		setSaveDraft(null)
		// nothing to clean on canvas — the temp marks were already removed when
		// the completion callback fired (tool was reset there)
		setTool("none")
	}

	// ─── Delete measurement ────────────────────────────────────────────────
	const handleDelete = async (id: string) => {
		const updated = { ...project, measurements: project.measurements.filter(m => m.id !== id) }
		onProjectUpdate(updated)
		await deleteMeasurementAction(project.id, id)
	}

	// ─── Totals ────────────────────────────────────────────────────────────
	const totals = useMemo(() => {
		let sub = 0, mat = 0, lab = 0
		for (const m of project.measurements) {
			sub += m.totalCost
			mat += m.materialCost
			lab += m.labourCost
		}
		return { sub, mat, lab }
	}, [project.measurements])

	// ─── Render ────────────────────────────────────────────────────────────
	return (
		<div className="space-y-4">
			{/* Header: upload + scale */}
			<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4">
				<div className="flex items-center gap-3">
					<input
						ref={fileRef}
						type="file"
						accept="application/pdf"
						className="hidden"
						onChange={handleFileChange}
					/>
					<button
						type="button"
						onClick={() => fileRef.current?.click()}
						disabled={uploading}
						className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors disabled:opacity-40"
					>
						{uploading ? "Uploading…" : (project.pdfPath ? "Replace PDF" : "Upload PDF Plan")}
					</button>
					{uploadError && <span className="text-xs text-red-600">{uploadError}</span>}
				</div>
				<div className="flex items-center gap-3">
					<div className="text-xs text-neutral-500">
						{project.scalePxPerFt && project.scalePxPerFt > 0 ? (
							<>
								Scale:{" "}
								<span className="font-semibold text-neutral-800 tabular-nums">
									{project.scalePxPerFt.toFixed(2)} px / ft
								</span>
							</>
						) : (
							<span className="text-amber-700">Scale not set</span>
						)}
					</div>
				</div>
			</div>

			{/* Toolbar */}
			<div className="flex flex-wrap items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5">
				<ToolButton label="Set Scale" active={tool === "scale"} onClick={() => switchTool(tool === "scale" ? "none" : "scale")} />
				<ToolButton label="Linear (LF)" active={tool === "linear"} onClick={() => switchTool(tool === "linear" ? "none" : "linear")} />
				<ToolButton label="Area (SF)" active={tool === "area"} onClick={() => switchTool(tool === "area" ? "none" : "area")} />
				<ToolButton label="Count (EA)" active={tool === "count"} onClick={() => switchTool(tool === "count" ? "none" : "count")} />
				<div className="flex-1" />
				{tool === "count" && inProgressCount > 0 && (
					<button
						type="button"
						onClick={() => canvasRef.current?.commitCount()}
						className="rounded-lg bg-brand-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-800"
					>
						Save Count ({inProgressCount})
					</button>
				)}
				{tool !== "none" && (
					<button
						type="button"
						onClick={() => switchTool("none")}
						className="rounded-lg border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
					>
						Cancel
					</button>
				)}
				{tool !== "none" && (
					<span className="text-xs text-neutral-500 ml-2">
						{toolHint(tool, inProgressCount)}
					</span>
				)}
			</div>

			{/* Canvas */}
			<PlanCanvas
				ref={canvasRef}
				pdfUrl={pdfUrl}
				scalePxPerFt={project.scalePxPerFt}
				measurements={project.measurements}
				tool={tool}
				onLinearComplete={handleLinearComplete}
				onAreaComplete={handleAreaComplete}
				onCountComplete={handleCountComplete}
				onScaleComplete={handleScaleComplete}
				onInProgressChange={s => setInProgressCount(s.count)}
			/>

			{/* Modals */}
			{scaleDraft && (
				<ScalePromptModal
					distancePx={scaleDraft.distancePx}
					onCancel={() => { setScaleDraft(null); setTool("none") }}
					onConfirm={persistScale}
				/>
			)}

			{saveDraft && (
				<SaveMeasurementModal
					draft={saveDraft}
					assemblies={assemblies.filter(a => a.unit === saveDraft.unit || a.unit === "LS")}
					onCancel={cancelSaveDraft}
					onConfirm={persistMeasurement}
				/>
			)}

			{/* Measurements list */}
			<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
				<div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 bg-neutral-50">
					<h3 className="text-sm font-semibold text-neutral-900">
						Measurements <span className="text-xs text-neutral-500 ml-2">({project.measurements.length})</span>
					</h3>
					{project.measurements.length > 0 && (
						<div className="text-xs text-neutral-500">
							Material {formatCAD(totals.mat)} · Labour {formatCAD(totals.lab)} ·{" "}
							<span className="font-semibold text-neutral-900">{formatCAD(totals.sub)}</span>
						</div>
					)}
				</div>
				{project.measurements.length === 0 ? (
					<p className="px-4 py-8 text-center text-sm text-neutral-400">No measurements yet.</p>
				) : (
					<table className="w-full text-sm">
						<thead>
							<tr className="text-xs text-neutral-500 uppercase tracking-wide bg-neutral-50/50">
								<th className="py-2 pl-4 pr-3 text-left font-medium">Label</th>
								<th className="py-2 pr-3 text-left font-medium">Assembly</th>
								<th className="py-2 pr-3 text-right font-medium">Value</th>
								<th className="py-2 pr-3 text-right font-medium">Cost</th>
								<th className="py-2 pr-4 text-right font-medium w-16" />
							</tr>
						</thead>
						<tbody>
							{project.measurements.map(m => (
								<tr key={m.id} className="border-t border-neutral-100">
									<td className="py-2.5 pl-4 pr-3 text-neutral-900 font-medium">{m.label}</td>
									<td className="py-2.5 pr-3 text-neutral-600">
										{m.assemblyName}
										<span className="text-xs text-neutral-400 ml-1.5">· {m.assemblyCategory}</span>
									</td>
									<td className="py-2.5 pr-3 text-right tabular-nums text-neutral-700">
										{m.value.toFixed(2)} <span className="text-xs text-neutral-400">{m.unit}</span>
									</td>
									<td className="py-2.5 pr-3 text-right tabular-nums text-neutral-900 font-semibold">
										{formatCAD(m.totalCost)}
									</td>
									<td className="py-2.5 pr-4 text-right">
										<button
											type="button"
											onClick={() => handleDelete(m.id)}
											className="text-neutral-300 hover:text-red-500 text-lg leading-none px-1"
											aria-label="Delete measurement"
										>×</button>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				)}
			</div>
		</div>
	)
}

// ─── Toolbar button ─────────────────────────────────────────────────────────

function ToolButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
	return (
		<button
			type="button"
			onClick={onClick}
			className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
				active
					? "bg-brand-600 text-white hover:bg-brand-700"
					: "border border-neutral-300 text-neutral-700 hover:bg-neutral-50"
			}`}
		>
			{label}
		</button>
	)
}

function toolHint(tool: ToolMode, count: number): string {
	switch (tool) {
		case "scale": return count === 0 ? "Click the first point of a known distance" : "Click the second point"
		case "linear": return count === 0 ? "Click the start point" : "Click the end point"
		case "area": return count < 3 ? "Click points to outline an area, double-click to close" : "Double-click to close, or keep adding points"
		case "count": return "Click each item · Press 'Save Count' when done"
		default: return ""
	}
}

// ─── Scale prompt modal ────────────────────────────────────────────────────

function ScalePromptModal({
	distancePx,
	onCancel,
	onConfirm,
}: {
	distancePx: number
	onCancel: () => void
	onConfirm: (realFt: number) => void
}) {
	const [feet, setFeet] = useState("")
	const [error, setError] = useState<string | null>(null)

	const submit = () => {
		const val = parseFloat(feet)
		if (isNaN(val) || val <= 0) {
			setError("Enter a positive number of feet")
			return
		}
		onConfirm(val)
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
			<div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
				<h2 className="text-lg font-semibold text-neutral-900 mb-1">Set Scale</h2>
				<p className="text-xs text-neutral-500 mb-4">
					You picked a {distancePx.toFixed(0)} px segment. What real-world distance does that represent?
				</p>
				<label className="block">
					<span className="text-xs font-medium text-neutral-600">Distance in feet</span>
					<input
						autoFocus
						type="number"
						min={0}
						step={0.01}
						value={feet}
						onChange={e => setFeet(e.target.value)}
						onKeyDown={e => { if (e.key === "Enter") submit() }}
						className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
						placeholder="e.g. 10"
					/>
				</label>
				{error && <p className="text-xs text-red-600 mt-2">{error}</p>}
				<div className="mt-5 flex justify-end gap-2">
					<button type="button" onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Cancel</button>
					<button type="button" onClick={submit} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Set Scale</button>
				</div>
			</div>
		</div>
	)
}

// ─── Save measurement modal ────────────────────────────────────────────────

function SaveMeasurementModal({
	draft,
	assemblies,
	onCancel,
	onConfirm,
}: {
	draft: SaveDraft
	assemblies: Assembly[]
	onCancel: () => void
	onConfirm: (label: string, assemblyId: string) => void
}) {
	const [label, setLabel] = useState("")
	const [assemblyId, setAssemblyId] = useState(assemblies[0]?.id ?? "")
	const [error, setError] = useState<string | null>(null)

	const submit = () => {
		const lbl = label.trim()
		if (!lbl) { setError("Enter a label"); return }
		if (!assemblyId) { setError("Pick an assembly"); return }
		onConfirm(lbl, assemblyId)
	}

	const unitLabel = draft.unit === "EA" ? "items" : draft.unit
	const valueStr = draft.kind === "count" ? `${draft.value}` : draft.value.toFixed(2)

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
			<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
				<h2 className="text-lg font-semibold text-neutral-900 mb-1">Save Measurement</h2>
				<p className="text-xs text-neutral-500 mb-4">
					{draft.kind === "linear" ? "Linear" : draft.kind === "area" ? "Area" : "Count"}: {" "}
					<span className="font-semibold text-neutral-900 tabular-nums">{valueStr} {unitLabel}</span>
				</p>

				{assemblies.length === 0 ? (
					<p className="text-sm text-red-600">
						No assemblies match unit {draft.unit}. Add one in the Assemblies tab first.
					</p>
				) : (
					<div className="space-y-3">
						<label className="block">
							<span className="text-xs font-medium text-neutral-600">Label</span>
							<input
								autoFocus
								value={label}
								onChange={e => setLabel(e.target.value)}
								placeholder="e.g. North exterior wall"
								className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
							/>
						</label>
						<label className="block">
							<span className="text-xs font-medium text-neutral-600">Assembly</span>
							<select
								value={assemblyId}
								onChange={e => setAssemblyId(e.target.value)}
								className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
							>
								{assemblies.map(a => (
									<option key={a.id} value={a.id}>
										{a.category} · {a.name} ({a.unit})
									</option>
								))}
							</select>
						</label>
					</div>
				)}

				{error && <p className="text-xs text-red-600 mt-2">{error}</p>}

				<div className="mt-5 flex justify-end gap-2">
					<button type="button" onClick={onCancel} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50">Cancel</button>
					<button
						type="button"
						onClick={submit}
						disabled={assemblies.length === 0}
						className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
					>
						Confirm
					</button>
				</div>
			</div>
		</div>
	)
}
