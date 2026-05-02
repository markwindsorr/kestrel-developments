-- Kestral Developments Database Schema
-- Run this in the Supabase SQL Editor

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker' CHECK (role IN ('admin', 'foreman', 'worker')),
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'worker')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Jobs table
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'on-hold', 'completed')),
  client_name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#2563eb',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Job checklist items
CREATE TABLE job_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Time entries
CREATE TABLE time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_time_entries_user_id ON time_entries(user_id);
CREATE INDEX idx_time_entries_job_id ON time_entries(job_id);
CREATE INDEX idx_time_entries_clock_in ON time_entries(clock_in DESC);
CREATE INDEX idx_job_checklist_items_job_id ON job_checklist_items(job_id);

-- Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all profiles, update only their own
CREATE POLICY "Anyone can read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Jobs: all authenticated users can read; admin/foreman can insert/update
CREATE POLICY "Authenticated read jobs" ON jobs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/foreman insert jobs" ON jobs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);
CREATE POLICY "Admin/foreman update jobs" ON jobs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);

-- Checklist items: same permissions as jobs
CREATE POLICY "Authenticated read checklist" ON job_checklist_items FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Admin/foreman manage checklist" ON job_checklist_items FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);
CREATE POLICY "Admin/foreman update checklist" ON job_checklist_items FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);
CREATE POLICY "Admin/foreman delete checklist" ON job_checklist_items FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);

-- Time entries: all can read; users can insert/update own; admin can update any
CREATE POLICY "Authenticated read time entries" ON time_entries FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users insert own entries" ON time_entries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own entries" ON time_entries FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admin update any entry" ON time_entries FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Invites table
CREATE TABLE invites (
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

CREATE INDEX idx_invites_token ON invites(token);

ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin/foreman read invites" ON invites FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);
CREATE POLICY "Admin/foreman create invites" ON invites FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);
CREATE POLICY "Admin/foreman update invites" ON invites FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);
CREATE POLICY "Admin/foreman delete invites" ON invites FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'foreman'))
);

-- Validate an invite token (callable by unauthenticated users during signup)
CREATE OR REPLACE FUNCTION public.validate_invite_token(invite_token TEXT)
RETURNS TABLE(id UUID, role TEXT, email TEXT, expires_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT i.id, i.role, i.email, i.expires_at
  FROM invites i
  WHERE i.token = invite_token
    AND i.used_by IS NULL
    AND i.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Mark an invite as redeemed after signup
CREATE OR REPLACE FUNCTION public.redeem_invite(invite_token TEXT, redeemer_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE invites
  SET used_by = redeemer_id, used_at = now()
  WHERE token = invite_token AND used_by IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
