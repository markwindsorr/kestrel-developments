"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter } from "next/navigation"
import type { Assembly } from "@/lib/db/assemblies"
import type { Project } from "@/lib/db/projects"
import type { DbJob } from "@/lib/types"
import type { UserRole } from "@/lib/types"
import { createProjectAction, deleteProjectAction, seedAssembliesIfEmptyAction } from "./actions"
import { TakeoffTab } from "./tabs/takeoff-tab"
import { AssembliesTab } from "./tabs/assemblies-tab"
import { SummaryTab } from "./tabs/summary-tab"
import { QuoteTab } from "./tabs/quote-tab"

type TabId = "takeoff" | "assemblies" | "summary" | "quote"

const TABS: { id: TabId; label: string }[] = [
	{ id: "takeoff", label: "Takeoff" },
	{ id: "assemblies", label: "Assemblies" },
	{ id: "summary", label: "Estimate Summary" },
	{ id: "quote", label: "Quote" },
]

interface Props {
	initialAssemblies: Assembly[]
	initialProjects: Project[]
	initialProject: Project | null
	jobs: DbJob[]
	role: UserRole
}

export function HouseTakeoffClient({
	initialAssemblies,
	initialProjects,
	initialProject,
	jobs,
	role,
}: Props) {
	const router = useRouter()
	const [tab, setTab] = useState<TabId>("takeoff")
	const [assemblies, setAssemblies] = useState(initialAssemblies)
	const [projects, setProjects] = useState(initialProjects)
	const [activeProject, setActiveProject] = useState<Project | null>(initialProject)
	const [showNewProject, setShowNewProject] = useState(false)

	// Auto-seed assemblies on first visit if the org has none. The action returns
	// the canonical assembly list (seeded or pre-existing) so we update local
	// state directly — router.refresh() can't rehydrate this component's useState.
	useEffect(() => {
		if (assemblies.length > 0) return
		seedAssembliesIfEmptyAction().then(r => {
			if (r.assemblies.length > 0) setAssemblies(r.assemblies)
			else if (r.error) console.error("Assembly seed failed:", r.error)
		})
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [])

	const handleSelectProject = (id: string | null) => {
		if (!id) {
			setActiveProject(null)
			router.push("/dashboard/takeoff/house")
			return
		}
		const p = projects.find(x => x.id === id) ?? null
		setActiveProject(p)
		router.push(`/dashboard/takeoff/house?project=${id}`)
	}

	const handleProjectUpdate = (updated: Project) => {
		setActiveProject(updated)
		setProjects(prev => prev.map(p => p.id === updated.id ? updated : p))
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-wrap items-end justify-between gap-3">
				<div>
					<h1 className="text-2xl font-bold text-neutral-900">House Takeoff</h1>
					<p className="mt-1 text-sm text-neutral-500">
						Upload a plan, measure assemblies, build the estimate, and export a client quote.
					</p>
				</div>
				<div className="flex items-center gap-2">
					<select
						value={activeProject?.id ?? ""}
						onChange={e => handleSelectProject(e.target.value || null)}
						className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none min-w-[14rem]"
					>
						<option value="">— Select a project —</option>
						{projects.map(p => (
							<option key={p.id} value={p.id}>{p.name}</option>
						))}
					</select>
					<button
						type="button"
						onClick={() => setShowNewProject(true)}
						className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
					>
						+ New Project
					</button>
					{activeProject && role === "admin" && (
						<button
							type="button"
							onClick={async () => {
								if (!confirm(`Delete project "${activeProject.name}"? This cannot be undone.`)) return
								await deleteProjectAction(activeProject.id)
								setProjects(prev => prev.filter(p => p.id !== activeProject.id))
								handleSelectProject(null)
							}}
							className="rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
						>
							Delete
						</button>
					)}
				</div>
			</div>

			{showNewProject && (
				<NewProjectModal
					onCancel={() => setShowNewProject(false)}
					onCreated={created => {
						setProjects(prev => [created, ...prev])
						setShowNewProject(false)
						handleSelectProject(created.id)
					}}
				/>
			)}

			{/* Tabs */}
			<div className="border-b border-neutral-200">
				<div className="flex gap-1">
					{TABS.map(t => (
						<button
							key={t.id}
							type="button"
							onClick={() => setTab(t.id)}
							className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
								tab === t.id
									? "border-brand-600 text-brand-700"
									: "border-transparent text-neutral-500 hover:text-neutral-700"
							}`}
						>
							{t.label}
						</button>
					))}
				</div>
			</div>

			{/* Body */}
			{tab === "takeoff" && (
				activeProject ? (
					<TakeoffTab
						project={activeProject}
						assemblies={assemblies}
						onProjectUpdate={handleProjectUpdate}
					/>
				) : <NoProjectPlaceholder onNew={() => setShowNewProject(true)} />
			)}
			{tab === "assemblies" && (
				<AssembliesTab
					assemblies={assemblies}
					onAssembliesChange={setAssemblies}
					role={role}
				/>
			)}
			{tab === "summary" && (
				activeProject ? (
					<SummaryTab project={activeProject} onProjectUpdate={handleProjectUpdate} />
				) : <NoProjectPlaceholder onNew={() => setShowNewProject(true)} />
			)}
			{tab === "quote" && (
				activeProject ? (
					<QuoteTab project={activeProject} jobs={jobs} onProjectUpdate={handleProjectUpdate} />
				) : <NoProjectPlaceholder onNew={() => setShowNewProject(true)} />
			)}
		</div>
	)
}

function NoProjectPlaceholder({ onNew }: { onNew: () => void }) {
	return (
		<div className="rounded-xl border border-dashed border-neutral-300 bg-white p-12 text-center">
			<p className="text-sm text-neutral-500">No project selected.</p>
			<button
				type="button"
				onClick={onNew}
				className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 transition-colors"
			>
				+ New Project
			</button>
		</div>
	)
}

function NewProjectModal({
	onCancel,
	onCreated,
}: {
	onCancel: () => void
	onCreated: (p: Project) => void
}) {
	const [name, setName] = useState("")
	const [address, setAddress] = useState("")
	const [hstRate, setHstRate] = useState(0.15)
	const [pending, startTransition] = useTransition()
	const [error, setError] = useState<string | null>(null)

	const submit = () => {
		if (!name.trim()) {
			setError("Project name is required")
			return
		}
		setError(null)
		startTransition(async () => {
			const res = await createProjectAction({
				name: name.trim(),
				address: address.trim(),
				hstRate,
			})
			if (res.error || !res.id) {
				setError(res.error ?? "Could not create project")
				return
			}
			// Optimistic: build the Project shape locally so we can switch to it.
			onCreated({
				id: res.id,
				orgId: "",
				jobId: null,
				name: name.trim(),
				address: address.trim(),
				pdfPath: null,
				scalePxPerFt: null,
				measurements: [],
				contingencyPct: 0,
				profitPct: 0,
				hstEnabled: true,
				hstRate,
				createdBy: "",
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			})
		})
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
			<div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={e => e.stopPropagation()}>
				<h2 className="text-lg font-semibold text-neutral-900 mb-4">New Takeoff Project</h2>
				<div className="space-y-3">
					<label className="block">
						<span className="text-xs font-medium text-neutral-600">Project name</span>
						<input
							autoFocus
							value={name}
							onChange={e => setName(e.target.value)}
							placeholder="e.g. 42 Maple Lane — Smith Residence"
							className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
						/>
					</label>
					<label className="block">
						<span className="text-xs font-medium text-neutral-600">Address (optional)</span>
						<input
							value={address}
							onChange={e => setAddress(e.target.value)}
							className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
						/>
					</label>
					<label className="block">
						<span className="text-xs font-medium text-neutral-600">HST</span>
						<select
							value={hstRate}
							onChange={e => setHstRate(parseFloat(e.target.value))}
							className="mt-1 w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-brand-500 focus:outline-none"
						>
							<option value={0.15}>15% — Newfoundland & Labrador</option>
							<option value={0.13}>13% — Ontario</option>
							<option value={0}>0% — No HST</option>
						</select>
					</label>
					{error && <p className="text-xs text-red-600">{error}</p>}
				</div>
				<div className="mt-5 flex justify-end gap-2">
					<button
						type="button"
						onClick={onCancel}
						className="rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={submit}
						disabled={pending}
						className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-40"
					>
						{pending ? "Creating…" : "Create"}
					</button>
				</div>
			</div>
		</div>
	)
}
