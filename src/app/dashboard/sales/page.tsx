import { cookies } from "next/headers"
import { getLeads } from "@/lib/db/leads"
import { LeadsBoard } from "@/components/sales/leads-board"

export default async function SalesPage() {
	const cookieStore = await cookies()
	const company = cookieStore.get("kestrel-company")?.value ?? "developments"
	const leads = await getLeads(company)

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold text-neutral-900">Sales Pipeline</h1>
				<p className="text-sm text-neutral-500 mt-0.5">Track leads from first contact through to signed job</p>
			</div>
			<LeadsBoard leads={leads} />
		</div>
	)
}
