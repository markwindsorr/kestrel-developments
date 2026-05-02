-- Invites system migration
-- Run this in the Supabase SQL Editor (after schema.sql has already been applied)

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
