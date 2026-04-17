export function formatDuration(minutes: number): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	if (hours === 0) return `${mins}m`
	return `${hours}h ${String(mins).padStart(2, "0")}m`
}

export function formatTime(isoString: string): string {
	const date = new Date(isoString)
	return date.toLocaleTimeString("en-US", {
		hour: "numeric",
		minute: "2-digit",
		hour12: true
	})
}

export function formatDate(isoString: string): string {
	const date = new Date(isoString)
	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric"
	})
}

export function getElapsedMinutes(clockIn: string): number {
	const start = new Date(clockIn).getTime()
	const now = Date.now()
	return Math.floor((now - start) / 60000)
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
	return classes.filter(Boolean).join(" ")
}
