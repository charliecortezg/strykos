
-- ============================================================
-- Assessment Lab Migration
-- ============================================================

-- A. profiles: add active_organization_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS active_organization_id uuid REFERENCES public.organizations(id);

-- B. organizations: add organization_type
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS organization_type text NOT NULL DEFAULT 'academy';

-- C. players: add player_type, parent_email, parent_phone
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS player_type text NOT NULL DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS parent_email text,
  ADD COLUMN IF NOT EXISTS parent_phone text;

-- D. evaluations: add event_id
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS event_id uuid;

-- E. New table: evaluation_events
CREATE TABLE IF NOT EXISTS public.evaluation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  title text NOT NULL,
  event_date date,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES public.profiles(id),
  closed_by uuid REFERENCES public.profiles(id),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view events in their org"
  ON public.evaluation_events FOR SELECT
  USING (organization_id = public.get_current_org_id());

CREATE POLICY "Directors can create events"
  ON public.evaluation_events FOR INSERT
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (public.has_org_role('director_deportivo') OR public.has_org_role('org_owner'))
  );

CREATE POLICY "Directors can update events"
  ON public.evaluation_events FOR UPDATE
  USING (
    organization_id = public.get_current_org_id()
    AND (public.has_org_role('director_deportivo') OR public.has_org_role('org_owner'))
  );

-- F. New table: evaluation_event_players
CREATE TABLE IF NOT EXISTS public.evaluation_event_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.evaluation_events(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  status text NOT NULL DEFAULT 'pending',
  evaluated_by uuid REFERENCES public.profiles(id),
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, player_id)
);

ALTER TABLE public.evaluation_event_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view event players in their org"
  ON public.evaluation_event_players FOR SELECT
  USING (organization_id = public.get_current_org_id());

CREATE POLICY "Directors can add event players"
  ON public.evaluation_event_players FOR INSERT
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (public.has_org_role('director_deportivo') OR public.has_org_role('org_owner'))
  );

CREATE POLICY "Authorized roles can update event players"
  ON public.evaluation_event_players FOR UPDATE
  USING (
    organization_id = public.get_current_org_id()
    AND (public.has_org_role('entrenador') OR public.has_org_role('director_deportivo') OR public.has_org_role('org_owner'))
  );

-- G. New table: evaluation_delivery
CREATE TABLE IF NOT EXISTS public.evaluation_delivery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  delivery_status text NOT NULL DEFAULT 'pending',
  recipient_email text,
  last_attempt_at timestamptz,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.evaluation_delivery ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view delivery in their org"
  ON public.evaluation_delivery FOR SELECT
  USING (organization_id = public.get_current_org_id());

CREATE POLICY "Directors can manage delivery"
  ON public.evaluation_delivery FOR INSERT
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (public.has_org_role('director_deportivo') OR public.has_org_role('org_owner'))
  );

-- H. Add FK for evaluations.event_id
ALTER TABLE public.evaluations
  ADD CONSTRAINT evaluations_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES public.evaluation_events(id);

-- I. Update get_current_org_id() to support multi-org
CREATE OR REPLACE FUNCTION public.get_current_org_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  SELECT COALESCE(active_organization_id, organization_id)
  FROM public.profiles
  WHERE id = auth.uid()
$$;

-- J. RPC: switch_organization
CREATE OR REPLACE FUNCTION public.switch_organization(target_org_id uuid)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  -- Validate user has a role in target org
  IF NOT EXISTS (
    SELECT 1 FROM public.user_org_roles
    WHERE user_id = auth.uid()
      AND organization_id = target_org_id
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a esta organización';
  END IF;

  -- Update active org
  UPDATE public.profiles
  SET active_organization_id = target_org_id
  WHERE id = auth.uid();
END;
$$;

-- K. RPC: reset_active_organization (for logout cleanup)
CREATE OR REPLACE FUNCTION public.reset_active_organization()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.profiles
  SET active_organization_id = NULL
  WHERE id = auth.uid();
END;
$$;
