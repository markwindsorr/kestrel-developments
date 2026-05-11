// Pure business logic for Kestrel Electrical dashboard

export const COST = 163_163
export const CORP_TAX = 0.122
export const WORKING_DAYS = 238
export const PAID_MH = 4_160    // 2 men × 2,080 hrs
export const HRS_DAY = 8
export const MAX_HOUSES = Math.floor(PAID_MH / (12.5 * HRS_DAY * 2)) // 20

export const fd = (n: number) => '$' + Math.round(n).toLocaleString('en-CA')
export const fp = (n: number) => (Math.round(n * 10) / 10) + '%'
export const afterTax = (n: number) => n * (1 - CORP_TAX)

export function computeOHR(houses: number, svcDays: number): number {
	const hMH = Math.min(houses * 12.5 * HRS_DAY * 2, PAID_MH)
	const sMH = Math.min(svcDays * HRS_DAY, Math.max(0, PAID_MH - hMH))
	return COST / Math.max(1, hMH + sMH)
}

export interface WorkloadData {
	houseDays: number
	houseMH: number
	calAvail: number
	mhAvail: number
	maxSvcDays: number
	ohr: number
	hRev: number
	sRev: number
	tRev: number
	profit: number
	margin: number
	afterTaxProfit: number
	overCap: boolean
	breakeven: number
	hPct: number
	sPct: number
}

export function computeWorkload(houses: number, svcDays: number): WorkloadData {
	const houseDays = houses * 12.5
	const houseMH = houseDays * HRS_DAY * 2
	const calAvail = Math.max(0, WORKING_DAYS - houseDays)
	const mhAvail = Math.max(0, PAID_MH - houseMH)
	const maxSvcDays = Math.min(calAvail, Math.floor(mhAvail / HRS_DAY))
	const hRev = houses * 100 * 120
	const sRev = svcDays * HRS_DAY * 95
	const tRev = hRev + sRev
	const profit = tRev - COST
	const ohr = computeOHR(houses, svcDays)
	return {
		houseDays, houseMH, calAvail, mhAvail, maxSvcDays,
		ohr, hRev, sRev, tRev, profit,
		margin: tRev > 0 ? (profit / tRev) * 100 : 0,
		afterTaxProfit: afterTax(Math.max(0, profit)),
		overCap: houses > MAX_HOUSES,
		breakeven: houses * 100 > 0 ? COST / (houses * 100) : 0,
		hPct: Math.min(100, (houseDays / WORKING_DAYS) * 100),
		sPct: Math.min(100, (Math.min(svcDays, maxSvcDays) / WORKING_DAYS) * 100),
	}
}

export interface CapacityData {
	houseDays: number
	houseMH: number
	svcMHAvail: number
	maxSvcDays: number
	utilPct: number
	overHouses: boolean
	overSvc: boolean
	hPct: number
	sPct: number
	fPct: number
}

export function computeCapacity(
	houses: number,
	svcDays: number,
	manpower: number
): CapacityData {
	const consMen = Math.min(manpower, 2)
	const extraMen = Math.max(0, manpower - 2)
	const houseDays = houses * 12.5
	const houseMH = houseDays * HRS_DAY * consMen
	const crew2RemainingMH = Math.max(0, consMen * 2080 - houseMH)
	const extraMH = extraMen * 2080
	const svcMHAvail = crew2RemainingMH + extraMH
	const calAvail2Man = Math.max(0, WORKING_DAYS - houseDays)
	const calAvailMax = extraMen > 0 ? WORKING_DAYS : calAvail2Man
	const maxSvcDays = Math.min(calAvailMax, Math.floor(svcMHAvail / HRS_DAY))
	const utilPct = Math.min(100, Math.round(((houseMH + svcDays * HRS_DAY) / Math.max(1, manpower * 2080)) * 100))
	const hPct = Math.min(100, (houseDays / WORKING_DAYS) * 100)
	const sPct = Math.min(100 - hPct, (svcDays / WORKING_DAYS) * 100)
	return {
		houseDays, houseMH, svcMHAvail, maxSvcDays, utilPct,
		overHouses: houseDays > WORKING_DAYS,
		overSvc: svcDays > maxSvcDays,
		hPct, sPct, fPct: Math.max(0, 100 - hPct - sPct),
	}
}

export function computeCapScenario(hh: number, ss: number, consMen: number, extraMen: number, svcRate: number) {
	const hdDays = hh * 12.5
	const hdMH = hdDays * HRS_DAY * consMen
	const c2rem = Math.max(0, consMen * 2080 - hdMH)
	const eMH = extraMen * 2080
	const sMHAv = c2rem + eMH
	const calAv2 = Math.max(0, WORKING_DAYS - hdDays)
	const calAvMax = extraMen > 0 ? WORKING_DAYS : calAv2
	const maxSvc = Math.min(calAvMax, Math.floor(sMHAv / HRS_DAY))
	const hRev = hh * 100 * 120
	const sRev = ss * HRS_DAY * svcRate
	const tRev = hRev + sRev
	const pr = tRev - COST
	const mg = tRev > 0 ? Math.round((pr / tRev) * 100) : 0
	return {
		maxSvc,
		tRev: Math.round(tRev),
		pr: Math.round(pr),
		mg,
		at: Math.round(Math.max(0, pr) * (1 - CORP_TAX)),
		overH: hdDays > WORKING_DAYS,
		overS: ss > maxSvc,
	}
}
