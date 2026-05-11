"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import type { Lead, LeadStage } from "@/lib/db/leads"
import { addLeadAction, updateLeadStageAction, deleteLeadAction, convertToJobAction } from "@/app/dashboard/sales/actions"

const STAGES: { key: LeadStage; label: string; color: string }[] = [
	{ key: "lead",     label: "Lead",     color: "bg-neutral-100 text-neutral-600" },
	{ key: "bid",      label: "Bid",      color: "bg-blue-100 text-blue-700" },
	{ key: "proposal", label: "Proposal", color: "bg-purple-100 text-purple-700" },
	{ key: "won",      label: "Won",      color: "bg-green-100 text-green-700" },
	{ key: "lost",     label: "Lost",     color: "bg-red-100 text-red-600" },
]

const PROJECT_TYPES = ["New Build", "Addition", "Renovation", "Commercial", "Other"]

const JOB_COLORS = [
	{ label: "Red",    value: "#8b2c2c" },
	{ label: "Blue",   value: "#1d4ed8" },
	{ label: "Green",  value: "#15803d" },
	{ label: "Orange", value: "#c2410c" },
	{ label: "Purple", value: "#6b21a8" },
	{ label: "Teal",   value: "#0f766e" },
]

function stageBadge(stage: LeadStage) {
	const s = STAGES.find(s => s.key === stage)
	return `inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s?.color ?? ""}`
}

export function LeadsBoard({ leads: initial }: { leads: Lead[] }) {
	const [activeStage, setActiveStage] = useState<LeadStage | "all">("all")
	const [showAdd, setShowAdd] = useState(false)
	const [convertingId, setConvertingId] = useState<string | null>(null)
	const [, startTransition] = useTransition()

	const filtered = activeStage === "all" ? initial : initial.filter(l => l.stage === activeStage)

	const totalValue = initial
		.filter(l => l.stage !== "lost" && l.estimatedValue)
		.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)

	const wonValue = initial
		.filter(l => l.stage === "won" && l.estimatedValue)
		.reduce((s, l) => s + (l.estimatedValue ?? 0), 0)

	const stageCount = (s: LeadStage) => initial.filter(l => l.stage === s).length

	const changeStage = (id: string, stage: LeadStage) => {
		startTransition(async () => { await updateLeadStageAction(id, stage) })
	}

	const remove = (id: string) => {
		if (!confirm("Delete this lead?")) return
		startTransition(async () => { await deleteLeadAction(id) })
	}

	const convertingLead = convertingId ? initial.find(l => l.id === convertingId) : null

	return (
		<div>
			{/* Stats */}
			<div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
				<StatCard label="Total Leads" value={String(initial.filter(l => l.stage !== "lost").length)} color="brand" />
				<StatCard label="In Pipeline" value={totalValue > 0 ? `$${Math.round(totalValue / 1000)}k` : "—"} color="blue" />
				<StatCard label="Won" value={String(stageCount("won"))} color="green" />
				<StatCard label="Won Value" value={wonValue > 0 ? `$${Math.round(wonValue / 1000)}k` : "—"} color="green" />
			</div>

			{/* Main card */}
			<div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
				{/* Toolbar */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 flex-wrap gap-3">
					{/* Stage tabs */}
					<div className="flex gap-1 flex-wrap">
						<button
							onClick={() => setActiveStage("all")}
							className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeStage === "all" ? "bg-brand-600 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}
						>
							All ({initial.length})
						</button>
						{STAGES.map(s => (
							<button
								key={s.key}
								onClick={() => setActiveStage(s.key)}
								className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${activeStage === s.key ? "bg-brand-600 text-white" : "text-neutral-500 hover:bg-neutral-100"}`}
							>
								{s.label} ({stageCount(s.key)})
							</button>
						))}
					</div>
					<button
						onClick={() => setShowAdd(v => !v)}
						className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
					>
						+ Add lead
					</button>
				</div>

				{/* Add form */}
				{showAdd && (
					<form
						action={async (fd) => {
							await addLeadAction(fd)
							setShowAdd(false)
						}}
						className="px-5 py-4 border-b border-neutral-100 bg-neutral-50 space-y-3"
					>
						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							<div className="col-span-2 sm:col-span-1">
								<label className="text-xs text-neutral-500 block mb-1">Client / Company *</label>
								<input name="clientName" required placeholder="Smith Family" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Contact Name</label>
								<input name="contactName" placeholder="John Smith" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Phone</label>
								<input name="phone" type="tel" placeholder="709-555-0100" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Email</label>
								<input name="email" type="email" placeholder="john@example.com" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div className="col-span-2">
								<label className="text-xs text-neutral-500 block mb-1">Address / Location</label>
								<input name="address" placeholder="123 Main St, St. John's" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Project Type</label>
								<select name="projectType" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none bg-white">
									{PROJECT_TYPES.map(t => <option key={t}>{t}</option>)}
								</select>
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Estimated Value ($)</label>
								<input name="estimatedValue" type="number" min="0" placeholder="450000" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
							</div>
							<div>
								<label className="text-xs text-neutral-500 block mb-1">Stage</label>
								<select name="stage" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none bg-white">
									{STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
								</select>
							</div>
							<div className="col-span-2 sm:col-span-3">
								<label className="text-xs text-neutral-500 block mb-1">Notes</label>
								<textarea name="notes" rows={2} placeholder="Referral from ABC, wants to start spring 2025…" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none resize-none" />
							</div>
						</div>
						<div className="flex gap-2">
							<button type="submit" className="rounded-lg bg-brand-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">Save lead</button>
							<button type="button" onClick={() => setShowAdd(false)} className="rounded-lg border border-neutral-200 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50">Cancel</button>
						</div>
					</form>
				)}

				{/* Lead list */}
				{filtered.length === 0 ? (
					<div className="py-16 text-center">
						<p className="text-sm text-neutral-400">No leads in this stage</p>
					</div>
				) : (
					<div className="divide-y divide-neutral-100">
						{filtered.map(lead => (
							<LeadRow
								key={lead.id}
								lead={lead}
								onChangeStage={changeStage}
								onDelete={remove}
								onConvert={() => setConvertingId(lead.id)}
							/>
						))}
					</div>
				)}
			</div>

			{/* Convert to Job modal */}
			{convertingLead && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setConvertingId(null)}>
					<div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
						<h2 className="font-semibold text-neutral-900 mb-1">Convert to Job</h2>
						<p className="text-xs text-neutral-400 mb-4">This will create a new active job and link it to this lead.</p>
						<form action={async (fd) => {
							await convertToJobAction(convertingLead.id, fd)
							setConvertingId(null)
						}}>
							<div className="space-y-3">
								<div>
									<label className="text-xs text-neutral-500 block mb-1">Job Name *</label>
									<input name="name" required defaultValue={`${convertingLead.clientName} – ${convertingLead.projectType}`}
										className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
								</div>
								<div>
									<label className="text-xs text-neutral-500 block mb-1">Client Name *</label>
									<input name="clientName" required defaultValue={convertingLead.contactName ?? convertingLead.clientName}
										className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
								</div>
								<div>
									<label className="text-xs text-neutral-500 block mb-1">Address</label>
									<input name="address" defaultValue={convertingLead.address ?? ""}
										className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none" />
								</div>
								<div>
									<label className="text-xs text-neutral-500 block mb-1">Job Colour</label>
									<select name="color" className="w-full rounded border border-neutral-300 px-2.5 py-1.5 text-sm focus:border-brand-500 focus:outline-none bg-white">
										{JOB_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
									</select>
								</div>
							</div>
							<div className="flex gap-2 mt-4">
								<button type="submit" className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 flex-1">
									Create Job →
								</button>
								<button type="button" onClick={() => setConvertingId(null)} className="rounded-lg border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 hover:bg-neutral-50">
									Cancel
								</button>
							</div>
						</form>
					</div>
				</div>
			)}
		</div>
	)
}

function LeadRow({
	lead,
	onChangeStage,
	onDelete,
	onConvert,
}: {
	lead: Lead
	onChangeStage: (id: string, stage: LeadStage) => void
	onDelete: (id: string) => void
	onConvert: () => void
}) {
	return (
		<div className="flex items-start gap-4 px-5 py-4 hover:bg-neutral-50/50 group">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 flex-wrap">
					<p className="text-sm font-semibold text-neutral-900">{lead.clientName}</p>
					{lead.contactName && <p className="text-xs text-neutral-400">· {lead.contactName}</p>}
					<span className="text-xs text-neutral-300">{lead.projectType}</span>
				</div>
				{lead.address && <p className="text-xs text-neutral-400 mt-0.5">{lead.address}</p>}
				{lead.notes && <p className="text-xs text-neutral-500 mt-1 italic">{lead.notes}</p>}
				<div className="flex items-center gap-3 mt-1.5 flex-wrap">
					{lead.phone && <a href={`tel:${lead.phone}`} className="text-xs text-brand-600 hover:underline">{lead.phone}</a>}
					{lead.email && <a href={`mailto:${lead.email}`} className="text-xs text-brand-600 hover:underline">{lead.email}</a>}
				</div>
			</div>

			<div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
				{lead.estimatedValue && (
					<p className="text-sm font-bold text-neutral-700">${Math.round(lead.estimatedValue).toLocaleString("en-CA")}</p>
				)}

				{/* Stage selector */}
				<select
					value={lead.stage}
					onChange={e => onChangeStage(lead.id, e.target.value as LeadStage)}
					className={`rounded-full px-2.5 py-0.5 text-xs font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-400 ${STAGES.find(s => s.key === lead.stage)?.color ?? ""}`}
				>
					{STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
				</select>

				{/* Convert to job */}
				{!lead.jobId && (lead.stage === "proposal" || lead.stage === "won") && (
					<button
						onClick={onConvert}
						className="rounded-lg bg-green-50 border border-green-200 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-100 transition-colors"
					>
						→ Job
					</button>
				)}
				{lead.jobId && (
					<Link href={`/dashboard/jobs/${lead.jobId}`} className="rounded-lg bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-medium text-brand-700 hover:bg-brand-100 transition-colors">
						View job →
					</Link>
				)}

				<button onClick={() => onDelete(lead.id)} className="text-neutral-200 hover:text-red-400 text-lg leading-none opacity-0 group-hover:opacity-100 transition-opacity">×</button>
			</div>
		</div>
	)
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
	const bg = { brand: "bg-brand-50 text-brand-600", blue: "bg-blue-50 text-blue-600", green: "bg-green-50 text-green-700", red: "bg-red-50 text-red-600" }[color] ?? "bg-neutral-100"
	return (
		<div className="rounded-xl border border-neutral-200 bg-white p-4">
			<p className={`text-xl font-bold tabular-nums ${bg.split(" ")[1]}`}>{value}</p>
			<p className="text-xs text-neutral-500 mt-0.5">{label}</p>
		</div>
	)
}
