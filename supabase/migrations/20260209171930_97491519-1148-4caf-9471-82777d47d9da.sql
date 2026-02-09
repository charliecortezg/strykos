
-- =====================================================
-- BLOQUE 1: Schema changes for Lifecycle, Billing, Blue Semaphore
-- =====================================================

-- 1.1 New columns on players
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS lifecycle_status text NOT NULL DEFAULT 'prospect';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'paid_current';
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS last_paid_month text;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS offboarded_at timestamptz;

-- 1.2 player_lifecycle_log
CREATE TABLE IF NOT EXISTS public.player_lifecycle_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  player_id uuid NOT NULL REFERENCES public.players(id),
  from_status text,
  to_status text,
  reason text,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_lifecycle_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view lifecycle log"
  ON public.player_lifecycle_log FOR SELECT
  USING (
    organization_id = get_current_org_id()
    AND (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role))
  );

CREATE POLICY "Org roles can insert lifecycle log"
  ON public.player_lifecycle_log FOR INSERT
  WITH CHECK (
    organization_id = get_current_org_id()
    AND (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role) OR has_org_role('administrativo'::org_role) OR has_org_role('entrenador'::org_role))
  );

-- 1.3 billing_events_log
CREATE TABLE IF NOT EXISTS public.billing_events_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  player_id uuid NOT NULL REFERENCES public.players(id),
  event_type text NOT NULL,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_events_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view billing events"
  ON public.billing_events_log FOR SELECT
  USING (
    organization_id = get_current_org_id()
    AND (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role) OR has_org_role('administrativo'::org_role))
  );

CREATE POLICY "Org admins can insert billing events"
  ON public.billing_events_log FOR INSERT
  WITH CHECK (
    organization_id = get_current_org_id()
    AND (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role) OR has_org_role('administrativo'::org_role))
  );

-- 1.4 player_offboarding
CREATE TABLE IF NOT EXISTS public.player_offboarding (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  player_id uuid NOT NULL REFERENCES public.players(id),
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  churn_reason text,
  churn_detail text,
  nps_score integer,
  would_return boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.player_offboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org admins can view offboarding"
  ON public.player_offboarding FOR SELECT
  USING (
    organization_id = get_current_org_id()
    AND (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role))
  );

CREATE POLICY "Org admins can insert offboarding"
  ON public.player_offboarding FOR INSERT
  WITH CHECK (
    organization_id = get_current_org_id()
    AND (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role))
  );

CREATE POLICY "Org admins can update offboarding"
  ON public.player_offboarding FOR UPDATE
  USING (
    organization_id = get_current_org_id()
    AND (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role))
  )
  WITH CHECK (
    organization_id = get_current_org_id()
    AND (has_org_role('org_owner'::org_role) OR has_org_role('director_deportivo'::org_role))
  );

-- 1.5 Add 'outstanding' to attendance_performance_status enum
ALTER TYPE attendance_performance_status ADD VALUE IF NOT EXISTS 'outstanding';

-- Indexes
CREATE INDEX IF NOT EXISTS idx_players_lifecycle ON public.players(organization_id, lifecycle_status);
CREATE INDEX IF NOT EXISTS idx_players_billing ON public.players(organization_id, billing_status);
CREATE INDEX IF NOT EXISTS idx_lifecycle_log_player ON public.player_lifecycle_log(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_events_player ON public.billing_events_log(player_id, created_at DESC);

-- =====================================================
-- BLOQUE 2: Triggers / Functions
-- =====================================================

-- 2.1 Trigger: onboarding when intake_request completed
CREATE OR REPLACE FUNCTION public.handle_intake_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  -- Only fire when status changes to 'completed' and player_id is set
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.player_id IS NOT NULL THEN
    -- Update player lifecycle
    UPDATE public.players
    SET lifecycle_status = 'active',
        onboarded_at = COALESCE(onboarded_at, now()),
        updated_at = now()
    WHERE id = NEW.player_id
      AND lifecycle_status != 'active';

    -- Log the event
    INSERT INTO public.player_lifecycle_log (organization_id, player_id, from_status, to_status, event_type)
    SELECT NEW.organization_id, NEW.player_id, p.lifecycle_status, 'active', 'onboard'
    FROM public.players p WHERE p.id = NEW.player_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_intake_onboarding ON public.intake_requests;
CREATE TRIGGER trg_intake_onboarding
  AFTER UPDATE ON public.intake_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_intake_onboarding();

-- 2.2 Trigger: payment recorded -> update billing_status
CREATE OR REPLACE FUNCTION public.handle_payment_billing_update()
RETURNS TRIGGER AS $$
DECLARE
  v_month text;
BEGIN
  -- Extract YYYY-MM from payment_month (which is a date)
  v_month := to_char(NEW.payment_month, 'YYYY-MM');

  -- Update player billing status
  UPDATE public.players
  SET billing_status = 'paid_current',
      last_paid_month = v_month,
      updated_at = now()
  WHERE id = NEW.player_id;

  -- Log billing events
  INSERT INTO public.billing_events_log (organization_id, player_id, event_type, meta)
  VALUES
    (NEW.organization_id, NEW.player_id, 'payment_recorded', jsonb_build_object('amount', NEW.amount, 'month', v_month, 'payment_id', NEW.id)),
    (NEW.organization_id, NEW.player_id, 'set_paid_current', jsonb_build_object('month', v_month));

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_payment_billing ON public.payments;
CREATE TRIGGER trg_payment_billing
  AFTER INSERT ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_payment_billing_update();

-- 2.3 SQL function for billing overdue check (called by edge function)
CREATE OR REPLACE FUNCTION public.check_billing_overdue()
RETURNS integer AS $$
DECLARE
  v_current_month text := to_char(now(), 'YYYY-MM');
  v_prev_month text := to_char(now() - interval '1 month', 'YYYY-MM');
  v_two_months_ago text := to_char(now() - interval '2 months', 'YYYY-MM');
  v_affected integer := 0;
  v_player RECORD;
BEGIN
  -- Set overdue_1 for players whose last paid month is previous month
  UPDATE public.players
  SET billing_status = 'overdue_1', updated_at = now()
  WHERE is_active = true
    AND lifecycle_status = 'active'
    AND last_paid_month = v_prev_month
    AND billing_status != 'overdue_1';

  -- Log overdue_1 events
  INSERT INTO public.billing_events_log (organization_id, player_id, event_type, meta)
  SELECT organization_id, id, 'set_overdue_1', jsonb_build_object('last_paid', last_paid_month, 'checked_at', now())
  FROM public.players
  WHERE is_active = true
    AND lifecycle_status = 'active'
    AND billing_status = 'overdue_1'
    AND last_paid_month = v_prev_month;

  -- Handle overdue_2 + auto deactivation
  FOR v_player IN
    SELECT id, organization_id, last_paid_month
    FROM public.players
    WHERE is_active = true
      AND lifecycle_status = 'active'
      AND (last_paid_month <= v_two_months_ago OR last_paid_month IS NULL)
      AND billing_status NOT IN ('overdue_2', 'suspended')
  LOOP
    -- Update player
    UPDATE public.players
    SET billing_status = 'overdue_2',
        lifecycle_status = 'inactive',
        offboarded_at = now(),
        updated_at = now()
    WHERE id = v_player.id;

    -- Billing log
    INSERT INTO public.billing_events_log (organization_id, player_id, event_type, meta)
    VALUES
      (v_player.organization_id, v_player.id, 'set_overdue_2', jsonb_build_object('last_paid', v_player.last_paid_month)),
      (v_player.organization_id, v_player.id, 'auto_suspended', jsonb_build_object('reason', 'two_months_overdue'));

    -- Lifecycle log
    INSERT INTO public.player_lifecycle_log (organization_id, player_id, from_status, to_status, event_type, reason)
    VALUES (v_player.organization_id, v_player.id, 'active', 'inactive', 'auto_deactivate', 'Two months without payment');

    -- Create offboarding record if not exists
    INSERT INTO public.player_offboarding (organization_id, player_id)
    SELECT v_player.organization_id, v_player.id
    WHERE NOT EXISTS (
      SELECT 1 FROM public.player_offboarding
      WHERE player_id = v_player.id AND completed_at IS NULL
    );

    v_affected := v_affected + 1;
  END LOOP;

  RETURN v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
