"use client"

import { useState, useEffect } from "react"

interface ActiveTimerProps {
	clockInTime: string
}

export function ActiveTimer({ clockInTime }: ActiveTimerProps) {
	const [elapsed, setElapsed] = useState(() => {
		return Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000)
	})

	useEffect(() => {
		const interval = setInterval(() => {
			setElapsed(Math.floor((Date.now() - new Date(clockInTime).getTime()) / 1000))
		}, 1000)
		return () => clearInterval(interval)
	}, [clockInTime])

	const hours = Math.floor(elapsed / 3600)
	const minutes = Math.floor((elapsed % 3600) / 60)
	const seconds = elapsed % 60

	const pad = (n: number) => String(n).padStart(2, "0")

	return (
		<div className="font-mono text-3xl font-bold tabular-nums text-neutral-900">
			{pad(hours)}:{pad(minutes)}:{pad(seconds)}
		</div>
	)
}
