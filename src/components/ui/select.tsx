import { cn } from "@/lib/utils"

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
	label?: string
}

export function Select({ label, className, children, id, ...props }: SelectProps) {
	return (
		<div>
			{label && (
				<label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-700">
					{label}
				</label>
			)}
			<select
				id={id}
				className={cn(
					"block w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900",
					"focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500",
					"disabled:cursor-not-allowed disabled:bg-neutral-50 disabled:text-neutral-400",
					className
				)}
				{...props}
			>
				{children}
			</select>
		</div>
	)
}
