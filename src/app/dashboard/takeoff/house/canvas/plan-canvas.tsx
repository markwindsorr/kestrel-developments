"use client"

import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react"
import type { Measurement, MeasurementPoint } from "@/lib/db/projects"
import {
	distancePx,
	polygonAreaPx,
	pxAreaToSqft,
	pxToFeet,
} from "../lib/measurement"

// ─── Types ──────────────────────────────────────────────────────────────────

export type ToolMode = "none" | "scale" | "linear" | "area" | "count"

export interface PlanCanvasHandle {
	commitCount: () => void
	cancelInProgress: () => void
}

export interface MeasurementDraft {
	kind: "linear" | "area" | "count"
	valueRawPx: number       // px length for linear/scale, px² for area, count for count
	points: MeasurementPoint[]
}

export interface ScaleDraft {
	distancePx: number
	points: MeasurementPoint[]
}

interface Props {
	pdfUrl: string | null
	scalePxPerFt: number | null
	measurements: Measurement[]
	tool: ToolMode
	onLinearComplete: (draft: MeasurementDraft) => void
	onAreaComplete: (draft: MeasurementDraft) => void
	onCountComplete: (draft: MeasurementDraft) => void
	onScaleComplete: (draft: ScaleDraft) => void
	onInProgressChange?: (state: { count: number; tool: ToolMode }) => void
}

// ─── Style constants ────────────────────────────────────────────────────────

const COLORS = {
	scale: "#dc2626",
	linear: "#8b2c2c",
	area: "#8b2c2c",
	count: "#16a34a",
	preview: "#a8a29e",
} as const

const PDF_RENDER_SCALE = 1.5

// ─── Component ──────────────────────────────────────────────────────────────

export const PlanCanvas = forwardRef<PlanCanvasHandle, Props>(function PlanCanvas(
	{
		pdfUrl,
		scalePxPerFt,
		measurements,
		tool,
		onLinearComplete,
		onAreaComplete,
		onCountComplete,
		onScaleComplete,
		onInProgressChange,
	},
	ref,
) {
	const pdfCanvasRef = useRef<HTMLCanvasElement>(null)
	// Fabric is initialized on a canvas element we create imperatively inside
	// this container div — keeping the canvas outside React's reconciler avoids
	// the StrictMode / HMR teardown that was leaving Fabric un-wrapped.
	const fabricContainerRef = useRef<HTMLDivElement>(null)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const fabricRef = useRef<any>(null) // fabric.Canvas instance
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const fabricModRef = useRef<any>(null) // imported fabric module
	const savedObjectsRef = useRef<Map<string, unknown[]>>(new Map())
	const inProgressObjectsRef = useRef<unknown[]>([])
	const inProgressPointsRef = useRef<MeasurementPoint[]>([])
	// Track latest props inside Fabric handlers without re-binding on every render.
	const toolRef = useRef<ToolMode>(tool)
	const scaleRef = useRef<number | null>(scalePxPerFt)
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const handlersRef = useRef<{ down?: any; dblclick?: any }>({})

	const [dims, setDims] = useState<{ w: number; h: number } | null>(null)
	const [fabricReady, setFabricReady] = useState(false)
	const [loadingPdf, setLoadingPdf] = useState(false)
	const [pdfError, setPdfError] = useState<string | null>(null)

	// Keep refs in sync.
	useEffect(() => { toolRef.current = tool }, [tool])
	useEffect(() => { scaleRef.current = scalePxPerFt }, [scalePxPerFt])

	// ─── Init Fabric once the PDF dims + container are ready ────────────────
	// Gated on `dims` so Fabric is constructed at the correct size from the
	// start — no separate setDimensions sync, no race with the PDF render
	// effect. The canvas element is created imperatively (not via JSX) so React
	// never touches it during StrictMode double-effects or HMR.
	useEffect(() => {
		const container = fabricContainerRef.current
		if (!dims || !container) return

		let cancelled = false
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let createdCanvas: any = null

		// Clean any leftover children from a prior init (HMR safety net).
		while (container.firstChild) container.removeChild(container.firstChild)
		const canvasEl = document.createElement("canvas")
		container.appendChild(canvasEl)

		;(async () => {
			try {
				const fabric = await import("fabric")
				if (cancelled) return
				fabricModRef.current = fabric
				const canvas = new fabric.Canvas(canvasEl, {
					width: dims.w,
					height: dims.h,
					selection: false,
					preserveObjectStacking: true,
					renderOnAddRemove: true,
				})
				canvas.defaultCursor = "crosshair"
				canvas.hoverCursor = "crosshair"
				createdCanvas = canvas
				fabricRef.current = canvas
				if (!cancelled) setFabricReady(true)
			} catch (e) {
				console.error("Fabric init failed:", e)
			}
		})()

		return () => {
			cancelled = true
			if (createdCanvas) {
				try { createdCanvas.dispose() } catch { /* ignore */ }
			}
			if (fabricRef.current === createdCanvas) fabricRef.current = null
			// Force-clear the container — dispose() doesn't always remove the
			// wrapper cleanly, and any leftover DOM blocks the next init.
			while (container.firstChild) container.removeChild(container.firstChild)
			setFabricReady(false)
		}
	}, [dims])

	// ─── Load + render PDF when URL changes ──────────────────────────────────
	useEffect(() => {
		if (!pdfUrl) return
		let cancelled = false
		setLoadingPdf(true)
		setPdfError(null)
		;(async () => {
			try {
				const pdfjs = await import("pdfjs-dist")
				pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"
				const pdf = await pdfjs.getDocument(pdfUrl).promise
				if (cancelled) return
				const page = await pdf.getPage(1)
				const viewport = page.getViewport({ scale: PDF_RENDER_SCALE })
				const canvas = pdfCanvasRef.current
				if (!canvas) return
				canvas.width = viewport.width
				canvas.height = viewport.height
				const ctx = canvas.getContext("2d")
				if (!ctx) return
				await page.render({ canvasContext: ctx, viewport, canvas }).promise
				if (cancelled) return
				setDims({ w: viewport.width, h: viewport.height })
			} catch (e) {
				console.error("PDF render failed:", e)
				if (!cancelled) setPdfError(e instanceof Error ? e.message : "Failed to render PDF")
			} finally {
				if (!cancelled) setLoadingPdf(false)
			}
		})()
		return () => { cancelled = true }
	}, [pdfUrl])

	// ─── Redraw saved measurements when they change ──────────────────────────
	useEffect(() => {
		const fc = fabricRef.current
		const fabric = fabricModRef.current
		if (!fabricReady || !fc || !fabric || !dims) return

		// Clear previously-saved objects
		for (const objs of savedObjectsRef.current.values()) {
			for (const o of objs) fc.remove(o)
		}
		savedObjectsRef.current.clear()

		for (const m of measurements) {
			const objs = drawSavedMeasurement(fabric, m, scaleRef.current)
			for (const o of objs) fc.add(o)
			savedObjectsRef.current.set(m.id, objs)
		}
		fc.requestRenderAll()
	}, [measurements, dims, fabricReady])

	// ─── Attach tool event handlers ──────────────────────────────────────────
	useEffect(() => {
		const fc = fabricRef.current
		const fabric = fabricModRef.current
		if (!fabricReady || !fc || !fabric) return

		// Detach any previous handlers and clear in-progress state on tool change.
		detachHandlers(fc, handlersRef.current)
		clearInProgress(fc)
		inProgressPointsRef.current = []
		onInProgressChange?.({ count: 0, tool })

		if (tool === "none") return

		const onDown = (evt: { e: Event; scenePoint?: { x: number; y: number } }) => {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const sp = evt.scenePoint ?? (fc as any).getScenePoint?.(evt.e) ?? (fc as any).getPointer?.(evt.e)
			if (!sp) return
			const pt: MeasurementPoint = { x: sp.x, y: sp.y }
			const points = inProgressPointsRef.current

			if (toolRef.current === "scale") {
				points.push(pt)
				addMarker(fabric, fc, pt, COLORS.scale)
				if (points.length >= 2) {
					const d = distancePx(points[0], points[1])
					addLine(fabric, fc, points[0], points[1], COLORS.scale, { dashed: true })
					onScaleComplete({ distancePx: d, points: [...points] })
					inProgressPointsRef.current = []
				}
				onInProgressChange?.({ count: points.length, tool: toolRef.current })
				return
			}

			if (toolRef.current === "linear") {
				points.push(pt)
				addMarker(fabric, fc, pt, COLORS.linear)
				if (points.length >= 2) {
					addLine(fabric, fc, points[0], points[1], COLORS.linear)
					onLinearComplete({
						kind: "linear",
						valueRawPx: distancePx(points[0], points[1]),
						points: [...points],
					})
					inProgressPointsRef.current = []
				}
				onInProgressChange?.({ count: points.length, tool: toolRef.current })
				return
			}

			if (toolRef.current === "area") {
				points.push(pt)
				addMarker(fabric, fc, pt, COLORS.area)
				if (points.length >= 2) {
					addLine(fabric, fc, points[points.length - 2], pt, COLORS.area)
				}
				onInProgressChange?.({ count: points.length, tool: toolRef.current })
				return
			}

			if (toolRef.current === "count") {
				points.push(pt)
				addMarker(fabric, fc, pt, COLORS.count, 5)
				onInProgressChange?.({ count: points.length, tool: toolRef.current })
				return
			}
		}

		const onDblClick = () => {
			if (toolRef.current !== "area") return
			const points = inProgressPointsRef.current
			if (points.length < 3) return
			// Close the loop visually.
			addLine(fabric, fc, points[points.length - 1], points[0], COLORS.area)
			const pxArea = polygonAreaPx(points)
			onAreaComplete({ kind: "area", valueRawPx: pxArea, points: [...points] })
			inProgressPointsRef.current = []
			onInProgressChange?.({ count: 0, tool: toolRef.current })
		}

		fc.on("mouse:down", onDown)
		fc.on("mouse:dblclick", onDblClick)
		handlersRef.current = { down: onDown, dblclick: onDblClick }

		return () => {
			detachHandlers(fc, handlersRef.current)
			clearInProgress(fc)
			inProgressPointsRef.current = []
		}
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [tool, fabricReady])

	function clearInProgress(fc: unknown) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const canvas = fc as any
		for (const o of inProgressObjectsRef.current) canvas.remove(o)
		inProgressObjectsRef.current = []
		canvas.requestRenderAll()
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function addMarker(fabric: any, fc: any, pt: MeasurementPoint, color: string, radius = 4) {
		const circle = new fabric.Circle({
			left: pt.x - radius,
			top: pt.y - radius,
			radius,
			fill: color,
			selectable: false,
			evented: false,
			excludeFromExport: true,
		})
		fc.add(circle)
		inProgressObjectsRef.current.push(circle)
		fc.requestRenderAll()
	}

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	function addLine(fabric: any, fc: any, a: MeasurementPoint, b: MeasurementPoint, color: string, opts?: { dashed?: boolean }) {
		const line = new fabric.Line([a.x, a.y, b.x, b.y], {
			stroke: color,
			strokeWidth: 2,
			selectable: false,
			evented: false,
			strokeDashArray: opts?.dashed ? [6, 4] : undefined,
		})
		fc.add(line)
		inProgressObjectsRef.current.push(line)
		fc.requestRenderAll()
	}

	// ─── Imperative API ──────────────────────────────────────────────────────
	useImperativeHandle(ref, () => ({
		commitCount: () => {
			if (toolRef.current !== "count") return
			const points = inProgressPointsRef.current
			if (points.length === 0) return
			onCountComplete({ kind: "count", valueRawPx: points.length, points: [...points] })
			inProgressPointsRef.current = []
			onInProgressChange?.({ count: 0, tool: toolRef.current })
		},
		cancelInProgress: () => {
			const fc = fabricRef.current
			if (!fc) return
			clearInProgress(fc)
			inProgressPointsRef.current = []
			onInProgressChange?.({ count: 0, tool: toolRef.current })
		},
	}))

	// ─── Render ─────────────────────────────────────────────────────────────
	if (!pdfUrl) {
		return (
			<div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-12 text-center">
				<p className="text-sm text-neutral-500">Upload a PDF plan to begin measuring.</p>
			</div>
		)
	}

	return (
		<div className="rounded-xl border border-neutral-200 bg-neutral-100 overflow-auto">
			<div className="inline-block relative" style={dims ? { width: dims.w, height: dims.h } : undefined}>
				{/* z-1: PDF pixels underneath. */}
				<canvas
					ref={pdfCanvasRef}
					className="block"
					style={{ position: "absolute", top: 0, left: 0, zIndex: 1 }}
				/>
				{/* z-10: Fabric event/drawing layer. The init effect creates the
				    actual <canvas> imperatively inside this div, then Fabric wraps
				    it in its own .canvas-container. Keeping the wrapper inside a
				    React-stable div (with no children React knows about) avoids
				    every reconciler conflict we hit earlier. */}
				<div
					ref={fabricContainerRef}
					style={{
						position: "absolute",
						top: 0,
						left: 0,
						width: dims?.w ?? 0,
						height: dims?.h ?? 0,
						zIndex: 10,
						pointerEvents: "auto",
					}}
				/>
				{loadingPdf && (
					<div className="absolute inset-0 flex items-center justify-center bg-white/60 text-sm text-neutral-600" style={{ zIndex: 20 }}>
						Loading PDF…
					</div>
				)}
				{pdfError && (
					<div className="absolute inset-0 flex items-center justify-center bg-red-50/80 text-sm text-red-700" style={{ zIndex: 20 }}>
						{pdfError}
					</div>
				)}
			</div>
		</div>
	)
})

// ─── Helpers (module scope) ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function detachHandlers(fc: any, h: { down?: any; dblclick?: any }) {
	if (h.down) fc.off("mouse:down", h.down)
	if (h.dblclick) fc.off("mouse:dblclick", h.dblclick)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawSavedMeasurement(fabric: any, m: Measurement, pxPerFt: number | null): unknown[] {
	const objs: unknown[] = []
	const color =
		m.kind === "count" ? COLORS.count :
		m.kind === "area" ? COLORS.area :
		COLORS.linear
	const pts = m.points ?? []

	if (m.kind === "linear" && pts.length >= 2) {
		const line = new fabric.Line([pts[0].x, pts[0].y, pts[1].x, pts[1].y], {
			stroke: color,
			strokeWidth: 2.5,
			selectable: false,
			evented: false,
		})
		objs.push(line)
		const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 }
		objs.push(labelText(fabric, mid.x, mid.y, `${m.label} (${m.value.toFixed(2)} LF)`, color))
	}

	if (m.kind === "area" && pts.length >= 3) {
		const polygon = new fabric.Polygon(pts.map(p => ({ x: p.x, y: p.y })), {
			fill: hexToRgba(color, 0.18),
			stroke: color,
			strokeWidth: 2,
			selectable: false,
			evented: false,
		})
		objs.push(polygon)
		const centroid = centroidOf(pts)
		objs.push(labelText(fabric, centroid.x, centroid.y, `${m.label} (${m.value.toFixed(2)} SF)`, color))
	}

	if (m.kind === "count" && pts.length > 0) {
		for (const p of pts) {
			objs.push(new fabric.Circle({
				left: p.x - 5,
				top: p.y - 5,
				radius: 5,
				fill: color,
				selectable: false,
				evented: false,
			}))
		}
		objs.push(labelText(fabric, pts[0].x + 10, pts[0].y - 10, `${m.label} (${m.value})`, color))
	}

	// scale measurements aren't drawn (they're not stored as Measurements)
	void pxPerFt
	return objs
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function labelText(fabric: any, x: number, y: number, text: string, color: string) {
	return new fabric.Text(text, {
		left: x,
		top: y,
		fontSize: 13,
		fontFamily: "system-ui, sans-serif",
		fill: "#fff",
		backgroundColor: color,
		padding: 3,
		selectable: false,
		evented: false,
	})
}

function centroidOf(pts: MeasurementPoint[]): MeasurementPoint {
	const n = pts.length
	let x = 0, y = 0
	for (const p of pts) { x += p.x; y += p.y }
	return { x: x / n, y: y / n }
}

function hexToRgba(hex: string, alpha: number): string {
	const r = parseInt(hex.slice(1, 3), 16)
	const g = parseInt(hex.slice(3, 5), 16)
	const b = parseInt(hex.slice(5, 7), 16)
	return `rgba(${r},${g},${b},${alpha})`
}

// Surface conversion helpers for the parent — keeps math contained here.
export function feetFromPx(px: number, pxPerFt: number): number {
	return pxToFeet(px, pxPerFt)
}
export function sqftFromPxArea(pxArea: number, pxPerFt: number): number {
	return pxAreaToSqft(pxArea, pxPerFt)
}
