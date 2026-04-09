
-- Create idp_monthly_checkins table
CREATE TABLE public.idp_monthly_checkins (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  idp_cycle_id    uuid NOT NULL REFERENCES public.idp_cycles(id),
  player_id       uuid NOT NULL REFERENCES public.players(id),
  check_in_number integer NOT NULL,
  check_in_date   date NOT NULL,
  evaluation_event_id uuid REFERENCES public.evaluation_events(id),
  scores_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  dimension_changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  coach_message   text,
  exercises_updated boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- Index for efficient queries
CREATE INDEX idx_idp_monthly_checkins_org_cycle_player
  ON public.idp_monthly_checkins (organization_id, idp_cycle_id, player_id);

-- Enable RLS
ALTER TABLE public.idp_monthly_checkins ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view checkins in their org"
  ON public.idp_monthly_checkins FOR SELECT
  TO authenticated
  USING (organization_id = public.get_current_org_id());

CREATE POLICY "Trainers and directors can create checkins"
  ON public.idp_monthly_checkins FOR INSERT
  TO authenticated
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner'::org_role)
      OR public.has_org_role('director_deportivo'::org_role)
      OR public.has_org_role('entrenador'::org_role)
    )
  );

-- Add pending_checkin to idp_focus_areas
ALTER TABLE public.idp_focus_areas
  ADD COLUMN IF NOT EXISTS pending_checkin boolean DEFAULT false;
