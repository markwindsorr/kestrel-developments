-- Fix: Allow all org members (including workers) to update checklist items
-- Run this in the Supabase SQL Editor

DROP POLICY IF EXISTS "Admin/foreman update checklist" ON job_checklist_items;

CREATE POLICY "Org members update checklist" ON job_checklist_items
  FOR UPDATE USING (
    job_id IN (SELECT j.id FROM jobs j WHERE j.org_id = public.user_org_id())
  );
