
-- A3: Add importance and xp_multiplier to matches
ALTER TABLE public.matches
  ADD COLUMN importance text NOT NULL DEFAULT 'regular',
  ADD COLUMN xp_multiplier numeric NOT NULL DEFAULT 1.0;

-- A7: Create monthly_reports table
CREATE TABLE public.monthly_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  report_month date NOT NULL,
  new_players_count integer NOT NULL DEFAULT 0,
  churned_count integer NOT NULL DEFAULT 0,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, report_month)
);

-- Enable RLS
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;

-- RLS: SELECT for org_owner, director_deportivo, administrativo
CREATE POLICY "Org managers can view monthly reports"
  ON public.monthly_reports FOR SELECT
  USING (
    organization_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner')
      OR public.has_org_role('director_deportivo')
      OR public.has_org_role('administrativo')
    )
  );

-- RLS: INSERT for org_owner and director_deportivo
CREATE POLICY "Org managers can create monthly reports"
  ON public.monthly_reports FOR INSERT
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner')
      OR public.has_org_role('director_deportivo')
    )
  );
