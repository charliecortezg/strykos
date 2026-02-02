-- RC-1: Crear trigger de XP para asistencia
DROP TRIGGER IF EXISTS trigger_attendance_xp ON public.attendance;
CREATE TRIGGER trigger_attendance_xp
AFTER INSERT OR UPDATE OF status ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.process_attendance_xp();

-- RC-2: Procesar asistencias retroactivas
-- Insertar eventos para todas las asistencias "presente" existentes
INSERT INTO public.stryk_events (
  organization_id,
  player_id,
  source_type,
  source_id,
  xp_delta,
  created_by,
  created_at
)
SELECT 
  a.organization_id,
  a.player_id,
  'attendance',
  a.id,
  10, -- XP por asistencia default
  a.recorded_by,
  a.created_at
FROM public.attendance a
WHERE a.status = 'presente'
  AND NOT EXISTS (
    SELECT 1 FROM public.stryk_events se 
    WHERE se.source_id = a.id 
      AND se.source_type = 'attendance'
      AND se.player_id = a.player_id
  );

-- Actualizar/crear player_progress basado en stryk_events
INSERT INTO public.player_progress (
  organization_id,
  player_id,
  xp_total,
  level,
  streak,
  ovr,
  radar,
  last_event_at,
  updated_at
)
SELECT 
  se.organization_id,
  se.player_id,
  SUM(se.xp_delta)::integer as xp_total,
  GREATEST(1, (SUM(se.xp_delta) / 100)::integer + 1) as level,
  0 as streak,
  50 as ovr,
  '{"tecnica": 50, "tactica": 50, "fisica": 50, "mental": 50, "social": 50, "disciplina": 50}'::jsonb as radar,
  MAX(se.created_at) as last_event_at,
  now() as updated_at
FROM public.stryk_events se
GROUP BY se.organization_id, se.player_id
ON CONFLICT (organization_id, player_id) DO UPDATE SET
  xp_total = EXCLUDED.xp_total,
  level = EXCLUDED.level,
  last_event_at = EXCLUDED.last_event_at,
  updated_at = now();

-- RC-3: Función para evaluar y otorgar badges automáticamente
CREATE OR REPLACE FUNCTION public.evaluate_player_badges()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_badge RECORD;
  v_progress RECORD;
  v_count INTEGER;
  v_stryk_enabled BOOLEAN;
BEGIN
  -- Check if STRYK Way is enabled
  SELECT feature_stryk_way_enabled INTO v_stryk_enabled
  FROM organizations
  WHERE id = NEW.organization_id;

  IF NOT COALESCE(v_stryk_enabled, false) THEN
    RETURN NEW;
  END IF;

  -- Get player progress
  SELECT * INTO v_progress
  FROM player_progress
  WHERE organization_id = NEW.organization_id
    AND player_id = NEW.player_id;

  IF v_progress IS NULL THEN
    RETURN NEW;
  END IF;

  -- Iterate through active badges
  FOR v_badge IN
    SELECT b.* 
    FROM stryk_badges b
    JOIN stryk_packs p ON p.id = b.pack_id
    WHERE b.organization_id = NEW.organization_id
      AND b.is_active = true
      AND p.status = 'published'
      AND NOT EXISTS (
        SELECT 1 FROM player_badges pb
        WHERE pb.organization_id = NEW.organization_id
          AND pb.player_id = NEW.player_id
          AND pb.badge_id = b.id
      )
  LOOP
    -- Evaluate criteria
    CASE (v_badge.criteria->>'type')
      WHEN 'attendance_count' THEN
        SELECT COUNT(*) INTO v_count
        FROM attendance
        WHERE organization_id = NEW.organization_id
          AND player_id = NEW.player_id
          AND status = 'presente';
        
        IF v_count >= (v_badge.criteria->>'threshold')::integer THEN
          INSERT INTO player_badges (organization_id, player_id, badge_id)
          VALUES (NEW.organization_id, NEW.player_id, v_badge.id)
          ON CONFLICT DO NOTHING;
        END IF;

      WHEN 'level_reached' THEN
        IF v_progress.level >= (v_badge.criteria->>'threshold')::integer THEN
          INSERT INTO player_badges (organization_id, player_id, badge_id)
          VALUES (NEW.organization_id, NEW.player_id, v_badge.id)
          ON CONFLICT DO NOTHING;
        END IF;

      WHEN 'streak' THEN
        IF v_progress.streak >= (v_badge.criteria->>'threshold')::integer THEN
          INSERT INTO player_badges (organization_id, player_id, badge_id)
          VALUES (NEW.organization_id, NEW.player_id, v_badge.id)
          ON CONFLICT DO NOTHING;
        END IF;

      WHEN 'goals_total' THEN
        SELECT COALESCE(SUM(goals), 0) INTO v_count
        FROM match_players
        WHERE organization_id = NEW.organization_id
          AND player_id = NEW.player_id;
        
        IF v_count >= (v_badge.criteria->>'threshold')::integer THEN
          INSERT INTO player_badges (organization_id, player_id, badge_id)
          VALUES (NEW.organization_id, NEW.player_id, v_badge.id)
          ON CONFLICT DO NOTHING;
        END IF;

      WHEN 'matches_played' THEN
        SELECT COUNT(*) INTO v_count
        FROM match_players
        WHERE organization_id = NEW.organization_id
          AND player_id = NEW.player_id
          AND attended = true;
        
        IF v_count >= (v_badge.criteria->>'threshold')::integer THEN
          INSERT INTO player_badges (organization_id, player_id, badge_id)
          VALUES (NEW.organization_id, NEW.player_id, v_badge.id)
          ON CONFLICT DO NOTHING;
        END IF;

      ELSE
        -- Unknown criteria type, skip
        NULL;
    END CASE;
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger para evaluar badges después de actualizar progreso
DROP TRIGGER IF EXISTS trigger_evaluate_badges ON public.player_progress;
CREATE TRIGGER trigger_evaluate_badges
AFTER INSERT OR UPDATE ON public.player_progress
FOR EACH ROW
EXECUTE FUNCTION public.evaluate_player_badges();

-- RC-4: Función para actualizar progreso de challenges
CREATE OR REPLACE FUNCTION public.update_challenge_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_challenge RECORD;
  v_count INTEGER;
  v_week_start DATE;
  v_month_start DATE;
  v_stryk_enabled BOOLEAN;
BEGIN
  -- Check if STRYK Way is enabled
  SELECT feature_stryk_way_enabled INTO v_stryk_enabled
  FROM organizations
  WHERE id = NEW.organization_id;

  IF NOT COALESCE(v_stryk_enabled, false) THEN
    RETURN NEW;
  END IF;

  -- Calculate date ranges
  v_week_start := date_trunc('week', CURRENT_DATE)::date;
  v_month_start := date_trunc('month', CURRENT_DATE)::date;

  -- Iterate through active challenges
  FOR v_challenge IN
    SELECT c.* 
    FROM stryk_challenges c
    JOIN stryk_packs p ON p.id = c.pack_id
    WHERE c.organization_id = NEW.organization_id
      AND c.is_active = true
      AND p.status = 'published'
      AND (c.start_at IS NULL OR c.start_at <= now())
      AND (c.end_at IS NULL OR c.end_at >= now())
  LOOP
    -- Calculate progress based on criteria type
    CASE (v_challenge.criteria->>'type')
      WHEN 'weekly_attendance' THEN
        SELECT COUNT(*) INTO v_count
        FROM attendance
        WHERE organization_id = NEW.organization_id
          AND player_id = NEW.player_id
          AND status = 'presente'
          AND date >= v_week_start;

      WHEN 'monthly_attendance' THEN
        SELECT COUNT(*) INTO v_count
        FROM attendance
        WHERE organization_id = NEW.organization_id
          AND player_id = NEW.player_id
          AND status = 'presente'
          AND date >= v_month_start;

      WHEN 'goals_total' THEN
        SELECT COALESCE(SUM(goals), 0) INTO v_count
        FROM match_players
        WHERE organization_id = NEW.organization_id
          AND player_id = NEW.player_id;

      WHEN 'matches_played' THEN
        SELECT COUNT(*) INTO v_count
        FROM match_players
        WHERE organization_id = NEW.organization_id
          AND player_id = NEW.player_id
          AND attended = true;

      ELSE
        v_count := 0;
    END CASE;

    -- Upsert player challenge progress
    INSERT INTO player_challenges (
      organization_id,
      player_id,
      challenge_id,
      progress,
      completed_at
    )
    VALUES (
      NEW.organization_id,
      NEW.player_id,
      v_challenge.id,
      v_count,
      CASE WHEN v_count >= (v_challenge.criteria->>'threshold')::integer THEN now() ELSE NULL END
    )
    ON CONFLICT (organization_id, player_id, challenge_id) DO UPDATE SET
      progress = EXCLUDED.progress,
      completed_at = CASE 
        WHEN player_challenges.completed_at IS NULL AND EXCLUDED.progress >= (v_challenge.criteria->>'threshold')::integer 
        THEN now() 
        ELSE player_challenges.completed_at 
      END,
      updated_at = now();
  END LOOP;

  RETURN NEW;
END;
$$;

-- Trigger para actualizar challenges después de progreso
DROP TRIGGER IF EXISTS trigger_update_challenges ON public.player_progress;
CREATE TRIGGER trigger_update_challenges
AFTER INSERT OR UPDATE ON public.player_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_challenge_progress();

-- Añadir constraint único para player_challenges si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'player_challenges_org_player_challenge_unique'
  ) THEN
    ALTER TABLE public.player_challenges
    ADD CONSTRAINT player_challenges_org_player_challenge_unique 
    UNIQUE (organization_id, player_id, challenge_id);
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Ejecutar evaluación inicial de badges para jugadores con progreso
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT organization_id, player_id FROM player_progress
  LOOP
    -- Trigger manual evaluation by updating the row
    UPDATE player_progress 
    SET updated_at = now() 
    WHERE organization_id = r.organization_id 
      AND player_id = r.player_id;
  END LOOP;
END $$;