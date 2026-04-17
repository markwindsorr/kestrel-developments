import { cn } from "@/lib/utils"

const variantStyles = {
	primary: "bg-brand-600 text-white hover:bg-brand-700 focus-visible:ring-brand-500",
	secondary: "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 focus-visible:ring-neutral-400",
	danger: "bg-danger text-white hover:bg-red-700 focus-visible:ring-red-500",
	ghost: "bg-transparent text-neutral-600 hover:bg-neutral-100 focus-visible:ring-neutral-400"
}

const sizeStyles = {
	sm: "h-8 px-3 text-sm",
	md: "h-10 px-4 text-sm",
	lg: "h-12 px-6 text-base"
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
	variant?: keyof typeof variantStyles
	size?: keyof typeof sizeStyles
}

export function Button({ variant = "primary", size = "md", className, children, disabled, ...props }: ButtonProps) {
	return (
		<button
			className={cn(
				"inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
				"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
				"disabled:pointer-events-none disabled:opacity-50",
				variantStyles[variant],
				sizeStyles[size],
				className
			)}
			disabled={disabled}
			{...props}
		>
			{children}
		</button>
	)
}
