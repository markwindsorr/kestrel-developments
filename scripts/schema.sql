-- Kestral Developments Database Schema
-- Run this in the Supabase SQL Editor
-- NOTE: If migrating from a previous version, use add-orgs.sql instead

-- ============================================================
-- Organizations
-- ============================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Profiles table (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
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

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Organization memberships (roles are per-org)
-- ============================================================

CREATE TABLE org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'foreman', 'worker')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

CREATE INDEX idx_org_memberships_user_id ON org_memberships(user_id);
CREATE INDEX idx_org_memberships_org_id ON org_memberships(org_id);

-- ============================================================
-- Checklist templates
-- ============================================================

CREATE TABLE checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_templates_org_id ON checklist_templates(org_id);

CREATE TABLE checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_template_items_template_id ON checklist_template_items(template_id);

-- ============================================================
-- Jobs table
-- ============================================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on-hold', 'completed')),
  client_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563eb',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_jobs_org_id ON jobs(org_id);

-- ============================================================
-- Job checklist items
-- ============================================================

CREATE TABLE job_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_job_checklist_items_job_id ON job_checklist_items(job_id);

-- ============================================================
-- Time entries
-- ============================================================

CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_job_id ON time_entries(job_id);
CREATE INDEX idx_time_entries_clock_in ON time_entries(clock_in DESC);
CREATE INDEX idx_time_entries_org_id ON time_entries(org_id);

-- ============================================================
-- Invites table
-- ============================================================

CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'foreman', 'worker')),
  email TEXT,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  used_by UUID REFERENCES profiles(id),
  used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invites_token ON invites(token);
CREATE INDEX idx_invites_org_id ON invites(org_id);

-- ============================================================
-- Helper functions for RLS
-- ============================================================

CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS UUID AS $$
  SELECT org_id FROM org_memberships WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.user_org_role()
RETURNS TEXT AS $$
  SELECT role FROM org_memberships WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Seed default checklist template for a new org
CREATE OR REPLACE FUNCTION public.seed_default_template(p_org_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  tmpl_id UUID;
BEGIN
  INSERT INTO checklist_templates (org_id, name, is_default, created_by)
  VALUES (p_org_id, 'Standard Residential Build', true, p_user_id)
  RETURNING id INTO tmpl_id;

  -- Items inserted via migration script (see add-checklist-templates.sql)
  RETURN tmpl_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bootstrap: create org + admin membership + default template in one call
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

  PERFORM public.seed_default_template(new_org_id, admin_user_id);

  RETURN new_org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Validate an invite token (callable by unauthenticated users during signup)
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

-- Mark an invite as redeemed and add user to org
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
-- Row Level Security
-- ============================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

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

-- checklist_templates
CREATE POLICY "Org members read templates" ON checklist_templates
  FOR SELECT USING (org_id = public.user_org_id());
CREATE POLICY "Admin/foreman insert templates" ON checklist_templates
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id()
    AND public.user_org_role() IN ('admin', 'foreman')
  );
CREATE POLICY "Admin/foreman update templates" ON checklist_templates
  FOR UPDATE USING (
    org_id = public.user_org_id()
    AND public.user_org_role() IN ('admin', 'foreman')
  );
CREATE POLICY "Admin/foreman delete templates" ON checklist_templates
  FOR DELETE USING (
    org_id = public.user_org_id()
    AND public.user_org_role() IN ('admin', 'foreman')
  );

-- checklist_template_items (scoped through template's org)
CREATE POLICY "Org members read template items" ON checklist_template_items
  FOR SELECT USING (
    template_id IN (SELECT ct.id FROM checklist_templates ct WHERE ct.org_id = public.user_org_id())
  );
CREATE POLICY "Admin/foreman insert template items" ON checklist_template_items
  FOR INSERT WITH CHECK (
    template_id IN (SELECT ct.id FROM checklist_templates ct WHERE ct.org_id = public.user_org_id())
    AND public.user_org_role() IN ('admin', 'foreman')
  );
CREATE POLICY "Admin/foreman update template items" ON checklist_template_items
  FOR UPDATE USING (
    template_id IN (SELECT ct.id FROM checklist_templates ct WHERE ct.org_id = public.user_org_id())
    AND public.user_org_role() IN ('admin', 'foreman')
  );
CREATE POLICY "Admin/foreman delete template items" ON checklist_template_items
  FOR DELETE USING (
    template_id IN (SELECT ct.id FROM checklist_templates ct WHERE ct.org_id = public.user_org_id())
    AND public.user_org_role() IN ('admin', 'foreman')
  );

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
