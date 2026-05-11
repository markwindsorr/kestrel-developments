"use client"

import { useRouter } from "next/navigation"

export function CompanySwitcher({ company }: { company: string }) {
	const router = useRouter()

	const switchTo = (co: string) => {
		document.cookie = `kestrel-company=${co}; path=/; max-age=${60 * 60 * 24 * 365}`
		router.refresh()
	}

	return (
		<div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5 gap-0.5">
			<button
				onClick={() => switchTo("developments")}
				className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
					company === "developments"
						? "bg-brand-700 text-white shadow-sm"
						: "text-neutral-500 hover:text-neutral-700"
				}`}
			>
				Developments
			</button>
			<button
				onClick={() => switchTo("electrical")}
				className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
					company === "electrical"
						? "bg-yellow-500 text-white shadow-sm"
						: "text-neutral-500 hover:text-neutral-700"
				}`}
			>
				Electrical
			</button>
		</div>
	)
}
