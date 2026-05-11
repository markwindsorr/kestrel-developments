"use client"

import { useEffect } from "react"
import { cn } from "@/lib/utils"

interface ModalProps {
	open: boolean
	onClose: () => void
	title?: string
	className?: string
	children: React.ReactNode
}

export const Modal = ({ open, onClose, title, className, children }: ModalProps) => {
	useEffect(() => {
		if (!open) return
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose()
		}
		document.addEventListener("keydown", handleKeyDown)
		document.body.style.overflow = "hidden"
		return () => {
			document.removeEventListener("keydown", handleKeyDown)
			document.body.style.overflow = ""
		}
	}, [open, onClose])

	if (!open) return null

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
			<div
				className="fixed inset-0 bg-black/50"
				onClick={onClose}
			/>
			<div
				className={cn(
					"relative z-10 w-full max-w-lg rounded-xl border border-neutral-200 bg-white shadow-xl",
					className
				)}
			>
				<div className="p-6">
					{title && (
						<div className="mb-4 flex items-center justify-between">
							<h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
							<button
								type="button"
								onClick={onClose}
								className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
							>
								<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
									<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
								</svg>
							</button>
						</div>
					)}
					{children}
				</div>
			</div>
		</div>
	)
}
