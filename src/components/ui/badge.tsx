import { cn } from "@/lib/utils"

const variantStyles = {
	default: "bg-neutral-100 text-neutral-700",
	success: "bg-green-50 text-green-700",
	warning: "bg-yellow-50 text-yellow-700",
	danger: "bg-red-50 text-red-700",
	info: "bg-blue-50 text-blue-700"
}

interface BadgeProps {
	variant?: keyof typeof variantStyles
	className?: string
	children: React.ReactNode
}

export function Badge({ variant = "default", className, children }: BadgeProps) {
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
				variantStyles[variant],
				className
			)}
		>
			{children}
		</span>
	)
}
