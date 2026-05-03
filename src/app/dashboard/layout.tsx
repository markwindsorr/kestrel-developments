import { getCurrentProfile } from "@/lib/db/profiles"
import { getOrgContext } from "@/lib/db/org"
import { DashboardShell } from "@/components/layout/dashboard-shell"
import { NoOrgShell } from "@/components/layout/no-org-shell"

const DashboardLayout = async ({
	children,
}: {
	children: React.ReactNode
}) => {
	const profile = await getCurrentProfile()
	const orgContext = await getOrgContext()

	if (!orgContext) {
		return <NoOrgShell userName={profile.name}>{children}</NoOrgShell>
	}

	return (
		<DashboardShell userName={profile.name} userRole={orgContext.role}>
			{children}
		</DashboardShell>
	)
}

export default DashboardLayout
