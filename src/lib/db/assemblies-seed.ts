import type { AssemblyInput } from "@/lib/db/assemblies"

// Default catalog seeded on first visit to the Assemblies tab when the org's
// catalog is empty. Source of truth for this list lives in the project brief.
export const ASSEMBLIES_SEED: AssemblyInput[] = [
	// ─── Excavation ──────────────────────────────────────────────────────────
	{
		category: "Excavation",
		name: "Grading + Fill",
		unit: "LS",
		items: [
			{ label: "Grading + Fill (material + labour)", rate: 8500, kind: "material" },
		],
	},

	// ─── Foundation ──────────────────────────────────────────────────────────
	{
		category: "Foundation",
		name: "Concrete Footing",
		unit: "LF",
		items: [
			{ label: "Concrete", rate: 12.00, kind: "material" },
			{ label: "Forming Labour", rate: 7.00, kind: "labour" },
		],
	},
	{
		category: "Foundation",
		name: "Concrete Foundation Wall",
		unit: "LF",
		items: [
			{ label: "Concrete", rate: 22.00, kind: "material" },
			{ label: "Forming Labour", rate: 8.00, kind: "labour" },
		],
	},
	{
		category: "Foundation",
		name: "Slab on Grade",
		unit: "SF",
		items: [
			{ label: "Gravel Base", rate: 0.45, kind: "material" },
			{ label: "Vapour Barrier", rate: 0.18, kind: "material" },
			{ label: "Concrete", rate: 4.50, kind: "material" },
			{ label: "Finishing Labour", rate: 1.85, kind: "labour" },
		],
	},

	// ─── Framing ─────────────────────────────────────────────────────────────
	{
		category: "Framing",
		name: "Exterior Wall",
		unit: "LF",
		items: [
			{ label: "2x6 Bottom Plate", rate: 0.85, kind: "material" },
			{ label: "2x6 Double Top Plate", rate: 1.70, kind: "material" },
			{ label: "2x6 Studs @ 16\" oc", rate: 6.375, kind: "material" },
			{ label: "OSB Sheathing", rate: 5.85, kind: "material" },
			{ label: "House Wrap", rate: 1.08, kind: "material" },
			{ label: "Framing Labour", rate: 12.00, kind: "labour" },
		],
	},
	{
		category: "Framing",
		name: "Interior Wall",
		unit: "LF",
		items: [
			{ label: "2x4 Bottom Plate", rate: 0.55, kind: "material" },
			{ label: "2x4 Double Top Plate", rate: 1.10, kind: "material" },
			{ label: "2x4 Studs @ 16\" oc", rate: 4.25, kind: "material" },
			{ label: "Framing Labour", rate: 8.00, kind: "labour" },
		],
	},
	{
		category: "Framing",
		name: "Roof Assembly",
		unit: "SF",
		items: [
			{ label: "OSB Sheathing", rate: 0.55, kind: "material" },
			{ label: "Ice and Water Shield", rate: 1.29, kind: "material" },
			{ label: "Underlayment", rate: 0.18, kind: "material" },
			{ label: "Asphalt Shingles", rate: 1.85, kind: "material" },
			{ label: "Roofing Labour", rate: 3.50, kind: "labour" },
		],
	},
	{
		category: "Framing",
		name: "Floor Assembly",
		unit: "SF",
		items: [
			{ label: "2x10 Joists", rate: 1.85, kind: "material" },
			{ label: "Subfloor OSB", rate: 0.60, kind: "material" },
		],
	},

	// ─── Exterior ────────────────────────────────────────────────────────────
	{
		category: "Exterior",
		name: "Exterior Door",
		unit: "EA",
		items: [
			{ label: "Door Unit", rate: 850.00, kind: "material" },
			{ label: "Trim", rate: 65.00, kind: "labour" },
			{ label: "Hardware", rate: 125.00, kind: "material" },
			{ label: "Install Labour", rate: 250.00, kind: "labour" },
		],
	},
	{
		category: "Exterior",
		name: "Window",
		unit: "EA",
		items: [
			{ label: "Window Unit", rate: 650.00, kind: "material" },
			{ label: "Trim", rate: 65.00, kind: "labour" },
			{ label: "Install Labour", rate: 185.00, kind: "labour" },
		],
	},
	{
		category: "Exterior",
		name: "Vinyl Siding",
		unit: "SF",
		items: [
			{ label: "Material", rate: 1.45, kind: "material" },
			{ label: "Labour", rate: 1.85, kind: "labour" },
		],
	},
	{
		category: "Exterior",
		name: "Soffit and Fascia",
		unit: "LF",
		items: [
			{ label: "Material", rate: 4.50, kind: "material" },
			{ label: "Labour", rate: 3.50, kind: "labour" },
		],
	},

	// ─── Insulation ──────────────────────────────────────────────────────────
	{
		category: "Insulation",
		name: "Batt Insulation Walls",
		unit: "SF",
		items: [
			{ label: "Material", rate: 0.85, kind: "material" },
			{ label: "Labour", rate: 0.45, kind: "labour" },
		],
	},
	{
		category: "Insulation",
		name: "Blow In Insulation Ceiling",
		unit: "SF",
		items: [
			{ label: "Material (material + labour)", rate: 2.45, kind: "material" },
		],
	},

	// ─── Drywall ─────────────────────────────────────────────────────────────
	{
		category: "Drywall",
		name: "Drywall",
		unit: "SF",
		items: [
			{ label: "Board Supply", rate: 0.55, kind: "material" },
			{ label: "Hang Labour", rate: 0.37, kind: "labour" },
			{ label: "Corner Bead", rate: 0.12, kind: "material" },
		],
	},

	// ─── Interior Finishes ───────────────────────────────────────────────────
	{
		category: "Interior Finishes",
		name: "Painting Walls/Ceiling",
		unit: "SF",
		items: [
			{ label: "Paint", rate: 0.45, kind: "material" },
			{ label: "Labour", rate: 0.85, kind: "labour" },
		],
	},
	{
		category: "Interior Finishes",
		name: "Baseboard Trim",
		unit: "LF",
		items: [
			{ label: "Material", rate: 1.20, kind: "material" },
			{ label: "Labour", rate: 1.00, kind: "labour" },
		],
	},
	{
		category: "Interior Finishes",
		name: "Interior Door",
		unit: "EA",
		items: [
			{ label: "Door Unit", rate: 285.00, kind: "material" },
			{ label: "Trim", rate: 125.00, kind: "labour" },
			{ label: "Hardware", rate: 65.00, kind: "material" },
			{ label: "Install Labour", rate: 145.00, kind: "labour" },
		],
	},
	{
		category: "Interior Finishes",
		name: "LVP Flooring",
		unit: "SF",
		items: [
			{ label: "Material", rate: 2.85, kind: "material" },
			{ label: "Underlayment", rate: 0.37, kind: "material" },
			{ label: "Labour", rate: 1.85, kind: "labour" },
		],
	},
	{
		category: "Interior Finishes",
		name: "Tile Flooring",
		unit: "SF",
		items: [
			{ label: "Tile", rate: 3.50, kind: "material" },
			{ label: "Underlayment", rate: 0.65, kind: "material" },
			{ label: "Labour", rate: 4.50, kind: "labour" },
		],
	},
	{
		category: "Interior Finishes",
		name: "Kitchen Cabinets",
		unit: "LF",
		items: [
			{ label: "Supply", rate: 285.00, kind: "material" },
			{ label: "Install", rate: 85.00, kind: "labour" },
		],
	},
	{
		category: "Interior Finishes",
		name: "Countertops",
		unit: "LF",
		items: [
			{ label: "Supply", rate: 65.00, kind: "material" },
			{ label: "Install", rate: 35.00, kind: "labour" },
		],
	},

	// ─── Mechanical ──────────────────────────────────────────────────────────
	{
		category: "Mechanical",
		name: "Plumbing Rough-in",
		unit: "EA",
		items: [
			{ label: "Allowance per Fixture", rate: 850.00, kind: "labour" },
		],
	},
	{
		category: "Mechanical",
		name: "Electrical Rough-in",
		unit: "SF",
		items: [
			{ label: "Allowance", rate: 4.50, kind: "labour" },
		],
	},
	{
		category: "Mechanical",
		name: "HVAC",
		unit: "LS",
		items: [
			{ label: "Allowance", rate: 6000, kind: "labour" },
		],
	},

	// ─── Site Work ───────────────────────────────────────────────────────────
	{
		category: "Site Work",
		name: "Landscaping",
		unit: "SF",
		items: [
			{ label: "Sods", rate: 1.00, kind: "material" },
			{ label: "Labour", rate: 0.85, kind: "labour" },
		],
	},
	{
		category: "Site Work",
		name: "Driveway Gravel",
		unit: "SF",
		items: [
			{ label: "Gravel", rate: 1.20, kind: "material" },
			{ label: "Grading Labour", rate: 0.65, kind: "labour" },
		],
	},
	{
		category: "Site Work",
		name: "Deck",
		unit: "SF",
		items: [
			{ label: "Framing", rate: 8.50, kind: "material" },
			{ label: "Decking", rate: 6.50, kind: "material" },
			{ label: "Labour", rate: 12.00, kind: "labour" },
		],
	},
]

// Preserve the brief's category order when the catalog is rendered, regardless
// of insertion order or alphabetical sort.
export const CATEGORY_ORDER = [
	"Excavation",
	"Foundation",
	"Framing",
	"Exterior",
	"Insulation",
	"Drywall",
	"Interior Finishes",
	"Mechanical",
	"Site Work",
] as const
