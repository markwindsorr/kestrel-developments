-- House Takeoff schema migration
-- Replaces the old House Estimator (house_estimates), Cost Rates (cost_rates),
-- Subcontractor Quote Requests (quote_requests, project_documents) with the
-- new PDF-based Takeoff workflow (projects + assemblies + project-plans bucket).
--
-- Run this in the Supabase SQL Editor AFTER scripts/schema.sql.
-- Safe to re-run: uses IF EXISTS / IF NOT EXISTS guards.

-- =============================================================================
-- 1. DROP OBSOLETE TABLES (in FK dependency order)
-- =============================================================================

DROP TABLE IF EXISTS quote_requests   CASCADE;
DROP TABLE IF EXISTS project_documents CASCADE;
DROP TABLE IF EXISTS house_estimates  CASCADE;
DROP TABLE IF EXISTS cost_rates       CASCADE;

-- NOTE: do NOT drop the `project-documents` storage bucket — it is still used
-- by job photos and job documents (see src/app/api/jobs/upload-*). Only the
-- `project_documents` *table* (singular records FK'd to house_estimates) is
-- being removed.

-- =============================================================================
-- 2. ASSEMBLIES (org-scoped catalog of buildable units)
-- =============================================================================

CREATE TABLE IF NOT EXISTS assemblies (
	id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	org_id     UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	category   TEXT NOT NULL,
	name       TEXT NOT NULL,
	unit       TEXT NOT NULL CHECK (unit IN ('LF','SF','EA','LS')),
	-- items shape: [{ id: uuid, label: text, rate: numeric, kind: 'material'|'labour' }]
	items      JSONB NOT NULL DEFAULT '[]'::jsonb,
	sort_order INTEGER NOT NULL DEFAULT 0,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assemblies_org_id   ON assemblies(org_id);
CREATE INDEX IF NOT EXISTS idx_assemblies_category ON assemblies(category);

ALTER TABLE assemblies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read assemblies" ON assemblies
	FOR SELECT USING (org_id = public.user_org_id());
CREATE POLICY "Admin/foreman insert assemblies" ON assemblies
	FOR INSERT WITH CHECK (
		org_id = public.user_org_id()
		AND public.user_org_role() IN ('admin','foreman')
	);
CREATE POLICY "Admin/foreman update assemblies" ON assemblies
	FOR UPDATE USING (
		org_id = public.user_org_id()
		AND public.user_org_role() IN ('admin','foreman')
	);
CREATE POLICY "Admin/foreman delete assemblies" ON assemblies
	FOR DELETE USING (
		org_id = public.user_org_id()
		AND public.user_org_role() IN ('admin','foreman')
	);

-- =============================================================================
-- 3. PROJECTS (one per uploaded plan / takeoff)
-- =============================================================================

CREATE TABLE IF NOT EXISTS projects (
	id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	org_id           UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
	job_id           UUID REFERENCES jobs(id) ON DELETE SET NULL,
	name             TEXT NOT NULL,
	address          TEXT NOT NULL DEFAULT '',
	pdf_path         TEXT,                              -- storage key in project-plans bucket
	scale_px_per_ft  NUMERIC,                           -- null until user calibrates
	-- measurements shape: [{ id, label, kind: 'linear'|'area'|'count', value, unit,
	--                         assemblyId, assemblyName, materialCost, labourCost, totalCost,
	--                         points: [{x,y},...] | null, createdAt }]
	measurements     JSONB NOT NULL DEFAULT '[]'::jsonb,
	contingency_pct  NUMERIC NOT NULL DEFAULT 0,
	profit_pct       NUMERIC NOT NULL DEFAULT 0,
	hst_enabled      BOOLEAN NOT NULL DEFAULT true,
	hst_rate         NUMERIC NOT NULL DEFAULT 0.15,    -- 0.15 NL, 0.13 ON, etc.
	created_by       UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
	created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
	updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_org_id     ON projects(org_id);
CREATE INDEX IF NOT EXISTS idx_projects_job_id     ON projects(job_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members read projects" ON projects
	FOR SELECT USING (org_id = public.user_org_id());
CREATE POLICY "Admin/foreman insert projects" ON projects
	FOR INSERT WITH CHECK (
		org_id = public.user_org_id()
		AND public.user_org_role() IN ('admin','foreman')
	);
CREATE POLICY "Admin/foreman update projects" ON projects
	FOR UPDATE USING (
		org_id = public.user_org_id()
		AND public.user_org_role() IN ('admin','foreman')
	);
CREATE POLICY "Admin/foreman delete projects" ON projects
	FOR DELETE USING (
		org_id = public.user_org_id()
		AND public.user_org_role() IN ('admin','foreman')
	);

-- =============================================================================
-- 4. TRIGGERS for updated_at
-- =============================================================================

-- This function may already exist from schema-quotes.sql; CREATE OR REPLACE is safe.
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
	NEW.updated_at = now();
	RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS assemblies_updated_at ON assemblies;
CREATE TRIGGER assemblies_updated_at
	BEFORE UPDATE ON assemblies
	FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DROP TRIGGER IF EXISTS projects_updated_at ON projects;
CREATE TRIGGER projects_updated_at
	BEFORE UPDATE ON projects
	FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- =============================================================================
-- 5. STORAGE BUCKET: project-plans
-- =============================================================================
-- The bucket itself must be created via the Supabase Dashboard → Storage:
--   Name:           project-plans
--   Public:         OFF (private)
--   File size limit: 50 MB
--   Allowed MIME:    application/pdf
--
-- After the bucket exists, run the policies below.

-- Allow authenticated org members to upload to paths beginning with their orgId
-- (the upload-plan route enforces this on the server side as well).
DROP POLICY IF EXISTS "Org members read project plans"   ON storage.objects;
DROP POLICY IF EXISTS "Org members upload project plans" ON storage.objects;
DROP POLICY IF EXISTS "Org members delete project plans" ON storage.objects;

CREATE POLICY "Org members read project plans" ON storage.objects
	FOR SELECT TO authenticated
	USING (
		bucket_id = 'project-plans'
		AND (storage.foldername(name))[1] = public.user_org_id()::text
	);

CREATE POLICY "Org members upload project plans" ON storage.objects
	FOR INSERT TO authenticated
	WITH CHECK (
		bucket_id = 'project-plans'
		AND (storage.foldername(name))[1] = public.user_org_id()::text
		AND public.user_org_role() IN ('admin','foreman')
	);

CREATE POLICY "Org members delete project plans" ON storage.objects
	FOR DELETE TO authenticated
	USING (
		bucket_id = 'project-plans'
		AND (storage.foldername(name))[1] = public.user_org_id()::text
		AND public.user_org_role() IN ('admin','foreman')
	);
