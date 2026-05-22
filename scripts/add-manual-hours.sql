-- Manual hour entry migration
-- Switches time_entries from clock_in/clock_out to end-of-day manual hours.
-- Run AFTER add-worker-dashboard.sql.

ALTER TABLE time_entries
  ADD COLUMN IF NOT EXISTS work_date DATE,
  ADD COLUMN IF NOT EXISTS hours NUMERIC(5,2);

-- Backfill existing rows from clock_in/clock_out
UPDATE time_entries
SET
  work_date = (clock_in AT TIME ZONE 'UTC')::date,
  hours = CASE
    WHEN clock_out IS NULL THEN 0
    ELSE ROUND(EXTRACT(EPOCH FROM (clock_out - clock_in)) / 3600.0, 2)
  END
WHERE work_date IS NULL;

-- Future inserts must specify these
ALTER TABLE time_entries
  ALTER COLUMN work_date SET NOT NULL,
  ALTER COLUMN hours SET NOT NULL,
  ALTER COLUMN clock_in DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_time_entries_work_date ON time_entries(work_date DESC);
CREATE INDEX IF NOT EXISTS idx_time_entries_user_workdate
  ON time_entries(user_id, work_date DESC);
