import { cn } from "@/lib/utils"

interface CardProps {
	title?: string
	description?: string
	className?: string
	children: React.ReactNode
}

export function Card({ title, description, className, children }: CardProps) {
	return (
		<div className={cn("rounded-xl border border-neutral-200 bg-white shadow-sm", className)}>
			{title && (
				<div className="border-b border-neutral-200 px-6 py-4">
					<h3 className="text-lg font-semibold text-neutral-900">{title}</h3>
					{description && <p className="mt-1 text-sm text-neutral-500">{description}</p>}
				</div>
			)}
			<div className="p-6">{children}</div>
		</div>
	)
}
