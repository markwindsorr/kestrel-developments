-- Multi-tenancy migration: adds organizations and org-scoped data
-- Run this in the Supabase SQL Editor

-- ============================================================
-- 1. New tables
-- ============================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'foreman', 'worker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_org_memberships_org_id ON org_memberships(org_id);

ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Create invites table if it doesn't exist
-- ============================================================

CREATE TABLE IF NOT EXISTS invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'foreman', 'worker')),
  email TEXT,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Add org_id to existing data tables
-- ============================================================

ALTER TABLE jobs ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE time_entries ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE invites ADD COLUMN IF NOT EXISTS org_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_jobs_org_id ON jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_time_entries_org_id ON time_entries(org_id);
CREATE INDEX IF NOT EXISTS idx_invites_org_id ON invites(org_id);

-- ============================================================
-- 4. Drop old RLS policies that reference profiles.role
-- ============================================================

DROP POLICY IF EXISTS "Anyone can read profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated read jobs" ON jobs;
DROP POLICY IF EXISTS "Admin/foreman insert jobs" ON jobs;
DROP POLICY IF EXISTS "Admin/foreman update jobs" ON jobs;
DROP POLICY IF EXISTS "Admin/foreman delete jobs" ON jobs;
DROP POLICY IF EXISTS "Authenticated read checklist" ON job_checklist_items;
DROP POLICY IF EXISTS "Admin/foreman manage checklist" ON job_checklist_items;
DROP POLICY IF EXISTS "Admin/foreman update checklist" ON job_checklist_items;
DROP POLICY IF EXISTS "Admin/foreman delete checklist" ON job_checklist_items;
DROP POLICY IF EXISTS "Authenticated read time entries" ON time_entries;
DROP POLICY IF EXISTS "Users insert own entries" ON time_entries;
DROP POLICY IF EXISTS "Users update own entries" ON time_entries;
DROP POLICY IF EXISTS "Admin update any entry" ON time_entries;
DROP POLICY IF EXISTS "Admin/foreman read invites" ON invites;
DROP POLICY IF EXISTS "Admin/foreman create invites" ON invites;
DROP POLICY IF EXISTS "Admin/foreman update invites" ON invites;
DROP POLICY IF EXISTS "Admin/foreman delete invites" ON invites;

-- ============================================================
-- 5. Drop role from profiles (now lives in org_memberships)
-- ============================================================

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles DROP COLUMN IF EXISTS role;

-- ============================================================
-- 5. Helper functions for RLS
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM org_memberships WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_org_role()
RETURNS TEXT AS $$
  SELECT role FROM org_memberships WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ============================================================
-- 6. Bootstrap function: create org + admin membership
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_org_for_admin(org_name TEXT, admin_user_id UUID)
RETURNS UUID AS $$
DECLARE
  new_org_id UUID;
BEGIN
  INSERT INTO organizations (name, created_by)
  VALUES (org_name, admin_user_id)
  RETURNING id INTO new_org_id;

  INSERT INTO org_memberships (org_id, user_id, role)
  VALUES (new_org_id, admin_user_id, 'admin');

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 7. Update handle_new_user (no longer sets role)
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. Update validate_invite_token (now returns org_id)
-- ============================================================

CREATE OR REPLACE FUNCTION public.validate_invite_token(invite_token TEXT)
RETURNS TABLE(id UUID, role TEXT, email TEXT, expires_at TIMESTAMPTZ, org_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.role, i.email, i.expires_at, i.org_id
  FROM invites i
  WHERE i.token = invite_token
    AND i.used_by IS NULL
    AND i.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. Update redeem_invite (now adds org membership)
-- ============================================================

CREATE OR REPLACE FUNCTION public.redeem_invite(invite_token TEXT, redeemer_id UUID)
RETURNS VOID AS $$
DECLARE
  inv RECORD;
BEGIN
  SELECT i.org_id, i.role INTO inv
  FROM invites i
  WHERE i.token = invite_token AND i.used_by IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or already-used invite';
  END IF;

  INSERT INTO org_memberships (org_id, user_id, role)
  VALUES (inv.org_id, redeemer_id, inv.role)
  ON CONFLICT (org_id, user_id) DO NOTHING;

  UPDATE invites
  SET used_by = redeemer_id, used_at = now()
  WHERE token = invite_token AND used_by IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 11. New RLS policies
-- ============================================================

-- organizations
CREATE POLICY "Members read own org" ON organizations
  FOR SELECT USING (
    id IN (SELECT om.org_id FROM org_memberships om WHERE om.user_id = auth.uid())
  );

CREATE POLICY "Authenticated create org" ON organizations
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin update org" ON organizations
  FOR UPDATE USING (
    id IN (SELECT om.org_id FROM org_memberships om WHERE om.user_id = auth.uid() AND om.role = 'admin')
  );

-- org_memberships
CREATE POLICY "Members read own org memberships" ON org_memberships
  FOR SELECT USING (org_id = public.user_org_id());

CREATE POLICY "Admin insert membership" ON org_memberships
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id() AND public.user_org_role() = 'admin'
  );

CREATE POLICY "Admin update membership" ON org_memberships
  FOR UPDATE USING (
    org_id = public.user_org_id() AND public.user_org_role() = 'admin'
  );

CREATE POLICY "Admin delete membership" ON org_memberships
  FOR DELETE USING (
    org_id = public.user_org_id() AND public.user_org_role() = 'admin'
  );

-- profiles
CREATE POLICY "Read own and org profiles" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR id IN (SELECT om.user_id FROM org_memberships om WHERE om.org_id = public.user_org_id())
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow insert via trigger" ON profiles
  FOR INSERT WITH CHECK (true);

-- jobs
CREATE POLICY "Org members read jobs" ON jobs
  FOR SELECT USING (org_id = public.user_org_id());

CREATE POLICY "Admin/foreman insert jobs" ON jobs
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id()
    AND public.user_org_role() IN ('admin', 'foreman')
  );

CREATE POLICY "Admin/foreman update jobs" ON jobs
  FOR UPDATE USING (
    org_id = public.user_org_id()
    AND public.user_org_role() IN ('admin', 'foreman')
  );

CREATE POLICY "Admin delete jobs" ON jobs
  FOR DELETE USING (
    org_id = public.user_org_id()
    AND public.user_org_role() = 'admin'
  );

-- job_checklist_items (scoped via job FK)
CREATE POLICY "Org members read checklist" ON job_checklist_items
  FOR SELECT USING (
    job_id IN (SELECT j.id FROM jobs j WHERE j.org_id = public.user_org_id())
  );

CREATE POLICY "Admin/foreman insert checklist" ON job_checklist_items
  FOR INSERT WITH CHECK (
    job_id IN (SELECT j.id FROM jobs j WHERE j.org_id = public.user_org_id())
    AND public.user_org_role() IN ('admin', 'foreman')
  );

CREATE POLICY "Admin/foreman update checklist" ON job_checklist_items
  FOR UPDATE USING (
    job_id IN (SELECT j.id FROM jobs j WHERE j.org_id = public.user_org_id())
    AND public.user_org_role() IN ('admin', 'foreman')
  );

CREATE POLICY "Admin/foreman delete checklist" ON job_checklist_items
  FOR DELETE USING (
    job_id IN (SELECT j.id FROM jobs j WHERE j.org_id = public.user_org_id())
    AND public.user_org_role() IN ('admin', 'foreman')
  );

-- time_entries
CREATE POLICY "Org members read time entries" ON time_entries
  FOR SELECT USING (org_id = public.user_org_id());

CREATE POLICY "Users insert own entries" ON time_entries
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    AND org_id = public.user_org_id()
  );

CREATE POLICY "Users update own entries" ON time_entries
  FOR UPDATE USING (
    auth.uid() = user_id
    AND org_id = public.user_org_id()
  );

CREATE POLICY "Admin update any entry" ON time_entries
  FOR UPDATE USING (
    org_id = public.user_org_id()
    AND public.user_org_role() = 'admin'
  );

-- invites
CREATE POLICY "Admin/foreman read invites" ON invites
  FOR SELECT USING (
    org_id = public.user_org_id()
    AND public.user_org_role() IN ('admin', 'foreman')
  );

CREATE POLICY "Admin/foreman create invites" ON invites
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id()
    AND public.user_org_role() IN ('admin', 'foreman')
  );

CREATE POLICY "Admin/foreman update invites" ON invites
  FOR UPDATE USING (
    org_id = public.user_org_id()
    AND public.user_org_role() IN ('admin', 'foreman')
  );

CREATE POLICY "Admin/foreman delete invites" ON invites
  FOR DELETE USING (
    org_id = public.user_org_id()
    AND public.user_org_role() IN ('admin', 'foreman')
  );
