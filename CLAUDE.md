# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # Start dev server (Next.js 16)
npm run build    # Production build
npm run lint     # ESLint (flat config, no args needed)
```

No test framework is configured.

## Architecture

Construction management dashboard (PWA) for a home builder. Next.js 16 App Router + Supabase + Tailwind CSS v4.

### Auth & Middleware

Supabase Auth with email/password. Three Supabase client factories:
- `src/lib/supabase/server.ts` — Server Components and Server Actions (uses `cookies()`)
- `src/lib/supabase/client.ts` — Client Components (browser client)
- `src/lib/supabase/middleware.ts` — Next.js middleware for session refresh

`src/middleware.ts` protects `/dashboard/*` routes (redirects to `/login`) and redirects authenticated users away from `/login`. Auth callback at `/auth/callback/route.ts`.

### Roles & RLS

Three roles: `admin`, `foreman`, `worker` (stored in `profiles.role`). Row Level Security is enforced at the database level — the app relies on Supabase RLS policies rather than application-level permission checks. See `scripts/schema.sql` for the full policy set.

### Data Layer

- **Schema**: `scripts/schema.sql` — four tables: `profiles`, `jobs`, `job_checklist_items`, `time_entries`
- **DB layer**: `src/lib/db/` — one file per table (`profiles.ts`, `jobs.ts`, `checklist-items.ts`, `time-entries.ts`). Each file contains both read and write functions that create a server Supabase client and return typed data.
- **Server Actions**: Route-level `actions.ts` files (e.g., `src/app/dashboard/jobs/actions.ts`) handle auth, form parsing, revalidation, and redirects. They delegate all Supabase calls to `src/lib/db/`. Actions use the `useActionState` pattern — they receive `(_prevState, formData)` and return `{ error: string }`.
- **Types**: `src/lib/types.ts` defines both frontend interfaces (`Job`, `TimeEntry`) and database row types (`DbJob`, `DbTimeEntry`) with snake_case fields. DB functions manually map between the two.

### Styling

Tailwind CSS v4 with `@theme inline` custom properties in `src/app/globals.css`. Brand palette is maroon/dark-red (`--color-brand-*`), warm stone neutrals (`--color-neutral-*`), and semantic colors (`--color-success/warning/danger/info`). No component library — hand-built UI components in `src/components/ui/`.

### Environment Variables

Required in `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

### Path Alias

`@/*` maps to `./src/*` (configured in tsconfig.json).

### PWA

Service worker registered via `src/components/pwa/sw-registrar.tsx` in the root layout. Static SW at `public/sw.js`. Web manifest generated from `src/app/manifest.ts`.
