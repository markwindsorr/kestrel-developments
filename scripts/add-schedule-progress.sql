-- Phase progress tracking on trade_schedules
-- Run in Supabase SQL Editor after add-schedule-templates.sql

ALTER TABLE trade_schedules
  ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0
    CHECK (progress >= 0 AND progress <= 100);

-- Helper: mark a job's phases done up to (and excluding) the named current phase,
-- set the current phase to in-progress (50%), leave later phases at 0.
-- Match is case-insensitive on the trade name. Ordering is by start_date.
CREATE OR REPLACE FUNCTION public.set_job_phase_progress(
  p_job_id UUID,
  p_current_trade TEXT
) RETURNS INTEGER AS $$
DECLARE
  cur_start DATE;
  affected INTEGER;
BEGIN
  SELECT start_date INTO cur_start
  FROM trade_schedules
  WHERE job_id = p_job_id
    AND lower(trade) = lower(p_current_trade)
  ORDER BY start_date
  LIMIT 1;

  IF cur_start IS NULL THEN
    RAISE NOTICE 'No phase matching "%" on job %', p_current_trade, p_job_id;
    RETURN 0;
  END IF;

  UPDATE trade_schedules SET progress = 100
   WHERE job_id = p_job_id AND start_date < cur_start;

  UPDATE trade_schedules SET progress = 50
   WHERE job_id = p_job_id AND lower(trade) = lower(p_current_trade);

  UPDATE trade_schedules SET progress = 0
   WHERE job_id = p_job_id AND start_date > cur_start
     AND lower(trade) <> lower(p_current_trade);

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
