# Construction OS — Kestral Developments

A custom web app that acts as the operating system for a $20M/year home building company. Owner gets an AI-powered command center. Project managers, subs, and field employees each get a focused, role-appropriate view.

## Accounts

- **Email:** josh@kestreldevelopments.ca
- **GitHub:** Cascade3791!
- **Supabase:** Cascade3791!

one of these is !!!

---

## Tech Stack

- **Frontend:** React + Next.js (PWA for mobile field access)
- **Backend:** Node.js with PostgreSQL (Supabase)
- **Auth:** Role-based access control (RBAC) — Owner, Project Manager, Sub/Trade, Field Employee
- **AI Layer:** Anthropic Claude API (claude-opus-4-7) — natural language queries against company data
- **Mobile:** Progressive Web App — no separate app needed
- **Hosting:** Vercel (frontend) + Supabase (backend)
- **Notifications:** Twilio SMS

## Current Software Being Replaced

- BuilderTrend
- Square Takeoff
- Sage (integrating via API)

---

## Modules

### Module 1 — AI Command Dashboard (Owner Only)

Daily briefing home screen:

- Invoices due today and next 14 days (from Sage API)
- Jobs with scheduling gaps — trades not confirmed for upcoming phases
- Cash position — current draw balance vs upcoming commitments
- Profit snapshot per active job — revenue minus costs from Sage job costing
- "Ask Anything" AI chat — query data in plain English

The AI connects to: Sage data, scheduling data, time clock logs, and the knowledge base.

### Module 2 — Project Pipeline (Job Lifecycle)

Kanban-style board with stages: **Lead → Land Acquired → Estimate → Pre-Construction → Active Build → Finishing → Complete/Sold**

Each job record contains:

- Job name, address, lot number
- Type: Spec build or Pre-sale (client-commissioned)
- Investor draw schedule with running balance
- Final cost checklist confirming every sub is entered before finalizing house price
- Profit calculation: sale price minus all Sage job costs = margin %
- Document attachments: plans, specs, permits, selections

### Module 3 — Scheduling

Designed for 20+ concurrent jobs:

- Visual calendar/Gantt — per job and company-wide view
- Trade assignment — assign a sub to a phase/date on a specific job
- Automated SMS notifications on assignment with confirmation tracking
- Multi-job view — see one sub across all jobs to avoid double-booking
- Phase dependencies — flag that electrical can't start until framing is complete
- 48-hour and 24-hour automated reminders before scheduled dates

Subs get a login (or magic link via SMS) to see scheduled dates, download plans, and message back.

### Module 4 — Time Clock & Job Costing for Labor

Field employees use on their phone:

- **Clock in:** Select job → select task category → add daily note
- **Clock out:** Logs total hours automatically
- **Job allocation:** Hours tied to specific job + task
- **Multi-job days:** Clock in/out multiple times per day across different jobs
- **GPS option:** Record coordinates at clock-in/out (toggle on per employee when needed)
- **Wagepoint export:** Weekly CSV export of hours per employee (Wagepoint 2.0 doesn't support multi-job, so CSV is the cleanest path)

### Module 5 — Financials & Investor Draws

- Draw log per job: date, draw number, amount requested/received, purpose, running balance
- Investor transparency view: printable report showing how money was allocated
- Accounts payable dashboard synced from Sage — filterable by job, vendor, date range
- Final cost checklist: verify all subs and invoices are coded correctly before closing a job
- Profit summary per job: sale price minus all Sage job costs = gross profit and margin %

### Module 6 — Sage Integration

Sage 300cloud (Mac/Web version) — REST API with OAuth 2.0:

- **Sync schedule:** Every 15 minutes for AP data; nightly full sync for job costing
- **Pulls from Sage:** Open invoices, vendor list, job cost entries per phase, chart of accounts
- **Pushes to Sage:** New vendors (subs), new jobs/cost codes (optional)
- **Available endpoints:** AP API, General Ledger API, Project & Job Costing API

> **Developer action:** Confirm Sage 300cloud version is 2024.2+ and verify which REST endpoints are active on the license. Check whether the Sage license is hosted SaaS or self-hosted (affects API URL exposure).

### Module 7 — Document Hub

Per job, per sub, per trade:

- Plans (PDF upload, version controlled)
- Specifications
- Client selections (structured form: flooring, cabinets, fixtures)
- Permits and inspection reports
- Sub agreements / contracts

Subs download relevant documents from their portal.

### Module 8 — Knowledge Base

Searchable reference library, queryable by the AI:

- National Building Code of Canada (indexed PDFs)
- Canadian Electrical Code
- Company SOPs, checklists, standard specs
- Field reference cards (box heights, standard dimensions, inspection prep)
- Full-text search + AI-powered natural language lookup

### Module 9 — Messaging

- **In-app messaging:** Threaded by job, logged and searchable
- **SMS via Twilio:** Subs receive and reply via text (replaces iMessage — no iMessage API exists)
- **WhatsApp bridge (future):** Optional via Twilio WhatsApp API
- **Material order templates:** Pre-built message templates for supplier orders
- **Broadcast messages:** One message to all subs on a specific job

### Module 10 — Mobile Field App (PWA)

Same URL, stripped-down mobile view:

- **Field employee sees:** Clock in/out, checklist items, daily notes, plans, knowledge base
- **Sub sees:** Their schedule across all jobs, plans and specs, messaging thread, contact info

No app store required — bookmark the URL.

### Module 11 — Digital Takeoff Tool

Built into the app, tied to each project. Replaces Square Takeoff.

**User Flow:**

1. **Upload Plans** — Drag and drop PDF/JPG/PNG drawings. Multi-page PDF sets supported. Rendered using PDF.js.
2. **Set Scale** — Auto-detect from drawing metadata, or manually calibrate by clicking a known measurement. Preset scales: 1/4"=1'-0", 1/8"=1'-0", 3/16"=1'-0", 1:50, 1:100, 1:200.
3. **Measure** — Five tool types:
   - **Area** — square footage for rooms/spaces
   - **Linear** — wall lengths, eaves, perimeter
   - **Count** — windows, doors, fixtures
   - **Volume** — cubic quantities (concrete)
   - **Polygon** — irregular shapes (hip roofs, angled rooms)
4. **Organize by Trade** — Color-coded measurement groups with running totals per group
5. **Export** — CSV/Excel by group, annotated PDF with overlays, quantities flow into project estimates and quote requests

**Trade-specific usage:**

| Trade | Method |
|-------|--------|
| Flooring | Polygon traces room outlines, deduct closets/islands |
| Siding | Linear for wall lengths, area for wall faces, deduct openings |
| Roofing | Polygon for roof planes + pitch multiplier (e.g. 1.118× for 6/12) |
| Concrete | Area on foundation plan + depth input = cubic yards |

**Technical recommendation:** PDF.js Express or Nutrient Web SDK for measurement annotation layer.

Takeoff data is versioned per project (Revision 1, Revision 2 when plans change).

### Module 12 — Quote Request Blast

One action sends personalized, individual messages to every relevant sub when starting a new job.

**Flow:**

1. Open project → "Send Quote Requests"
2. Select trades needed (Framing, Electrical, Plumbing, HVAC, etc.)
3. Select which plan sheets to attach per trade
4. Message template pre-populates with job address, trade, and takeoff quantities
5. Set quote due date → Send

**What happens:**

- Each sub receives a separate SMS with a secure, time-limited download link for their plans
- Subs with app logins also get an in-app notification
- Response tracking dashboard shows status per sub
- Automated follow-up reminder if no response within threshold
- Accepted quote → sub added to project schedule → scheduling notification fires automatically

**Message template example:**

> Hi [Sub Name],
>
> We're starting a new project and would like your quote.
>
> Job: 123 Oak Street, Lot 14
> Trade: Roofing
> Scope: Approx. 2,921 sq ft (6/12 pitch, architectural shingles)
> Plans: [Secure download link — expires in 7 days]
> Quote due: April 25, 2026
>
> Reply to this message or contact [Your Name] at [phone].

---

## Integration Summary

| Service | Status | Approach |
|---------|--------|----------|
| Sage 300cloud API | Ready | REST/OData endpoints; confirm version 2024.2+ |
| Job Costing (Sage) | Available | Project & Job Costing API module |
| Wagepoint 2.0 | CSV export | Skip live API (multi-job limitation) |
| SMS Notifications | Twilio | ~$0.008/message, replaces iMessage |
| WhatsApp | Optional (Phase 3) | Twilio WhatsApp API |
| Google Sheets | Ready | API for migration + 30-day bridge sync |

---

## Build Phases

| Phase | Modules | Timeline |
|-------|---------|----------|
| **Phase 1 (MVP)** | Dashboard, Pipeline, Scheduling + SMS, Sage AP sync, Time Clock | 8–10 weeks |
| **Phase 2** | Takeoff Tool, Quote Request Blast, Financials, Google Sheets migration | 10–14 weeks |
| **Phase 3** | AI Ask Anything, Knowledge Base (NBC/CEC), Wagepoint CSV export, Sub portal, Material orders, WhatsApp, GPS time clock | Ongoing |

---

## Data Migration

The existing 8-9 Google Sheets become the database seed:

1. Map each tab (job) to a `jobs` table record
2. Map each section (draws, schedule, checklist) to its respective module table
3. Run a one-time import script
4. Google Sheets API sync as a safety net during 30-day transition

---

## Git Workflow

```bash
git add .
git commit -m "description of changes"
git push
```
