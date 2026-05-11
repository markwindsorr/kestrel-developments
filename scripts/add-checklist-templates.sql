-- Checklist Templates Migration
-- Run this in the Supabase SQL Editor
-- Adds org-scoped checklist templates that can be assigned to jobs

-- ============================================================
-- New tables
-- ============================================================

CREATE TABLE IF NOT EXISTS checklist_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_templates_org_id ON checklist_templates(org_id);

CREATE TABLE IF NOT EXISTS checklist_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE,
  section TEXT NOT NULL DEFAULT '',
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_checklist_template_items_template_id ON checklist_template_items(template_id);

-- ============================================================
-- Column additions
-- ============================================================

-- Track which template was used when creating a job (informational only)
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES checklist_templates(id) ON DELETE SET NULL;

-- Ensure section column exists on job_checklist_items (used in app but may be missing from schema)
ALTER TABLE job_checklist_items ADD COLUMN IF NOT EXISTS section TEXT NOT NULL DEFAULT '';

-- ============================================================
-- Seed default template function
-- ============================================================

CREATE OR REPLACE FUNCTION public.seed_default_template(p_org_id UUID, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  tmpl_id UUID;
BEGIN
  INSERT INTO checklist_templates (org_id, name, is_default, created_by)
  VALUES (p_org_id, 'Standard Residential Build', true, p_user_id)
  RETURNING id INTO tmpl_id;

  INSERT INTO checklist_template_items (template_id, section, label, sort_order) VALUES
    (tmpl_id, 'Pre Project Planning', 'Get Survey and Grading Plan', 0),
    (tmpl_id, 'Pre Project Planning', 'Get Electrical location from NL power', 1),
    (tmpl_id, 'Pre Project Planning', 'Send above to drafter', 2),
    (tmpl_id, 'Pre Project Planning', 'Take in account of sun exposure', 3),
    (tmpl_id, 'Pre Project Planning', 'Make sure enough room for driveway requirement if 2 apt', 4),
    (tmpl_id, 'Pre Project Planning', 'Choose windows and doors', 5),
    (tmpl_id, 'Pre Project Planning', 'Look over subdivision covenants from developer and town', 6),
    (tmpl_id, 'Pre Project Planning', 'Review truss drawings. Make sure all load points and girders don''t fall on top of windows', 7),
    (tmpl_id, 'Pre Project Planning', 'Review window lintels and beam sizing', 8),
    (tmpl_id, 'Pre Project Planning', 'Review what way joists are going and minimize bulkheads', 9),
    (tmpl_id, 'Pre Project Planning', 'Figure out elec panel locations', 10),
    (tmpl_id, 'Pre Project Planning', 'Apply for permit', 11),
    (tmpl_id, 'Project Planning', 'Order Windows and Doors', 12),
    (tmpl_id, 'Project Planning', 'Order Trusses', 13),
    (tmpl_id, 'Project Planning', 'Line up Sub contractors', 14),
    (tmpl_id, 'Project Planning', 'Ask plumber where to put key openings in footing', 15),
    (tmpl_id, 'Project Planning', 'Order siding, jblocks and plug boxes', 16),
    (tmpl_id, 'Project Planning', 'Order window wells', 17),
    (tmpl_id, 'Project Planning', 'Order Light fixtures. Use proper j blocks for lights', 18),
    (tmpl_id, 'Site Prep', 'Call surveyors for excavation pins', 19),
    (tmpl_id, 'Site Prep', 'Line up excavator and dig basement', 20),
    (tmpl_id, 'Site Prep', 'Call for excavation inspection', 21),
    (tmpl_id, 'Site Prep', 'Call surveyors for footing pins', 22),
    (tmpl_id, 'Site Prep', 'Line up footing contractor and pour footings — Make sure footings line up with load bearing walls, communicate any keys or notes in drawings, verify all footings are in correct location. If footing can''t be placed due to frostwall, coordinate with contractor to pour footing after insulation is done and backfilled or use LVL', 23),
    (tmpl_id, 'Site Prep', 'Line up foundation form contractor and pour walls — Make sure window sizes, step ups and entrances are communicated. Verify correct sizes once completed', 24),
    (tmpl_id, 'Site Prep', 'Communicate with excavation contractor where service entrance is', 25),
    (tmpl_id, 'Site Prep', 'Get Surveyor to complete a real property report', 26),
    (tmpl_id, 'Site Prep', 'Knock off tie rods and gum', 27),
    (tmpl_id, 'Site Prep', 'Snap chalk lines 8-10" down, tar entire foundation', 28),
    (tmpl_id, 'Site Prep', 'Install frost wall insulation — Make sure it''s pinned up high to stop rock getting behind and cracking insulation off', 29),
    (tmpl_id, 'Site Prep', 'Install window wells', 30),
    (tmpl_id, 'Site Prep', 'Install weeping tile', 31),
    (tmpl_id, 'Site Prep', 'Order stone to cover weeping tile and stone for inside foundation', 32),
    (tmpl_id, 'Site Prep', 'Send real property report to town inspector', 33),
    (tmpl_id, 'Site Prep', 'Call for backfill inspection', 34),
    (tmpl_id, 'Framing', 'Discuss with framers toilet locations to adjust floor joists if needed', 35),
    (tmpl_id, 'Framing', 'Truss uplift — Check for trusses directly above walls (install shiny 90 if so, ensure drywall contractor screws into those). Verify any trusses less than 10-12" from wall are not nailed and floating. Verify truss blocks are installed and strapping is nailed into those. Verify no strapping is nailed 16" or less near a wall', 36),
    (tmpl_id, 'Framing', 'Drywall returns installed where required', 37),
    (tmpl_id, 'Framing', 'Use a square and 6 foot level to check if walls with cabinets, long walls and vanities are plumb and square', 38),
    (tmpl_id, 'Framing', 'Install insulation, VB and plywood in panel locations', 39),
    (tmpl_id, 'Framing', 'If mold is visible on wood, spray mold-ex to remove from studs. Wear mask', 40),
    (tmpl_id, 'Plumbing - Pre Concrete', 'Box out shower drains', 41),
    (tmpl_id, 'Plumbing - Pre Concrete', 'Secure water line to stay inside future wall cavity', 42),
    (tmpl_id, 'Plumbing - Pre Concrete', 'Secure radon pipe to stay straight', 43),
    (tmpl_id, 'Plumbing - Pre Concrete', 'Install drain for HRV', 44),
    (tmpl_id, 'Plumbing Rough-In', 'Complete plumbing rough-in', 45),
    (tmpl_id, 'Electrical Rough-In', 'Verify electrical rough-in', 46),
    (tmpl_id, 'HVAC Rough-In', 'Size up panel location', 47),
    (tmpl_id, 'Post Mechanical Walkthrough', 'Take video of house. Ensure ceiling and walls are pictured', 48),
    (tmpl_id, 'Post Mechanical Walkthrough', 'If applicable, verify garage door wiring is installed', 49),
    (tmpl_id, 'Insulation & Vapour Barrier', 'Size up panel location', 50);

  RETURN tmpl_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Update create_org_for_admin to seed default template
-- ============================================================

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

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_template_items ENABLE ROW LEVEL SECURITY;

-- checklist_templates: org members can read, admin/foreman can manage
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

-- checklist_template_items: scoped through template's org
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
