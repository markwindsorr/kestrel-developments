-- Schedule template migration
-- Adds master gantt template (residential build), auto-applied to new jobs.

-- ============================================================
-- 1. Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS schedule_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_org ON schedule_templates(org_id);

CREATE TABLE IF NOT EXISTS schedule_template_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
  external_ref TEXT,
  trade TEXT NOT NULL,
  duration_days INTEGER NOT NULL CHECK (duration_days > 0),
  color TEXT NOT NULL DEFAULT '#8b2c2c',
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_template_phases_template
  ON schedule_template_phases(template_id);

CREATE TABLE IF NOT EXISTS schedule_template_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES schedule_templates(id) ON DELETE CASCADE,
  from_phase_id UUID NOT NULL REFERENCES schedule_template_phases(id) ON DELETE CASCADE,
  to_phase_id UUID NOT NULL REFERENCES schedule_template_phases(id) ON DELETE CASCADE,
  lag_days INTEGER NOT NULL DEFAULT 0,
  UNIQUE(from_phase_id, to_phase_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_template_deps_template
  ON schedule_template_dependencies(template_id);

-- ============================================================
-- 2. RLS
-- ============================================================

ALTER TABLE schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_template_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_template_dependencies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Org members read schedule templates" ON schedule_templates;
CREATE POLICY "Org members read schedule templates" ON schedule_templates
  FOR SELECT USING (org_id = public.user_org_id());

DROP POLICY IF EXISTS "Staff write schedule templates" ON schedule_templates;
CREATE POLICY "Staff write schedule templates" ON schedule_templates
  FOR ALL USING (
    org_id = public.user_org_id()
    AND public.user_org_role() IN ('admin', 'foreman')
  );

DROP POLICY IF EXISTS "Org members read template phases" ON schedule_template_phases;
CREATE POLICY "Org members read template phases" ON schedule_template_phases
  FOR SELECT USING (
    template_id IN (SELECT id FROM schedule_templates WHERE org_id = public.user_org_id())
  );

DROP POLICY IF EXISTS "Staff write template phases" ON schedule_template_phases;
CREATE POLICY "Staff write template phases" ON schedule_template_phases
  FOR ALL USING (
    template_id IN (SELECT id FROM schedule_templates WHERE org_id = public.user_org_id())
    AND public.user_org_role() IN ('admin', 'foreman')
  );

DROP POLICY IF EXISTS "Org members read template deps" ON schedule_template_dependencies;
CREATE POLICY "Org members read template deps" ON schedule_template_dependencies
  FOR SELECT USING (
    template_id IN (SELECT id FROM schedule_templates WHERE org_id = public.user_org_id())
  );

DROP POLICY IF EXISTS "Staff write template deps" ON schedule_template_dependencies;
CREATE POLICY "Staff write template deps" ON schedule_template_dependencies
  FOR ALL USING (
    template_id IN (SELECT id FROM schedule_templates WHERE org_id = public.user_org_id())
    AND public.user_org_role() IN ('admin', 'foreman')
  );

-- ============================================================
-- 3. Seed function: residential build template (41 phases)
--    Call with: SELECT public.seed_residential_schedule_template(
--      (SELECT id FROM organizations LIMIT 1),
--      (SELECT user_id FROM org_memberships WHERE role = 'admin' LIMIT 1)
--    );
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_residential_schedule_template(
  p_org_id UUID,
  p_user_id UUID
) RETURNS UUID AS $$
DECLARE
  tmpl_id UUID;
  id_1 UUID; id_2 UUID; id_3 UUID; id_4 UUID; id_5 UUID;
  id_6 UUID; id_7 UUID; id_8 UUID; id_9 UUID; id_10 UUID;
  id_11 UUID; id_12 UUID; id_13 UUID; id_14 UUID; id_15 UUID;
  id_16 UUID; id_17 UUID; id_18 UUID; id_19 UUID; id_20 UUID;
  id_21 UUID; id_22 UUID; id_23 UUID; id_24 UUID; id_25 UUID;
  id_26 UUID; id_27 UUID; id_28 UUID; id_29 UUID; id_30 UUID;
  id_31 UUID; id_32 UUID; id_33 UUID; id_34 UUID; id_35 UUID;
  id_36 UUID; id_37 UUID; id_38 UUID; id_39 UUID; id_40 UUID; id_41 UUID;
BEGIN
  -- Insert template (skip if a default already exists)
  IF EXISTS (SELECT 1 FROM schedule_templates WHERE org_id = p_org_id AND is_default) THEN
    RAISE NOTICE 'Default template already exists for org %', p_org_id;
    RETURN (SELECT id FROM schedule_templates WHERE org_id = p_org_id AND is_default LIMIT 1);
  END IF;

  INSERT INTO schedule_templates (org_id, name, is_default, created_by)
  VALUES (p_org_id, 'Standard Residential Build', true, p_user_id)
  RETURNING id INTO tmpl_id;

  -- Phases (ordered, with sort_order = external ref)
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '1', 'Put in for building permit', 12, 1) RETURNING id INTO id_1;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '2', 'Survey Excavation Pins', 1, 2) RETURNING id INTO id_2;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '3', 'Excavation', 1, 3) RETURNING id INTO id_3;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '4', 'Excavation Inspection', 1, 4) RETURNING id INTO id_4;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '5', 'Footing Install', 1, 5) RETURNING id INTO id_5;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '6', 'Foundation install', 1, 6) RETURNING id INTO id_6;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '7', 'Foundation Prep', 1, 7) RETURNING id INTO id_7;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '8', 'Call for backfill inspection', 1, 8) RETURNING id INTO id_8;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order, notes) VALUES (tmpl_id, '9', 'Service Connection Inspection', 1, 9, '48 hour notice required') RETURNING id INTO id_9;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '10', 'Backfill foundation', 1, 10) RETURNING id INTO id_10;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '11', 'Basement Stone', 1, 11) RETURNING id INTO id_11;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '12', 'Framing', 11, 12) RETURNING id INTO id_12;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '13', 'Shingles', 1, 13) RETURNING id INTO id_13;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '14', 'Siding', 3, 14) RETURNING id INTO id_14;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '15', 'Underslab Plumbing', 2, 15) RETURNING id INTO id_15;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '16', 'Basement Poly', 1, 16) RETURNING id INTO id_16;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order, notes) VALUES (tmpl_id, '17', 'Underslab Inspection', 1, 17, '48 hour notice required') RETURNING id INTO id_17;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '18', 'Basement concrete', 1, 18) RETURNING id INTO id_18;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '19', 'Basement Subfloor/framing', 3, 19) RETURNING id INTO id_19;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '20', 'Plumbing Rough in', 4, 20) RETURNING id INTO id_20;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '21', 'HVAC rough in', 2, 21) RETURNING id INTO id_21;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '22', 'Electrical rough in', 6, 22) RETURNING id INTO id_22;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '23', 'Electrical Inspection', 1, 23) RETURNING id INTO id_23;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '24', 'Framing Inspection', 1, 24) RETURNING id INTO id_24;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '25', 'Insulation Install', 5, 25) RETURNING id INTO id_25;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order, notes) VALUES (tmpl_id, '26', 'Insulation Inspection', 1, 26, '48 hour notice required') RETURNING id INTO id_26;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '27', 'Drywall Install', 3, 27) RETURNING id INTO id_27;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '28', 'Plaster/Prime/First Coat', 15, 28) RETURNING id INTO id_28;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '29', 'Hang Doors/Window Trim', 4, 29) RETURNING id INTO id_29;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '30', 'Laminate/Vinyl Flooring/Nosing Install', 4, 30) RETURNING id INTO id_30;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '31', 'Kitchen/Vanity Install', 4, 31) RETURNING id INTO id_31;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '32', 'Trim Install', 3, 32) RETURNING id INTO id_32;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '33', 'Plumbing finishes', 2, 33) RETURNING id INTO id_33;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '34', 'Electrical Finishes', 3, 34) RETURNING id INTO id_34;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '35', 'HVAC finishes', 1, 35) RETURNING id INTO id_35;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '36', 'Carpet Stair', 1, 36) RETURNING id INTO id_36;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '37', 'Handrails', 2, 37) RETURNING id INTO id_37;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '38', 'Final Coat of Paint', 4, 38) RETURNING id INTO id_38;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '39', 'Screen and Cranks', 1, 39) RETURNING id INTO id_39;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '40', 'Final Inspection', 1, 40) RETURNING id INTO id_40;
  INSERT INTO schedule_template_phases (template_id, external_ref, trade, duration_days, sort_order) VALUES (tmpl_id, '41', 'Closing', 1, 41) RETURNING id INTO id_41;

  -- Dependencies (finish-to-start, default 0 lag = next business day)
  INSERT INTO schedule_template_dependencies (template_id, from_phase_id, to_phase_id, lag_days) VALUES
    (tmpl_id, id_1, id_2, 0),
    (tmpl_id, id_2, id_3, 0),
    (tmpl_id, id_3, id_4, 0),
    (tmpl_id, id_4, id_5, 0),
    (tmpl_id, id_5, id_6, 0),
    (tmpl_id, id_6, id_7, 1),  -- concrete cure
    (tmpl_id, id_7, id_8, 0),
    (tmpl_id, id_7, id_9, 0),  -- parallel with #8
    (tmpl_id, id_8, id_10, 0),
    (tmpl_id, id_9, id_10, 0),
    (tmpl_id, id_10, id_11, 0),
    (tmpl_id, id_11, id_12, 0),
    (tmpl_id, id_12, id_13, 0),
    (tmpl_id, id_13, id_14, 0),
    (tmpl_id, id_13, id_15, 0),  -- underslab plumbing parallel with siding
    (tmpl_id, id_14, id_16, 0),  -- basement poly waits for siding (latest)
    (tmpl_id, id_15, id_16, 0),
    (tmpl_id, id_16, id_17, 0),
    (tmpl_id, id_17, id_18, 0),
    (tmpl_id, id_18, id_19, 0),
    (tmpl_id, id_19, id_20, 0),
    (tmpl_id, id_19, id_21, 1),  -- HVAC starts 1 day after subfloor (parallel-ish with plumbing)
    (tmpl_id, id_20, id_22, 0),
    (tmpl_id, id_21, id_22, 0),
    (tmpl_id, id_22, id_23, 0),
    (tmpl_id, id_22, id_24, 0),  -- framing inspection same day as electrical inspection
    (tmpl_id, id_23, id_25, 0),
    (tmpl_id, id_24, id_25, 0),
    (tmpl_id, id_25, id_26, 0),
    (tmpl_id, id_26, id_27, 0),
    (tmpl_id, id_27, id_28, 0),
    (tmpl_id, id_28, id_29, 0),
    (tmpl_id, id_29, id_30, 0),
    (tmpl_id, id_30, id_31, 0),
    (tmpl_id, id_31, id_32, 0),
    (tmpl_id, id_32, id_33, 0),
    (tmpl_id, id_33, id_34, 0),
    (tmpl_id, id_33, id_35, 0),  -- HVAC finishes parallel with electrical finishes
    (tmpl_id, id_34, id_36, 0),
    (tmpl_id, id_35, id_36, 0),
    (tmpl_id, id_36, id_37, 0),
    (tmpl_id, id_37, id_38, 0),
    (tmpl_id, id_37, id_39, 0),  -- screen and cranks parallel with final paint
    (tmpl_id, id_38, id_40, 0),
    (tmpl_id, id_39, id_40, 0),
    (tmpl_id, id_40, id_41, 0);

  RETURN tmpl_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
