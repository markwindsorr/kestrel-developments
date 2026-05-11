import { HouseTakeoff } from "@/components/house-takeoff"
import { getCostRates } from "@/lib/db/cost-rates"
import { getEstimates, getEstimateById } from "@/lib/db/estimates"
import { getJobs } from "@/lib/db/jobs"

export default async function HouseTakeoffPage({
	searchParams,
}: {
	searchParams: Promise<{ estimate?: string }>
}) {
	const { estimate } = await searchParams

	const [rates, dbEstimates, jobs, initialEstimate] = await Promise.all([
		getCostRates(),
		getEstimates(),
		getJobs(),
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
