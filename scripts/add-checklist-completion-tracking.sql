-- Checklist Completion Tracking Migration
-- Run this in the Supabase SQL Editor
-- Adds completion metadata (who, when, notes) to job checklist items

ALTER TABLE job_checklist_items ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE job_checklist_items ADD COLUMN IF NOT EXISTS completed_by UUID REFERENCES profiles(id);
ALTER TABLE job_checklist_items ADD COLUMN IF NOT EXISTS notes TEXT;

-- Backfill: set completed_at to created_at for already-completed items
UPDATE job_checklist_items
SET completed_at = created_at
WHERE is_completed = true AND completed_at IS NULL;
