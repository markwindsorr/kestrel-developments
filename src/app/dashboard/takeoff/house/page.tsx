import { redirect } from "next/navigation"
import { HouseTakeoff } from "@/components/house-takeoff"
import { getCostRates } from "@/lib/db/cost-rates"
import { getEstimates, getEstimateById } from "@/lib/db/estimates"
import { getJobs } from "@/lib/db/jobs"
import { getOrgContext } from "@/lib/db/org"

export default async function HouseTakeoffPage({
	searchParams,
}: {
	searchParams: Promise<{ estimate?: string }>
}) {
	const orgContext = await getOrgContext()
	if (!orgContext) redirect("/dashboard")

	const { estimate } = await searchParams

	const [rates, dbEstimates, jobs, initialEstimate] = await Promise.all([
		getCostRates(),
		getEstimates(),
		getJobs(orgContext.orgId),
		estimate ? getEstimateById(estimate) : Promise.resolve(null),
	])

	return (
		<HouseTakeoff
			rates={rates}
			dbEstimates={dbEstimates}
			availableJobs={jobs}
			initialEstimate={initialEstimate ?? undefined}
		/>
	)
}
