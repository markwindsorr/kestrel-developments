// CAD formatter with 2 decimal places — required everywhere money is shown.
const cad = new Intl.NumberFormat("en-CA", {
	style: "currency",
	currency: "CAD",
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
})

export const formatCAD = (n: number) => cad.format(n)

export const formatNumber = (n: number, decimals = 2) =>
	n.toLocaleString("en-CA", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })

export const formatPct = (n: number, decimals = 1) =>
	`${n.toLocaleString("en-CA", { minimumFractionDigits: 0, maximumFractionDigits: decimals })}%`
