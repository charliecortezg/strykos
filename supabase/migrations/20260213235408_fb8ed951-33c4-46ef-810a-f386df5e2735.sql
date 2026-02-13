
-- =============================================
-- IDP MODULE: Tables, Indexes, RLS, Gating
-- =============================================

-- 1. idp_cycles
CREATE TABLE public.idp_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'active',
  starts_at date NOT NULL,
  ends_at date NOT NULL,
  stage text NOT NULL DEFAULT '0_30',
  initial_evaluation_id uuid REFERENCES public.evaluations(id),
  latest_evaluation_id uuid REFERENCES public.evaluations(id),
  accepted_at timestamptz,
  accepted_by text,
  plan_json jsonb,
  plan_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_idp_cycles_org_player_status ON public.idp_cycles (organization_id, player_id, status);
CREATE INDEX idx_idp_cycles_player_status ON public.idp_cycles (player_id, status);
CREATE INDEX idx_idp_cycles_org_status ON public.idp_cycles (organization_id, status);
CREATE UNIQUE INDEX idx_idp_cycles_one_active_per_player ON public.idp_cycles (player_id) WHERE status = 'active';

CREATE TRIGGER update_idp_cycles_updated_at
  BEFORE UPDATE ON public.idp_cycles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.idp_cycles ENABLE ROW LEVEL SECURITY;

-- RLS: org members can SELECT
CREATE POLICY "Org members can view IDP cycles"
  ON public.idp_cycles FOR SELECT
  USING (organization_id = public.get_current_org_id());

-- RLS: org owners/directors/coaches can INSERT
CREATE POLICY "Staff can create IDP cycles"
  ON public.idp_cycles FOR INSERT
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner'::org_role)
      OR public.has_org_role('director_deportivo'::org_role)
      OR public.has_org_role('entrenador'::org_role)
    )
  );

-- RLS: org staff can UPDATE
CREATE POLICY "Staff can update IDP cycles"
  ON public.idp_cycles FOR UPDATE
  USING (organization_id = public.get_current_org_id())
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner'::org_role)
      OR public.has_org_role('director_deportivo'::org_role)
      OR public.has_org_role('entrenador'::org_role)
    )
  );

-- RLS: portal access via service role (edge functions handle portal auth)

-- 2. idp_focus_areas
CREATE TABLE public.idp_focus_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  idp_cycle_id uuid NOT NULL REFERENCES public.idp_cycles(id) ON DELETE CASCADE,
  stat_key text NOT NULL,
  focus_type text NOT NULL DEFAULT 'strengthen',
  initial_score smallint NOT NULL,
  target_score smallint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_idp_focus_areas_cycle ON public.idp_focus_areas (idp_cycle_id);
CREATE INDEX idx_idp_focus_areas_org_cycle ON public.idp_focus_areas (organization_id, idp_cycle_id);

ALTER TABLE public.idp_focus_areas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view IDP focus areas"
  ON public.idp_focus_areas FOR SELECT
  USING (organization_id = public.get_current_org_id());

CREATE POLICY "Staff can create IDP focus areas"
  ON public.idp_focus_areas FOR INSERT
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner'::org_role)
      OR public.has_org_role('director_deportivo'::org_role)
      OR public.has_org_role('entrenador'::org_role)
    )
  );

-- 3. idp_sessions
CREATE TABLE public.idp_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  idp_cycle_id uuid NOT NULL REFERENCES public.idp_cycles(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  session_number int NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  xp_awarded int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_idp_sessions_org_player ON public.idp_sessions (organization_id, player_id, completed_at DESC);
CREATE UNIQUE INDEX idx_idp_sessions_unique_per_cycle ON public.idp_sessions (idp_cycle_id, session_number);

ALTER TABLE public.idp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org members can view IDP sessions"
  ON public.idp_sessions FOR SELECT
  USING (organization_id = public.get_current_org_id());

CREATE POLICY "Staff can create IDP sessions"
  ON public.idp_sessions FOR INSERT
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner'::org_role)
      OR public.has_org_role('director_deportivo'::org_role)
      OR public.has_org_role('entrenador'::org_role)
    )
  );

-- 4. Extend player_progress with IDP streak fields
ALTER TABLE public.player_progress
  ADD COLUMN IF NOT EXISTS idp_streak_current int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idp_streak_best int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idp_last_session_at timestamptz;

-- 5. Modify evaluate_membership_progression to include IDP gating
CREATE OR REPLACE FUNCTION public.evaluate_membership_progression(p_org_id uuid, p_as_of_date date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
  v_idp_count integer;
  v_idp_sessions integer;
  v_expected_sessions integer;
  v_block_days integer;
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
    -- Idempotency
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

    SELECT * INTO v_block FROM membership_blocks WHERE id = v_player.block_id;
    IF v_block.id IS NULL THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    -- Evaluations count
    SELECT COUNT(*) INTO v_eval_count
    FROM evaluations
    WHERE player_id = v_player.id
      AND block_id = v_player.block_id
      AND status = 'closed';

    -- Attendance
    SELECT COUNT(*) INTO v_attendance_total
    FROM attendance
    WHERE player_id = v_player.id AND organization_id = p_org_id
      AND date >= v_player.block_start_date AND date <= v_player.block_end_date;

    SELECT COUNT(*) INTO v_attendance_present
    FROM attendance
    WHERE player_id = v_player.id AND organization_id = p_org_id
      AND date >= v_player.block_start_date AND date <= v_player.block_end_date
      AND status = 'presente';

    IF v_attendance_total > 0 THEN
      v_attendance_pct := (v_attendance_present::numeric / v_attendance_total::numeric) * 100;
    ELSE
      v_attendance_pct := 0;
    END IF;

    -- XP delta
    SELECT COALESCE(SUM(xp_delta), 0) INTO v_xp_delta
    FROM stryk_events
    WHERE player_id = v_player.id AND organization_id = p_org_id
      AND created_at >= v_player.block_start_date
      AND created_at < (v_player.block_end_date + interval '1 day');

    -- === IDP GATING ===
    SELECT COUNT(*) INTO v_idp_count
    FROM idp_cycles
    WHERE player_id = v_player.id
      AND organization_id = p_org_id
      AND status IN ('active', 'completed')
      AND accepted_at IS NOT NULL;

    IF v_idp_count = 0 THEN
      INSERT INTO membership_progression_log (org_id, player_id, from_block_id, to_block_id, action, metrics_snapshot)
      VALUES (p_org_id, v_player.id, v_player.block_id, v_player.block_id, 'NOT_ELIGIBLE',
        jsonb_build_object('reason', 'no_accepted_idp', 'eval_count', v_eval_count,
          'attendance_pct', round(v_attendance_pct, 1)));
      v_not_eligible := v_not_eligible + 1;
      CONTINUE;
    END IF;

    -- IDP sessions check (4 per 30 days)
    SELECT COUNT(*) INTO v_idp_sessions
    FROM idp_sessions
    WHERE player_id = v_player.id AND organization_id = p_org_id
      AND completed_at >= v_player.block_start_date
      AND completed_at <= v_player.block_end_date;

    v_block_days := GREATEST(1, (LEAST(p_as_of_date, v_player.block_end_date) - v_player.block_start_date));
    v_expected_sessions := GREATEST(1, (v_block_days / 30) * 4);

    IF v_idp_sessions < v_expected_sessions THEN
      INSERT INTO membership_progression_log (org_id, player_id, from_block_id, to_block_id, action, metrics_snapshot)
      VALUES (p_org_id, v_player.id, v_player.block_id, v_player.block_id, 'NOT_ELIGIBLE',
        jsonb_build_object('reason', 'insufficient_idp_sessions',
          'idp_sessions', v_idp_sessions, 'expected', v_expected_sessions));
      v_not_eligible := v_not_eligible + 1;
      CONTINUE;
    END IF;
    -- === END IDP GATING ===

    -- Original criteria check
    IF v_eval_count >= v_block.min_evaluations
       AND v_attendance_pct >= v_block.min_attendance_pct
       AND (v_block.min_xp IS NULL OR v_xp_delta >= v_block.min_xp) THEN

      SELECT * INTO v_next_block
      FROM membership_blocks
      WHERE (org_id = p_org_id OR org_id IS NULL)
        AND sequence_order = v_block.sequence_order + 1
        AND is_active = true
      ORDER BY org_id NULLS LAST
      LIMIT 1;

      IF v_next_block.id IS NOT NULL THEN
        UPDATE players SET
          membership_stage = v_next_block.code,
          block_id = v_next_block.id,
          block_start_date = p_as_of_date,
          block_end_date = p_as_of_date + (v_next_block.duration_months || ' months')::interval,
          eligible_for_progression = false,
          last_progression_at = now()
        WHERE id = v_player.id;

        INSERT INTO membership_progression_log (org_id, player_id, from_block_id, to_block_id, action, metrics_snapshot)
        VALUES (p_org_id, v_player.id, v_player.block_id, v_next_block.id, 'PROGRESSED',
          jsonb_build_object('eval_count', v_eval_count, 'attendance_pct', round(v_attendance_pct, 1),
            'xp_delta', v_xp_delta, 'idp_sessions', v_idp_sessions));

        INSERT INTO stryk_events (organization_id, player_id, source_type, source_id, xp_delta, created_by)
        VALUES (p_org_id, v_player.id, 'block_progression', v_next_block.id, 50, NULL)
        ON CONFLICT (organization_id, source_type, source_id, player_id) DO NOTHING;

        INSERT INTO player_progress (organization_id, player_id, xp_total, level, last_event_at)
        VALUES (p_org_id, v_player.id, 50, 1, now())
        ON CONFLICT (organization_id, player_id) DO UPDATE SET
          xp_total = player_progress.xp_total + 50,
          level = GREATEST(1, (player_progress.xp_total + 50) / 100 + 1),
          last_event_at = now(), updated_at = now();

        INSERT INTO coach_notifications (organization_id, user_id, type, payload)
        SELECT p_org_id, c.trainer_id, 'block_progression',
          jsonb_build_object('player_id', v_player.id, 'from_block', v_block.name, 'to_block', v_next_block.name)
        FROM categories c JOIN players pl ON pl.category_id = c.id
        WHERE pl.id = v_player.id AND c.trainer_id IS NOT NULL;

        v_progressed := v_progressed + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    ELSE
      INSERT INTO membership_progression_log (org_id, player_id, from_block_id, to_block_id, action, metrics_snapshot)
      VALUES (p_org_id, v_player.id, v_player.block_id, v_player.block_id, 'NOT_ELIGIBLE',
        jsonb_build_object('eval_count', v_eval_count, 'min_evals', v_block.min_evaluations,
          'attendance_pct', round(v_attendance_pct, 1), 'min_attendance', v_block.min_attendance_pct,
          'xp_delta', v_xp_delta, 'min_xp', v_block.min_xp,
          'idp_sessions', v_idp_sessions));

      INSERT INTO coach_notifications (organization_id, user_id, type, payload)
      SELECT p_org_id, c.trainer_id, 'block_not_eligible',
        jsonb_build_object('player_id', v_player.id, 'block', v_block.name,
          'eval_count', v_eval_count, 'attendance_pct', round(v_attendance_pct, 1))
      FROM categories c JOIN players pl ON pl.category_id = c.id
      WHERE pl.id = v_player.id AND c.trainer_id IS NOT NULL;

      v_not_eligible := v_not_eligible + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('progressed', v_progressed, 'not_eligible', v_not_eligible, 'skipped', v_skipped);
END;
$function$;
