-- =====================================================
-- STRYK WAY - PHASE 1 MIGRATION
-- Feature Flags + Studio Tables + Audit + Progress Engine
-- =====================================================

-- 1. FEATURE FLAGS EN ORGANIZATIONS
ALTER TABLE public.organizations
ADD COLUMN IF NOT EXISTS feature_stryk_way_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_portal_familiar_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_studio_pro_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS feature_analytics_enabled boolean NOT NULL DEFAULT false;

-- 2. STRYK PACKS (contenedor de configuración)
CREATE TABLE IF NOT EXISTS public.stryk_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Core Pack',
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id),
  UNIQUE(organization_id, name, version)
);

-- 3. STRYK RULESETS (reglas de XP, caps, multiplicadores)
CREATE TABLE IF NOT EXISTS public.stryk_rulesets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pack_id uuid NOT NULL REFERENCES public.stryk_packs(id) ON DELETE CASCADE,
  economy jsonb NOT NULL DEFAULT '{
    "xp_per_attendance": 10,
    "xp_per_goal": 25,
    "xp_per_assist": 15,
    "xp_per_match_present": 20,
    "xp_per_level": 100
  }'::jsonb,
  caps jsonb NOT NULL DEFAULT '{
    "daily_xp_cap": 100,
    "weekly_xp_cap": 500,
    "daily_attendance_cap": 2
  }'::jsonb,
  multipliers jsonb NOT NULL DEFAULT '{
    "amistoso": 1.0,
    "liga": 1.5,
    "eliminacion": 2.0,
    "campeonato": 2.5
  }'::jsonb,
  ovr_weights jsonb NOT NULL DEFAULT '{
    "tecnica": 0.25,
    "tactica": 0.20,
    "fisica": 0.20,
    "mental": 0.15,
    "social": 0.10,
    "disciplina": 0.10
  }'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(pack_id)
);

-- 4. STRYK BADGES (logros desbloqueables)
CREATE TABLE IF NOT EXISTS public.stryk_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pack_id uuid NOT NULL REFERENCES public.stryk_packs(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  icon text DEFAULT 'trophy',
  rarity text NOT NULL DEFAULT 'common' CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  criteria jsonb NOT NULL DEFAULT '{"type": "attendance_count", "threshold": 10}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, pack_id, key)
);

-- 5. STRYK CHALLENGES (retos temporales)
CREATE TABLE IF NOT EXISTS public.stryk_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  pack_id uuid NOT NULL REFERENCES public.stryk_packs(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  description text,
  xp_reward integer NOT NULL DEFAULT 50,
  criteria jsonb NOT NULL DEFAULT '{"type": "weekly_attendance", "threshold": 3}'::jsonb,
  start_at timestamptz,
  end_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, pack_id, key)
);

-- 6. STRYK AUDIT LOGS (trazabilidad)
CREATE TABLE IF NOT EXISTS public.stryk_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. STRYK EVENTS (ledger de progreso - inmutable)
CREATE TABLE IF NOT EXISTS public.stryk_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  source_type text NOT NULL CHECK (source_type IN ('attendance', 'match', 'manual', 'challenge')),
  source_id uuid NOT NULL,
  xp_delta integer NOT NULL DEFAULT 0,
  attributes_delta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, source_type, source_id, player_id)
);

-- 8. PLAYER PROGRESS (estado agregado - mutable)
CREATE TABLE IF NOT EXISTS public.player_progress (
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  xp_total integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  streak integer NOT NULL DEFAULT 0,
  ovr integer NOT NULL DEFAULT 50,
  radar jsonb NOT NULL DEFAULT '{
    "tecnica": 50,
    "tactica": 50,
    "fisica": 50,
    "mental": 50,
    "social": 50,
    "disciplina": 50
  }'::jsonb,
  last_event_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(organization_id, player_id)
);

-- 9. PLAYER BADGES (badges ganados)
CREATE TABLE IF NOT EXISTS public.player_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  badge_id uuid NOT NULL REFERENCES public.stryk_badges(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, badge_id)
);

-- 10. TUTOR AUTH TOKENS (login de tutores sin ser usuario Supabase)
CREATE TABLE IF NOT EXISTS public.tutor_auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  guardian_id uuid NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  token_hash text NOT NULL,
  pin_hash text,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

-- =====================================================
-- INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_stryk_packs_org_status ON public.stryk_packs(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_stryk_badges_pack ON public.stryk_badges(pack_id, is_active);
CREATE INDEX IF NOT EXISTS idx_stryk_challenges_pack ON public.stryk_challenges(pack_id, is_active);
CREATE INDEX IF NOT EXISTS idx_stryk_audit_org_date ON public.stryk_audit_logs(organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stryk_events_player_date ON public.stryk_events(organization_id, player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stryk_events_source ON public.stryk_events(organization_id, source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_player_progress_xp ON public.player_progress(organization_id, xp_total DESC);
CREATE INDEX IF NOT EXISTS idx_player_badges_player ON public.player_badges(player_id, earned_at DESC);
CREATE INDEX IF NOT EXISTS idx_tutor_auth_tokens_hash ON public.tutor_auth_tokens(token_hash);

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.stryk_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stryk_rulesets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stryk_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stryk_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stryk_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stryk_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tutor_auth_tokens ENABLE ROW LEVEL SECURITY;

-- STRYK PACKS: Admins can CRUD, trainers can read published
CREATE POLICY "Admins can manage packs"
ON public.stryk_packs FOR ALL
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
)
WITH CHECK (
  organization_id = get_current_org_id()
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
);

CREATE POLICY "Org users can view published packs"
ON public.stryk_packs FOR SELECT
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND (status = 'published' OR has_org_role('org_owner') OR has_org_role('director_deportivo'))
);

-- STRYK RULESETS: Same pattern
CREATE POLICY "Admins can manage rulesets"
ON public.stryk_rulesets FOR ALL
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
)
WITH CHECK (
  organization_id = get_current_org_id()
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
);

CREATE POLICY "Org users can view rulesets"
ON public.stryk_rulesets FOR SELECT
TO authenticated
USING (organization_id = get_current_org_id());

-- STRYK BADGES: Admins CRUD, all org users read active
CREATE POLICY "Admins can manage badges"
ON public.stryk_badges FOR ALL
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
)
WITH CHECK (
  organization_id = get_current_org_id()
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
);

CREATE POLICY "Org users can view badges"
ON public.stryk_badges FOR SELECT
TO authenticated
USING (organization_id = get_current_org_id());

-- STRYK CHALLENGES: Same as badges
CREATE POLICY "Admins can manage challenges"
ON public.stryk_challenges FOR ALL
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
)
WITH CHECK (
  organization_id = get_current_org_id()
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
);

CREATE POLICY "Org users can view challenges"
ON public.stryk_challenges FOR SELECT
TO authenticated
USING (organization_id = get_current_org_id());

-- STRYK AUDIT LOGS: Admins view only, system inserts
CREATE POLICY "Admins can view audit logs"
ON public.stryk_audit_logs FOR SELECT
TO authenticated
USING (
  organization_id = get_current_org_id()
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
);

CREATE POLICY "Org users can insert audit logs"
ON public.stryk_audit_logs FOR INSERT
TO authenticated
WITH CHECK (organization_id = get_current_org_id());

-- STRYK EVENTS: Org users view, system inserts
CREATE POLICY "Org users can view events"
ON public.stryk_events FOR SELECT
TO authenticated
USING (organization_id = get_current_org_id());

CREATE POLICY "Org users can insert events"
ON public.stryk_events FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = get_current_org_id()
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo') OR has_org_role('entrenador'))
);

-- PLAYER PROGRESS: Org users view, system manages
CREATE POLICY "Org users can view progress"
ON public.player_progress FOR SELECT
TO authenticated
USING (organization_id = get_current_org_id());

CREATE POLICY "Org users can manage progress"
ON public.player_progress FOR ALL
TO authenticated
USING (organization_id = get_current_org_id())
WITH CHECK (organization_id = get_current_org_id());

-- PLAYER BADGES: Org users view, system manages
CREATE POLICY "Org users can view player badges"
ON public.player_badges FOR SELECT
TO authenticated
USING (organization_id = get_current_org_id());

CREATE POLICY "Org users can manage player badges"
ON public.player_badges FOR ALL
TO authenticated
USING (organization_id = get_current_org_id())
WITH CHECK (organization_id = get_current_org_id());

-- TUTOR AUTH TOKENS: Service role only
CREATE POLICY "Service role manages tutor tokens"
ON public.tutor_auth_tokens FOR ALL
USING (false)
WITH CHECK (false);

-- =====================================================
-- PROGRESS ENGINE FUNCTION (Trigger on attendance)
-- =====================================================
CREATE OR REPLACE FUNCTION public.process_attendance_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ruleset record;
  v_xp_delta integer;
  v_daily_xp integer;
  v_daily_cap integer;
  v_stryk_enabled boolean;
BEGIN
  -- Only process 'presente' status
  IF NEW.status != 'presente' THEN
    RETURN NEW;
  END IF;

  -- Check if STRYK Way is enabled for the organization
  SELECT feature_stryk_way_enabled INTO v_stryk_enabled
  FROM organizations
  WHERE id = NEW.organization_id;

  IF NOT COALESCE(v_stryk_enabled, false) THEN
    RETURN NEW;
  END IF;

  -- Get published ruleset for org
  SELECT rs.economy, rs.caps INTO v_ruleset
  FROM stryk_packs p
  JOIN stryk_rulesets rs ON rs.pack_id = p.id
  WHERE p.organization_id = NEW.organization_id
    AND p.status = 'published'
  LIMIT 1;

  -- If no STRYK Way configured, skip
  IF v_ruleset IS NULL THEN
    RETURN NEW;
  END IF;

  -- Calculate XP
  v_xp_delta := COALESCE((v_ruleset.economy->>'xp_per_attendance')::integer, 10);
  v_daily_cap := COALESCE((v_ruleset.caps->>'daily_xp_cap')::integer, 100);

  -- Check daily cap
  SELECT COALESCE(SUM(xp_delta), 0) INTO v_daily_xp
  FROM stryk_events
  WHERE organization_id = NEW.organization_id
    AND player_id = NEW.player_id
    AND created_at::date = NEW.date;

  IF v_daily_xp + v_xp_delta > v_daily_cap THEN
    v_xp_delta := GREATEST(0, v_daily_cap - v_daily_xp);
  END IF;

  -- Skip if no XP to award
  IF v_xp_delta <= 0 THEN
    RETURN NEW;
  END IF;

  -- Insert event (dedupe via UNIQUE constraint)
  INSERT INTO stryk_events (
    organization_id, player_id, source_type, source_id, xp_delta, created_by
  ) VALUES (
    NEW.organization_id, NEW.player_id, 'attendance', NEW.id, v_xp_delta, NEW.recorded_by
  )
  ON CONFLICT (organization_id, source_type, source_id, player_id) DO NOTHING;

  -- Update progress
  INSERT INTO player_progress (organization_id, player_id, xp_total, level, last_event_at)
  VALUES (
    NEW.organization_id, 
    NEW.player_id, 
    v_xp_delta,
    GREATEST(1, v_xp_delta / 100 + 1),
    now()
  )
  ON CONFLICT (organization_id, player_id) DO UPDATE SET
    xp_total = player_progress.xp_total + v_xp_delta,
    level = GREATEST(1, (player_progress.xp_total + v_xp_delta) / 100 + 1),
    last_event_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Trigger on attendance insert/update
DROP TRIGGER IF EXISTS trigger_attendance_xp ON public.attendance;
CREATE TRIGGER trigger_attendance_xp
AFTER INSERT OR UPDATE OF status ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.process_attendance_xp();