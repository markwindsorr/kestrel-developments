-- Worker dashboard migration
-- Adds job budget fields, time_entries.daily_task, and todo_items table.
-- Run this in the Supabase SQL Editor.

-- ============================================================
-- 1. Jobs: budget + planned dates
-- ============================================================

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS budget_days NUMERIC(8,2),
  ADD COLUMN IF NOT EXISTS budget_hours_per_day NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS budget_workers INTEGER,
  ADD COLUMN IF NOT EXISTS budget_hours_total NUMERIC(10,2)
    GENERATED ALWAYS AS (budget_days * budget_hours_per_day * budget_workers) STORED,
  ADD COLUMN IF NOT EXISTS planned_start_date DATE,
  ADD COLUMN IF NOT EXISTS planned_end_date DATE;

-- ============================================================
-- 2. Time entries: required daily task description at clock-in
-- ============================================================

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS daily_task TEXT;

CREATE INDEX IF NOT EXISTS idx_time_entries_job_clockin
  ON time_entries(job_id, clock_in DESC);

-- ============================================================
-- 3. Todo items (personal + assigned)
-- ============================================================

CREATE TABLE IF NOT EXISTS todo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  assignee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  label TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_todo_items_assignee_open
  ON todo_items(assignee_id) WHERE is_completed = false;
CREATE INDEX IF NOT EXISTS idx_todo_items_org ON todo_items(org_id);
CREATE INDEX IF NOT EXISTS idx_todo_items_job ON todo_items(job_id);

ALTER TABLE todo_items ENABLE ROW LEVEL SECURITY;

-- SELECT: assignee or any admin/foreman in same org
CREATE POLICY "Assignee or staff read todos" ON todo_items
  FOR SELECT USING (
    org_id = public.user_org_id()
    AND (
      assignee_id = auth.uid()
      OR public.user_org_role() IN ('admin', 'foreman')
    )
  );

-- INSERT: workers can create only self-assigned; admin/foreman can assign to anyone in org
CREATE POLICY "Worker self-insert or staff assign todos" ON todo_items
  FOR INSERT WITH CHECK (
    org_id = public.user_org_id()
    AND (
      (assignee_id = auth.uid() AND created_by = auth.uid())
      OR (public.user_org_role() IN ('admin', 'foreman') AND created_by = auth.uid())
    )
  );

-- UPDATE: assignee can update own; admin/foreman can update any in-org
CREATE POLICY "Assignee or staff update todos" ON todo_items
  FOR UPDATE USING (
    org_id = public.user_org_id()
    AND (
      assignee_id = auth.uid()
      OR public.user_org_role() IN ('admin', 'foreman')
    )
  );

-- DELETE: assignee can delete own; admin/foreman can delete any in-org
CREATE POLICY "Assignee or staff delete todos" ON todo_items
  FOR DELETE USING (
    org_id = public.user_org_id()
    AND (
      assignee_id = auth.uid()
      OR public.user_org_role() IN ('admin', 'foreman')
    )
  );
