
-- ============================================================
-- FASE 1: INTEGRIDAD DE DATOS
-- Aditivo. No borra ni altera datos existentes.
-- ============================================================

-- Extensión para distancia de Levenshtein
CREATE EXTENSION IF NOT EXISTS fuzzystrmatch;

-- 1) Columna auxiliar para registrar fusiones
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS merge_note text;

-- 2) Índice único parcial: previene jugadores duplicados activos
--    en la misma org con mismo nombre normalizado + misma fecha de nacimiento.
--    Usa normalize_name (IMMUTABLE) que ya existe.
CREATE UNIQUE INDEX IF NOT EXISTS players_unique_active_name_dob
  ON public.players (organization_id, public.normalize_name(full_name), date_of_birth)
  WHERE lifecycle_status = 'active' AND date_of_birth IS NOT NULL;

-- Índice de apoyo para detección de duplicados (no único)
CREATE INDEX IF NOT EXISTS players_norm_name_idx
  ON public.players (organization_id, public.normalize_name(full_name));

-- ============================================================
-- 3) RPC: get_academy_kpis
-- Fuente ÚNICA de verdad para indicadores del panel del dueño / fundador.
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_academy_kpis(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_month_start date := date_trunc('month', now())::date;
  v_month_end   date := (date_trunc('month', now()) + interval '1 month - 1 day')::date;
  v_current_month text := to_char(now(), 'YYYY-MM');

  v_ingresos_mes numeric := 0;
  v_pendiente numeric := 0;
  v_pct_cobranza numeric := 0;
  v_pct_asistencia numeric := 0;
  v_activos int := 0;
  v_inactivos int := 0;
  v_mora_1 int := 0;
  v_mora_2 int := 0;
  v_nuevos int := 0;
  v_bajas int := 0;

  v_active_billable int := 0;
  v_paid_current int := 0;
  v_att_total int := 0;
  v_att_present int := 0;
BEGIN
  -- Validación de acceso: el usuario debe pertenecer a la org o ser platform admin
  IF NOT (
    public.user_belongs_to_org(p_org_id)
    OR public.is_platform_admin()
    OR EXISTS (SELECT 1 FROM public.user_org_roles WHERE user_id = auth.uid() AND organization_id = p_org_id)
  ) THEN
    RAISE EXCEPTION 'Access denied for organization %', p_org_id;
  END IF;

  -- Jugadores: activos/inactivos y mora (derivada SOLO de billing_status)
  SELECT
    COUNT(*) FILTER (WHERE lifecycle_status = 'active'),
    COUNT(*) FILTER (WHERE lifecycle_status = 'inactive'),
    COUNT(*) FILTER (WHERE lifecycle_status = 'active' AND billing_status = 'overdue_1'),
    COUNT(*) FILTER (WHERE lifecycle_status = 'active' AND billing_status = 'overdue_2'),
    COUNT(*) FILTER (WHERE lifecycle_status = 'active' AND is_scholarship = false),
    COUNT(*) FILTER (WHERE lifecycle_status = 'active' AND is_scholarship = false AND billing_status = 'paid_current' AND last_paid_month = v_current_month)
  INTO v_activos, v_inactivos, v_mora_1, v_mora_2, v_active_billable, v_paid_current
  FROM public.players
  WHERE organization_id = p_org_id;

  -- Nuevos del mes (onboarded_at) y bajas del mes (offboarded_at)
  SELECT
    COUNT(*) FILTER (WHERE onboarded_at::date BETWEEN v_month_start AND v_month_end),
    COUNT(*) FILTER (WHERE offboarded_at::date BETWEEN v_month_start AND v_month_end)
  INTO v_nuevos, v_bajas
  FROM public.players
  WHERE organization_id = p_org_id;

  -- Ingresos del mes
  SELECT COALESCE(SUM(amount), 0)
  INTO v_ingresos_mes
  FROM public.payments
  WHERE organization_id = p_org_id
    AND payment_month >= v_month_start
    AND payment_month <= v_month_end;

  -- Monto pendiente: cuotas mensuales de jugadores activos no becados que NO han pagado el mes corriente
  SELECT COALESCE(SUM(monthly_fee), 0)
  INTO v_pendiente
  FROM public.players
  WHERE organization_id = p_org_id
    AND is_active = true
    AND lifecycle_status = 'active'
    AND is_scholarship = false
    AND (last_paid_month IS NULL OR last_paid_month <> v_current_month);

  -- % de cobranza del mes
  IF v_active_billable > 0 THEN
    v_pct_cobranza := round((v_paid_current::numeric / v_active_billable::numeric) * 100);
  END IF;

  -- % de asistencia del mes
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'presente')
  INTO v_att_total, v_att_present
  FROM public.attendance
  WHERE organization_id = p_org_id
    AND date BETWEEN v_month_start AND v_month_end;

  IF v_att_total > 0 THEN
    v_pct_asistencia := round((v_att_present::numeric / v_att_total::numeric) * 100);
  END IF;

  RETURN jsonb_build_object(
    'ingresos_mes', v_ingresos_mes,
    'monto_pendiente', v_pendiente,
    'pct_cobranza', v_pct_cobranza,
    'pct_asistencia_mes', v_pct_asistencia,
    'jugadores_activos', v_activos,
    'jugadores_inactivos', v_inactivos,
    'mora_1_mes', v_mora_1,
    'mora_2_plus', v_mora_2,
    'nuevos_mes', v_nuevos,
    'bajas_mes', v_bajas,
    'computed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_academy_kpis(uuid) TO authenticated;

-- ============================================================
-- 4) RPC: find_player_duplicates
-- Devuelve pares sospechosos por org (mismo DOB + nombre similar).
-- ============================================================
CREATE OR REPLACE FUNCTION public.find_player_duplicates(p_org_id uuid)
RETURNS TABLE(
  player_a_id uuid,
  player_a_name text,
  player_b_id uuid,
  player_b_name text,
  date_of_birth date,
  category_id uuid,
  distance int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can detect duplicates';
  END IF;

  RETURN QUERY
  SELECT
    a.id, a.full_name,
    b.id, b.full_name,
    a.date_of_birth,
    a.category_id,
    levenshtein(public.normalize_name(a.full_name), public.normalize_name(b.full_name))::int AS distance
  FROM public.players a
  JOIN public.players b
    ON b.organization_id = a.organization_id
   AND b.id > a.id
   AND b.date_of_birth IS NOT NULL
   AND a.date_of_birth = b.date_of_birth
  WHERE a.organization_id = p_org_id
    AND a.date_of_birth IS NOT NULL
    AND levenshtein(public.normalize_name(a.full_name), public.normalize_name(b.full_name)) <= 3
  ORDER BY distance ASC, a.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.find_player_duplicates(uuid) TO authenticated;

-- ============================================================
-- 5) RPC: merge_players
-- Fusión transaccional: re-apunta FKs del duplicado al principal,
-- marca duplicado como inactivo, anota fusión.
-- ============================================================
CREATE OR REPLACE FUNCTION public.merge_players(p_keep_id uuid, p_duplicate_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_org_dup uuid;
  v_moved jsonb := '{}'::jsonb;
  v_n int;
BEGIN
  IF NOT public.is_platform_admin() THEN
    RAISE EXCEPTION 'Only platform admins can merge players';
  END IF;

  IF p_keep_id = p_duplicate_id THEN
    RAISE EXCEPTION 'keep and duplicate must differ';
  END IF;

  SELECT organization_id INTO v_org FROM public.players WHERE id = p_keep_id;
  SELECT organization_id INTO v_org_dup FROM public.players WHERE id = p_duplicate_id;

  IF v_org IS NULL OR v_org_dup IS NULL THEN
    RAISE EXCEPTION 'player not found';
  END IF;
  IF v_org <> v_org_dup THEN
    RAISE EXCEPTION 'players belong to different organizations';
  END IF;

  -- Re-apuntar FKs
  UPDATE public.attendance SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('attendance', v_n);

  UPDATE public.payments SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('payments', v_n);

  UPDATE public.evaluations SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_moved := v_moved || jsonb_build_object('evaluations', v_n);

  UPDATE public.evaluation_event_players SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.match_players SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.match_video_stats SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.matches SET mvp_player_id = p_keep_id WHERE mvp_player_id = p_duplicate_id;
  UPDATE public.billing_events_log SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.idp_cycles SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.idp_monthly_checkins SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.idp_sessions SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.intake_requests SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.membership_progression_log SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.player_lifecycle_log SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.player_monthly_reports SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.player_offboarding SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.stryk_events SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.uniform_blocked_numbers SET player_id = p_keep_id WHERE player_id = p_duplicate_id;
  UPDATE public.exercise_addon_subscriptions SET player_id = p_keep_id WHERE player_id = p_duplicate_id;

  -- Tablas con UNIQUE(player_id, X): mover si no choca, si choca borrar el del duplicado
  -- player_badges UNIQUE(player_id, badge_id)
  INSERT INTO public.player_badges (organization_id, player_id, badge_id, awarded_at)
  SELECT organization_id, p_keep_id, badge_id, awarded_at
  FROM public.player_badges WHERE player_id = p_duplicate_id
  ON CONFLICT DO NOTHING;
  DELETE FROM public.player_badges WHERE player_id = p_duplicate_id;

  -- player_challenges UNIQUE(org, player, challenge)
  INSERT INTO public.player_challenges (organization_id, player_id, challenge_id, progress, completed_at)
  SELECT organization_id, p_keep_id, challenge_id, progress, completed_at
  FROM public.player_challenges WHERE player_id = p_duplicate_id
  ON CONFLICT DO NOTHING;
  DELETE FROM public.player_challenges WHERE player_id = p_duplicate_id;

  -- player_guardians UNIQUE(player_id, guardian_id)
  INSERT INTO public.player_guardians (player_id, guardian_id, is_primary)
  SELECT p_keep_id, guardian_id, is_primary
  FROM public.player_guardians WHERE player_id = p_duplicate_id
  ON CONFLICT (player_id, guardian_id) DO NOTHING;
  DELETE FROM public.player_guardians WHERE player_id = p_duplicate_id;

  -- player_progress UNIQUE(org, player) — sumar XP si el principal ya tiene
  INSERT INTO public.player_progress (organization_id, player_id, xp_total, level, last_event_at)
  SELECT organization_id, p_keep_id, xp_total, level, last_event_at
  FROM public.player_progress WHERE player_id = p_duplicate_id
  ON CONFLICT (organization_id, player_id) DO UPDATE SET
    xp_total = public.player_progress.xp_total + EXCLUDED.xp_total,
    last_event_at = GREATEST(public.player_progress.last_event_at, EXCLUDED.last_event_at),
    updated_at = now();
  DELETE FROM public.player_progress WHERE player_id = p_duplicate_id;

  -- Marcar duplicado como inactivo + nota
  UPDATE public.players
  SET lifecycle_status = 'inactive',
      is_active = false,
      offboarded_at = COALESCE(offboarded_at, now()),
      merge_note = 'fusionado en ' || p_keep_id::text || ' el ' || to_char(now(),'YYYY-MM-DD'),
      updated_at = now()
  WHERE id = p_duplicate_id;

  RETURN jsonb_build_object('success', true, 'kept', p_keep_id, 'merged', p_duplicate_id, 'moved', v_moved);
END;
$$;

GRANT EXECUTE ON FUNCTION public.merge_players(uuid, uuid) TO authenticated;
