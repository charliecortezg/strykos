
-- =============================================
-- FASE 1A: Tabla membership_blocks
-- =============================================
CREATE TABLE public.membership_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  sequence_order integer NOT NULL,
  duration_months integer NOT NULL,
  min_evaluations integer NOT NULL DEFAULT 3,
  min_attendance_pct integer NOT NULL DEFAULT 60,
  min_xp integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Unique constraint: one code per org (or global)
CREATE UNIQUE INDEX idx_membership_blocks_org_code 
  ON public.membership_blocks (COALESCE(org_id, '00000000-0000-0000-0000-000000000000'::uuid), code);

ALTER TABLE public.membership_blocks ENABLE ROW LEVEL SECURITY;

-- SELECT: authenticated users can see global defaults OR their org's blocks
CREATE POLICY "Users can view membership blocks"
  ON public.membership_blocks FOR SELECT
  USING (
    org_id IS NULL 
    OR org_id = public.get_current_org_id()
  );

-- INSERT/UPDATE/DELETE: only org_owner or director_deportivo
CREATE POLICY "Admins can manage org membership blocks"
  ON public.membership_blocks FOR ALL
  USING (
    org_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner'::org_role)
      OR public.has_org_role('director_deportivo'::org_role)
    )
  )
  WITH CHECK (
    org_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner'::org_role)
      OR public.has_org_role('director_deportivo'::org_role)
    )
  );

-- Seed global defaults (org_id = NULL)
INSERT INTO public.membership_blocks (org_id, code, name, sequence_order, duration_months, min_evaluations, min_attendance_pct) VALUES
  (NULL, 'FOUNDATION', 'Fundación', 1, 3, 3, 60),
  (NULL, 'DEVELOPMENT', 'Desarrollo', 2, 6, 6, 60),
  (NULL, 'PROJECTION', 'Proyección', 3, 3, 3, 60),
  (NULL, 'CONSOLIDATION', 'Consolidación', 4, 6, 6, 60);

-- =============================================
-- FASE 1B: Nuevos campos en players
-- =============================================
ALTER TABLE public.players
  ADD COLUMN membership_stage text NOT NULL DEFAULT 'none',
  ADD COLUMN block_id uuid REFERENCES public.membership_blocks(id),
  ADD COLUMN block_start_date date,
  ADD COLUMN block_end_date date,
  ADD COLUMN eligible_for_progression boolean NOT NULL DEFAULT false,
  ADD COLUMN last_progression_at timestamptz;

-- =============================================
-- FASE 1C: Nuevo campo en evaluations
-- =============================================
ALTER TABLE public.evaluations
  ADD COLUMN block_id uuid REFERENCES public.membership_blocks(id);

-- =============================================
-- FASE 1D: Tabla membership_progression_log
-- =============================================
CREATE TABLE public.membership_progression_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  from_block_id uuid REFERENCES public.membership_blocks(id),
  to_block_id uuid REFERENCES public.membership_blocks(id),
  action text NOT NULL,
  metrics_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_progression_log_player ON public.membership_progression_log(player_id, created_at DESC);
CREATE INDEX idx_progression_log_org ON public.membership_progression_log(org_id, created_at DESC);

ALTER TABLE public.membership_progression_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view progression logs of their org"
  ON public.membership_progression_log FOR SELECT
  USING (org_id = public.get_current_org_id());

-- =============================================
-- FASE 2A: assign_default_membership_block
-- =============================================
CREATE OR REPLACE FUNCTION public.assign_default_membership_block(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org_id uuid;
  v_block record;
BEGIN
  -- Get player's org
  SELECT organization_id INTO v_org_id FROM players WHERE id = p_player_id;
  IF v_org_id IS NULL THEN RETURN; END IF;

  -- Find FOUNDATION block: org override first, then global
  SELECT * INTO v_block
  FROM membership_blocks
  WHERE code = 'FOUNDATION'
    AND is_active = true
    AND (org_id = v_org_id OR org_id IS NULL)
  ORDER BY org_id NULLS LAST
  LIMIT 1;

  IF v_block.id IS NULL THEN RETURN; END IF;

  -- Update player
  UPDATE players SET
    membership_stage = v_block.code,
    block_id = v_block.id,
    block_start_date = current_date,
    block_end_date = current_date + (v_block.duration_months || ' months')::interval,
    eligible_for_progression = false,
    last_progression_at = NULL
  WHERE id = p_player_id;

  -- Log
  INSERT INTO membership_progression_log (org_id, player_id, from_block_id, to_block_id, action, metrics_snapshot)
  VALUES (v_org_id, p_player_id, NULL, v_block.id, 'ASSIGNED', '{}'::jsonb);
END;
$$;

-- =============================================
-- FASE 2B: Trigger on players INSERT
-- =============================================
CREATE OR REPLACE FUNCTION public.trg_assign_membership_on_player_create()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only for internal active players
  IF COALESCE(NEW.player_type, 'internal') = 'internal' 
     AND COALESCE(NEW.lifecycle_status, 'active') = 'active'
     AND NEW.membership_stage = 'none' THEN
    PERFORM assign_default_membership_block(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_assign_membership_block
  AFTER INSERT ON public.players
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_assign_membership_on_player_create();

-- =============================================
-- FASE 2C: Trigger on evaluations INSERT
-- =============================================
CREATE OR REPLACE FUNCTION public.trg_copy_block_id_to_evaluation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_block_id uuid;
BEGIN
  IF NEW.block_id IS NULL THEN
    SELECT block_id INTO v_block_id FROM players WHERE id = NEW.player_id;
    IF v_block_id IS NOT NULL THEN
      NEW.block_id := v_block_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_copy_block_to_evaluation
  BEFORE INSERT ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_copy_block_id_to_evaluation();

-- =============================================
-- FASE 2D: evaluate_membership_progression RPC
-- =============================================
CREATE OR REPLACE FUNCTION public.evaluate_membership_progression(p_org_id uuid, p_as_of_date date)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_player record;
  v_block record;
  v_next_block record;
  v_eval_count integer;
  v_attendance_total integer;
  v_attendance_present integer;
  v_attendance_pct numeric;
  v_xp_delta integer;
  v_month_key text;
  v_progressed integer := 0;
  v_not_eligible integer := 0;
  v_skipped integer := 0;
BEGIN
  v_month_key := to_char(p_as_of_date, 'YYYY-MM');

  FOR v_player IN
    SELECT p.id, p.block_id, p.block_start_date, p.block_end_date, p.membership_stage
    FROM players p
    WHERE p.organization_id = p_org_id
      AND p.is_active = true
      AND COALESCE(p.lifecycle_status, 'active') = 'active'
      AND p.block_id IS NOT NULL
      AND p.block_end_date IS NOT NULL
      AND p.block_end_date <= p_as_of_date
  LOOP
    -- Idempotency: skip if already processed this block+month
    IF EXISTS (
      SELECT 1 FROM membership_progression_log
      WHERE player_id = v_player.id
        AND to_block_id = v_player.block_id
        AND action IN ('PROGRESSED', 'NOT_ELIGIBLE')
        AND to_char(created_at, 'YYYY-MM') = v_month_key
    ) THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Get current block requirements
    SELECT * INTO v_block FROM membership_blocks WHERE id = v_player.block_id;
    IF v_block.id IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Count evaluations for this block
    SELECT COUNT(*) INTO v_eval_count
    FROM evaluations
    WHERE player_id = v_player.id
      AND block_id = v_player.block_id
      AND status = 'closed';

    -- Calculate attendance percentage in block range
    SELECT COUNT(*) INTO v_attendance_total
    FROM attendance
    WHERE player_id = v_player.id
      AND organization_id = p_org_id
      AND date >= v_player.block_start_date
      AND date <= v_player.block_end_date;

    SELECT COUNT(*) INTO v_attendance_present
    FROM attendance
    WHERE player_id = v_player.id
      AND organization_id = p_org_id
      AND date >= v_player.block_start_date
      AND date <= v_player.block_end_date
      AND status = 'presente';

    IF v_attendance_total > 0 THEN
      v_attendance_pct := (v_attendance_present::numeric / v_attendance_total::numeric) * 100;
    ELSE
      v_attendance_pct := 0;
    END IF;

    -- XP delta in block range
    SELECT COALESCE(SUM(xp_delta), 0) INTO v_xp_delta
    FROM stryk_events
    WHERE player_id = v_player.id
      AND organization_id = p_org_id
      AND created_at >= v_player.block_start_date
      AND created_at < (v_player.block_end_date + interval '1 day');

    -- Check criteria
    IF v_eval_count >= v_block.min_evaluations
       AND v_attendance_pct >= v_block.min_attendance_pct
       AND (v_block.min_xp IS NULL OR v_xp_delta >= v_block.min_xp) THEN

      -- Find next block
      SELECT * INTO v_next_block
      FROM membership_blocks
      WHERE (org_id = p_org_id OR org_id IS NULL)
        AND sequence_order = v_block.sequence_order + 1
        AND is_active = true
      ORDER BY org_id NULLS LAST
      LIMIT 1;

      IF v_next_block.id IS NOT NULL THEN
        -- Progress player
        UPDATE players SET
          membership_stage = v_next_block.code,
          block_id = v_next_block.id,
          block_start_date = p_as_of_date,
          block_end_date = p_as_of_date + (v_next_block.duration_months || ' months')::interval,
          eligible_for_progression = false,
          last_progression_at = now()
        WHERE id = v_player.id;

        -- Log PROGRESSED
        INSERT INTO membership_progression_log (org_id, player_id, from_block_id, to_block_id, action, metrics_snapshot)
        VALUES (p_org_id, v_player.id, v_player.block_id, v_next_block.id, 'PROGRESSED',
          jsonb_build_object('eval_count', v_eval_count, 'attendance_pct', round(v_attendance_pct, 1), 'xp_delta', v_xp_delta));

        -- XP bonus via stryk_events
        INSERT INTO stryk_events (organization_id, player_id, source_type, source_id, xp_delta, created_by)
        VALUES (p_org_id, v_player.id, 'block_progression', v_next_block.id, 50, NULL)
        ON CONFLICT (organization_id, source_type, source_id, player_id) DO NOTHING;

        -- Update player_progress with bonus XP
        INSERT INTO player_progress (organization_id, player_id, xp_total, level, last_event_at)
        VALUES (p_org_id, v_player.id, 50, 1, now())
        ON CONFLICT (organization_id, player_id) DO UPDATE SET
          xp_total = player_progress.xp_total + 50,
          level = GREATEST(1, (player_progress.xp_total + 50) / 100 + 1),
          last_event_at = now(),
          updated_at = now();

        -- Coach notification
        INSERT INTO coach_notifications (organization_id, user_id, type, payload)
        SELECT p_org_id, c.trainer_id, 'block_progression',
          jsonb_build_object('player_id', v_player.id, 'from_block', v_block.name, 'to_block', v_next_block.name)
        FROM categories c
        JOIN players pl ON pl.category_id = c.id
        WHERE pl.id = v_player.id AND c.trainer_id IS NOT NULL;

        v_progressed := v_progressed + 1;
      ELSE
        -- Already at last block (CONSOLIDATION complete)
        v_skipped := v_skipped + 1;
      END IF;

    ELSE
      -- NOT ELIGIBLE
      INSERT INTO membership_progression_log (org_id, player_id, from_block_id, to_block_id, action, metrics_snapshot)
      VALUES (p_org_id, v_player.id, v_player.block_id, v_player.block_id, 'NOT_ELIGIBLE',
        jsonb_build_object('eval_count', v_eval_count, 'min_evals', v_block.min_evaluations,
          'attendance_pct', round(v_attendance_pct, 1), 'min_attendance', v_block.min_attendance_pct,
          'xp_delta', v_xp_delta, 'min_xp', v_block.min_xp));

      -- Notify coach
      INSERT INTO coach_notifications (organization_id, user_id, type, payload)
      SELECT p_org_id, c.trainer_id, 'block_not_eligible',
        jsonb_build_object('player_id', v_player.id, 'block', v_block.name,
          'eval_count', v_eval_count, 'attendance_pct', round(v_attendance_pct, 1))
      FROM categories c
      JOIN players pl ON pl.category_id = c.id
      WHERE pl.id = v_player.id AND c.trainer_id IS NOT NULL;

      v_not_eligible := v_not_eligible + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('progressed', v_progressed, 'not_eligible', v_not_eligible, 'skipped', v_skipped);
END;
$$;

-- =============================================
-- FASE 2E: Trigger lifecycle_status changes
-- =============================================
CREATE OR REPLACE FUNCTION public.trg_membership_lifecycle_reset()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When reactivating from inactive
  IF OLD.lifecycle_status = 'inactive' AND NEW.lifecycle_status = 'active' THEN
    PERFORM assign_default_membership_block(NEW.id);
    
    INSERT INTO membership_progression_log (org_id, player_id, from_block_id, to_block_id, action, metrics_snapshot)
    VALUES (NEW.organization_id, NEW.id, OLD.block_id, NEW.block_id, 'RESTART_AFTER_INACTIVE', '{}'::jsonb);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_membership_lifecycle_reset
  AFTER UPDATE OF lifecycle_status ON public.players
  FOR EACH ROW
  WHEN (OLD.lifecycle_status IS DISTINCT FROM NEW.lifecycle_status)
  EXECUTE FUNCTION public.trg_membership_lifecycle_reset();

-- =============================================
-- FASE 3: Enable pg_cron and pg_net
-- =============================================
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
