"use client"

import { updateUserRole } from "@/app/dashboard/team/actions"
import type { UserRole } from "@/lib/types"

interface RoleSelectorProps {
	userId: string
	currentRole: UserRole
}

export function RoleSelector({ userId, currentRole }: RoleSelectorProps) {
	return (
		<form action={updateUserRole}>
			<input type="hidden" name="userId" value={userId} />
			<select
				name="role"
				defaultValue={currentRole}
				onChange={(e) => {
					e.target.form?.requestSubmit()
				}}
				className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
			>
				<option value="admin">Admin</option>
				<option value="foreman">Foreman</option>
				<option value="worker">Worker</option>
			</select>
		</form>
	)
}
