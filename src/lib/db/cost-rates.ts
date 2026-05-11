import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { DEFAULT_RATES, type CostRates } from "@/lib/house-calc"

export async function getCostRates(): Promise<CostRates> {
	const supabase = await createClient()
	const { data } = await supabase.from("cost_rates").select("key, value")
	if (!data || data.length === 0) return DEFAULT_RATES
	const overrides: Record<string, number> = {}
	for (const row of data) {
		overrides[row.key] = Number(row.value)
	}
	return { ...DEFAULT_RATES, ...overrides } as CostRates
}

export async function upsertCostRate(key: string, value: number): Promise<void> {
	const admin = createAdminClient()
	await admin.from("cost_rates").upsert({ key, value }, { onConflict: "key" })
}

export async function upsertManyCostRates(rates: Record<string, number>): Promise<void> {
	const admin = createAdminClient()
	const rows = Object.entries(rates).map(([key, value]) => ({ key, value }))
	await admin.from("cost_rates").upsert(rows, { onConflict: "key" })
}
