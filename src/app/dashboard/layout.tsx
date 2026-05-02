import { getCurrentProfile } from "@/lib/db/profiles"
import { DashboardShell } from "@/components/layout/dashboard-shell"

const DashboardLayout = async ({
	children,
}: {
	children: React.ReactNode
}) => {
	const profile = await getCurrentProfile()

	return (
		<DashboardShell userName={profile.name} userRole={profile.role}>
			{children}
		</DashboardShell>
	)
}

export default DashboardLayout