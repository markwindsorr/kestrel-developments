-- Quote Request System Schema
-- Run this in the Supabase SQL Editor after schema.sql

-- ─── House Estimates (migrated from localStorage) ─────────────────────────────

CREATE TABLE house_estimates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  data        JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_house_estimates_user_id ON house_estimates(user_id);
CREATE INDEX idx_house_estimates_updated ON house_estimates(updated_at DESC);

ALTER TABLE house_estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own estimates" ON house_estimates
  FOR ALL USING (auth.uid() = user_id);

-- ─── Project Documents (Drive file references) ────────────────────────────────

CREATE TABLE project_documents (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id    UUID NOT NULL REFERENCES house_estimates(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  drive_file_id  TEXT NOT NULL,
  drive_url      TEXT NOT NULL,
  mime_type      TEXT NOT NULL DEFAULT 'application/pdf',
  trade_category TEXT,  -- null = all trades; or 'Electrical', 'Plumbing', etc.
  uploaded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_project_documents_estimate ON project_documents(estimate_id);

ALTER TABLE project_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own documents" ON project_documents
  FOR ALL USING (auth.uid() = user_id);

-- ─── Quote Requests ───────────────────────────────────────────────────────────

CREATE TABLE quote_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token            UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  estimate_id      UUID NOT NULL REFERENCES house_estimates(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  trade_name       TEXT NOT NULL,
  trade_email      TEXT NOT NULL,
  trade_category   TEXT NOT NULL,  -- 'Electrical', 'Plumbing', 'Framing', etc.
  document_ids     UUID[] NOT NULL DEFAULT '{}',
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','viewed','received','expired')),
  estimate_amount  NUMERIC(12,2),  -- what your estimate shows for this trade
  quote_amount     NUMERIC(12,2),  -- what the sub submitted
  quote_notes      TEXT,
  quote_pdf_path   TEXT,           -- Supabase Storage path for submitted PDF
  sent_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  viewed_at        TIMESTAMPTZ,
  received_at      TIMESTAMPTZ,
  reminder_count   INTEGER NOT NULL DEFAULT 0,
  last_reminder_at TIMESTAMPTZ
);

CREATE INDEX idx_quote_requests_estimate ON quote_requests(estimate_id);
CREATE INDEX idx_quote_requests_token    ON quote_requests(token);
CREATE INDEX idx_quote_requests_status   ON quote_requests(status);

ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own quote requests" ON quote_requests
  FOR ALL USING (auth.uid() = user_id);

-- Public read by token (unauthenticated — for the contractor submission page)
CREATE POLICY "Public read by token" ON quote_requests
  FOR SELECT USING (true);

-- ─── Gmail OAuth Tokens ───────────────────────────────────────────────────────

CREATE TABLE gmail_tokens (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  refresh_token TEXT NOT NULL,
  email         TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE gmail_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own gmail token" ON gmail_tokens
  FOR ALL USING (auth.uid() = user_id);

-- ─── Supabase Storage bucket for quote PDFs ───────────────────────────────────
-- Run this separately in the Supabase dashboard → Storage → New bucket:
--   Name: quote-submissions
--   Public: false
--   File size limit: 20MB
--   Allowed types: application/pdf

-- ─── Trigger: update updated_at on house_estimates ───────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER house_estimates_updated_at
  BEFORE UPDATE ON house_estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
