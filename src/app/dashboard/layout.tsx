import { cookies } from "next/headers"
import { getCurrentProfile } from "@/lib/db/profiles"
import { DashboardShell } from "@/components/layout/dashboard-shell"

const DashboardLayout = async ({
	children,
}: {
	children: React.ReactNode
}) => {
	const cookieStore = await cookies()
	const company = cookieStore.get("kestrel-company")?.value ?? "developments"
	const profile = await getCurrentProfile()

	return (
		<DashboardShell userName={profile.name} userRole={profile.role} company={company}>
			{children}
		</DashboardShell>
	)
}

export default DashboardLayout
