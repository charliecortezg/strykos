
-- 1. Add mvp_player_id to matches
ALTER TABLE public.matches
ADD COLUMN mvp_player_id uuid REFERENCES public.players(id) ON DELETE SET NULL;

-- 2. Add performance to match_players
ALTER TABLE public.match_players
ADD COLUMN performance text DEFAULT 'excellent';

-- 3. Create trigger function for match performance XP + MVP XP
CREATE OR REPLACE FUNCTION public.process_match_performance_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_mp record;
  v_xp_base integer := 30;
  v_xp_delta integer;
  v_perf_multiplier numeric;
  v_daily_cap integer;
  v_daily_xp integer;
  v_stryk_enabled boolean;
  v_ruleset record;
BEGIN
  -- Only process when status changes to 'terminado'
  IF NEW.status != 'terminado' OR (OLD.status = 'terminado' AND NEW.status = 'terminado') THEN
    RETURN NEW;
  END IF;

  -- Check if STRYK Way is enabled
  SELECT feature_stryk_way_enabled INTO v_stryk_enabled
  FROM organizations WHERE id = NEW.organization_id;

  IF NOT COALESCE(v_stryk_enabled, false) THEN
    RETURN NEW;
  END IF;

  -- Get ruleset for XP config
  SELECT rs.economy, rs.caps INTO v_ruleset
  FROM stryk_packs p
  JOIN stryk_rulesets rs ON rs.pack_id = p.id
  WHERE p.organization_id = NEW.organization_id
    AND p.status = 'published'
  LIMIT 1;

  IF v_ruleset IS NOT NULL THEN
    v_xp_base := COALESCE((v_ruleset.economy->>'xp_per_match')::integer, 30);
    v_daily_cap := COALESCE((v_ruleset.caps->>'daily_xp_cap')::integer, 100);
  ELSE
    v_daily_cap := 100;
  END IF;

  -- Process each match_player with attended = true
  FOR v_mp IN
    SELECT mp.player_id, mp.performance
    FROM match_players mp
    WHERE mp.match_id = NEW.id
      AND mp.organization_id = NEW.organization_id
      AND mp.attended = true
  LOOP
    -- Determine performance multiplier
    CASE COALESCE(v_mp.performance, 'excellent')
      WHEN 'outstanding' THEN v_perf_multiplier := 1.5;
      WHEN 'excellent'   THEN v_perf_multiplier := 1.0;
      WHEN 'focus'       THEN v_perf_multiplier := 0.75;
      ELSE v_perf_multiplier := 1.0;
    END CASE;

    -- Calculate XP: base * performance * match importance
    v_xp_delta := GREATEST(1, round(v_xp_base * v_perf_multiplier * COALESCE(NEW.xp_multiplier, 1.0))::integer);

    -- Check daily cap
    SELECT COALESCE(SUM(xp_delta), 0) INTO v_daily_xp
    FROM stryk_events
    WHERE organization_id = NEW.organization_id
      AND player_id = v_mp.player_id
      AND created_at::date = NEW.match_date::date;

    IF v_daily_xp + v_xp_delta > v_daily_cap THEN
      v_xp_delta := GREATEST(0, v_daily_cap - v_daily_xp);
    END IF;

    IF v_xp_delta > 0 THEN
      -- Insert performance XP event (deduped)
      INSERT INTO stryk_events (organization_id, player_id, source_type, source_id, xp_delta, created_by)
      VALUES (NEW.organization_id, v_mp.player_id, 'match_performance', NEW.id, v_xp_delta, NEW.last_edited_by)
      ON CONFLICT (organization_id, source_type, source_id, player_id) DO NOTHING;

      -- Update player_progress
      INSERT INTO player_progress (organization_id, player_id, xp_total, level, last_event_at)
      VALUES (NEW.organization_id, v_mp.player_id, v_xp_delta, GREATEST(1, v_xp_delta / 100 + 1), now())
      ON CONFLICT (organization_id, player_id) DO UPDATE SET
        xp_total = player_progress.xp_total + v_xp_delta,
        level = GREATEST(1, (player_progress.xp_total + v_xp_delta) / 100 + 1),
        last_event_at = now(),
        updated_at = now();
    END IF;
  END LOOP;

  -- Process MVP bonus
  IF NEW.mvp_player_id IS NOT NULL THEN
    INSERT INTO stryk_events (organization_id, player_id, source_type, source_id, xp_delta, created_by)
    VALUES (NEW.organization_id, NEW.mvp_player_id, 'match_mvp', NEW.id, 50, NEW.last_edited_by)
    ON CONFLICT (organization_id, source_type, source_id, player_id) DO NOTHING;

    INSERT INTO player_progress (organization_id, player_id, xp_total, level, last_event_at)
    VALUES (NEW.organization_id, NEW.mvp_player_id, 50, 1, now())
    ON CONFLICT (organization_id, player_id) DO UPDATE SET
      xp_total = player_progress.xp_total + 50,
      level = GREATEST(1, (player_progress.xp_total + 50) / 100 + 1),
      last_event_at = now(),
      updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Create trigger
CREATE TRIGGER trg_match_performance_xp
  AFTER UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.process_match_performance_xp();
