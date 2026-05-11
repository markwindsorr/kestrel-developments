import { getCostRates } from "@/lib/db/cost-rates"
import { RatesEditor } from "./rates-editor"

export default async function RatesPage() {
	const rates = await getCostRates()

	return (
		<div className="mx-auto max-w-3xl px-4 py-6">
			<div className="mb-6">
				<h1 className="text-2xl font-bold text-neutral-900">Cost Rate Sheet</h1>
				<p className="mt-1 text-sm text-neutral-500">
					All labour and material rates used in the House Takeoff calculator. Changes apply immediately to new estimates.
				</p>
			</div>
			<RatesEditor initial={rates} />
		</div>
	)
}
