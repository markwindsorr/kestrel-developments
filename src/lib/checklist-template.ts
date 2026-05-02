export interface ChecklistTemplateItem {
	section: string
	label: string
}

export const CHECKLIST_TEMPLATE: ChecklistTemplateItem[] = [
	// Pre Project Planning
	{ section: "Pre Project Planning", label: "Get Survey and Grading Plan" },
	{ section: "Pre Project Planning", label: "Get Electrical location from NL power" },
	{ section: "Pre Project Planning", label: "Send above to drafter" },
	{ section: "Pre Project Planning", label: "Take in account of sun exposure" },
	{ section: "Pre Project Planning", label: "Make sure enough room for driveway requirement if 2 apt" },
	{ section: "Pre Project Planning", label: "Choose windows and doors" },
	{ section: "Pre Project Planning", label: "Look over subdivision covenants from developer and town" },
	{ section: "Pre Project Planning", label: "Review truss drawings. Make sure all load points and girders don't fall on top of windows" },
	{ section: "Pre Project Planning", label: "Review window lintels and beam sizing" },
	{ section: "Pre Project Planning", label: "Review what way joists are going and minimize bulkheads" },
	{ section: "Pre Project Planning", label: "Figure out elec panel locations" },
	{ section: "Pre Project Planning", label: "Apply for permit" },

	// Project Planning (when permit approved)
	{ section: "Project Planning", label: "Order Windows and Doors" },
	{ section: "Project Planning", label: "Order Trusses" },
	{ section: "Project Planning", label: "Line up Sub contractors" },
	{ section: "Project Planning", label: "Ask plumber where to put key openings in footing" },
	{ section: "Project Planning", label: "Order siding, jblocks and plug boxes" },
	{ section: "Project Planning", label: "Order window wells" },
	{ section: "Project Planning", label: "Order Light fixtures. Use proper j blocks for lights" },

	// Site Prep
	{ section: "Site Prep", label: "Call surveyors for excavation pins" },
	{ section: "Site Prep", label: "Line up excavator and dig basement" },
	{ section: "Site Prep", label: "Call for excavation inspection" },
	{ section: "Site Prep", label: "Call surveyors for footing pins" },
	{ section: "Site Prep", label: "Line up footing contractor and pour footings — Make sure footings line up with load bearing walls, communicate any keys or notes in drawings, verify all footings are in correct location. If footing can't be placed due to frostwall, coordinate with contractor to pour footing after insulation is done and backfilled or use LVL" },
	{ section: "Site Prep", label: "Line up foundation form contractor and pour walls — Make sure window sizes, step ups and entrances are communicated. Verify correct sizes once completed" },
	{ section: "Site Prep", label: "Communicate with excavation contractor where service entrance is" },
	{ section: "Site Prep", label: "Get Surveyor to complete a real property report" },
	{ section: "Site Prep", label: "Knock off tie rods and gum" },
	{ section: "Site Prep", label: "Snap chalk lines 8-10\" down, tar entire foundation" },
	{ section: "Site Prep", label: "Install frost wall insulation — Make sure it's pinned up high to stop rock getting behind and cracking insulation off" },
	{ section: "Site Prep", label: "Install window wells" },
	{ section: "Site Prep", label: "Install weeping tile" },
	{ section: "Site Prep", label: "Order stone to cover weeping tile and stone for inside foundation" },
	{ section: "Site Prep", label: "Send real property report to town inspector" },
	{ section: "Site Prep", label: "Call for backfill inspection" },

	// Framing
	{ section: "Framing", label: "Discuss with framers toilet locations to adjust floor joists if needed" },
	{ section: "Framing", label: "Truss uplift — Check for trusses directly above walls (install shiny 90 if so, ensure drywall contractor screws into those). Verify any trusses less than 10-12\" from wall are not nailed and floating. Verify truss blocks are installed and strapping is nailed into those. Verify no strapping is nailed 16\" or less near a wall" },
	{ section: "Framing", label: "Drywall returns installed where required" },
	{ section: "Framing", label: "Use a square and 6 foot level to check if walls with cabinets, long walls and vanities are plumb and square" },
	{ section: "Framing", label: "Install insulation, VB and plywood in panel locations" },
	{ section: "Framing", label: "If mold is visible on wood, spray mold-ex to remove from studs. Wear mask" },

	// Plumbing - Pre Concrete
	{ section: "Plumbing - Pre Concrete", label: "Box out shower drains" },
	{ section: "Plumbing - Pre Concrete", label: "Secure water line to stay inside future wall cavity" },
	{ section: "Plumbing - Pre Concrete", label: "Secure radon pipe to stay straight" },
	{ section: "Plumbing - Pre Concrete", label: "Install drain for HRV" },

	// Plumbing Rough-In
	{ section: "Plumbing Rough-In", label: "Complete plumbing rough-in" },

	// Electrical Rough-In
	{ section: "Electrical Rough-In", label: "Verify electrical rough-in" },

	// HVAC Rough-In
	{ section: "HVAC Rough-In", label: "Size up panel location" },

	// Post Mechanical Walkthrough
	{ section: "Post Mechanical Walkthrough", label: "Take video of house. Ensure ceiling and walls are pictured" },
	{ section: "Post Mechanical Walkthrough", label: "If applicable, verify garage door wiring is installed" },

	// Insulation and Vapour Barrier
	{ section: "Insulation & Vapour Barrier", label: "Size up panel location" },
]
