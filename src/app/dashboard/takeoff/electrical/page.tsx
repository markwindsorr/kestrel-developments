import { redirect } from "next/navigation"
import { ElectricalDashboard } from "@/components/electrical-dashboard"
import { getOrgContext } from "@/lib/db/org"

export default async function ElectricalTakeoffPage() {
	const orgContext = await getOrgContext()
	if (!orgContext || orgContext.role === "worker") redirect("/dashboard")

	return <ElectricalDashboard />
}
