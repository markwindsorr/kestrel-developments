"use client"

import { useState, useEffect, useRef } from "react"

function getMondayKey() {
	const now = new Date()
	const day = now.getDay()
	const monday = new Date(now)
	monday.setDate(now.getDate() - ((day + 6) % 7))
	return monday.toISOString().split("T")[0]
}

const STORAGE_KEY = `weekly-focus-${getMondayKey()}`

export function WeeklyFocus() {
	const [items, setItems] = useState(["", "", ""])
	const [editingIdx, setEditingIdx] = useState<number | null>(null)
	const [draft, setDraft] = useState("")
	const inputRef = useRef<HTMLInputElement>(null)

	useEffect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY)
			if (saved) setItems(JSON.parse(saved))
		} catch {}
	}, [])

	const save = (idx: number, value: string) => {
		const next = [...items]
		next[idx] = value.trim()
		setItems(next)
		setEditingIdx(null)
		try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
	}

	const startEdit = (idx: number) => {
		setDraft(items[idx])
		setEditingIdx(idx)
		setTimeout(() => inputRef.current?.focus(), 0)
	}

	const LABELS = ["#1 Priority", "#2 Priority", "#3 Priority"]
	const COLORS = [
		"border-l-brand-600 bg-brand-50/60",
		"border-l-blue-500 bg-blue-50/60",
		"border-l-violet-500 bg-violet-50/60",
	]
	const NUM_COLORS = ["text-brand-600", "text-blue-500", "text-violet-500"]

	return (
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
			{items.map((item, idx) => (
				<div
					key={idx}
					onClick={() => editingIdx !== idx && startEdit(idx)}
					className={`relative rounded-xl border border-neutral-200 border-l-4 p-4 cursor-pointer transition-shadow hover:shadow-sm ${COLORS[idx]}`}
				>
					<p className={`text-xs font-bold uppercase tracking-widest mb-1.5 ${NUM_COLORS[idx]}`}>
						{LABELS[idx]}
					</p>
					{editingIdx === idx ? (
						<input
							ref={inputRef}
							value={draft}
							onChange={e => setDraft(e.target.value)}
							onBlur={() => save(idx, draft)}
							onKeyDown={e => {
								if (e.key === "Enter") save(idx, draft)
								if (e.key === "Escape") setEditingIdx(null)
							}}
							placeholder="What must get done this week?"
							className="w-full bg-transparent text-sm font-medium text-neutral-900 placeholder:text-neutral-400 focus:outline-none"
							onClick={e => e.stopPropagation()}
						/>
					) : (
						<p className={`text-sm font-medium leading-snug ${item ? "text-neutral-900" : "text-neutral-400 italic"}`}>
							{item || "Click to set priority…"}
						</p>
					)}
				</div>
			))}
		</div>
	)
}
