-- Replace sync_evaluation_to_progress to be dimension-agnostic
CREATE OR REPLACE FUNCTION public.sync_evaluation_to_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_score_row RECORD;
  v_radar JSONB := '{}'::jsonb;
  v_total NUMERIC := 0;
  v_count INT := 0;
  v_ovr NUMERIC;
BEGIN
  -- Only fire when status changes to 'closed'
  IF NEW.status != 'closed' OR OLD.status = 'closed' THEN
    RETURN NEW;
  END IF;

  -- Build radar dynamically from whatever stat_keys exist
  FOR v_score_row IN
    SELECT stat_key, round((score::numeric / 20) * 100) AS scaled
    FROM evaluation_scores
    WHERE evaluation_id = NEW.id
  LOOP
    v_radar := v_radar || jsonb_build_object(v_score_row.stat_key, v_score_row.scaled);
    v_total := v_total + v_score_row.scaled;
    v_count := v_count + 1;
  END LOOP;

  -- Use the pre-calculated overall_score if available, otherwise average
  v_ovr := COALESCE(NEW.overall_score, CASE WHEN v_count > 0 THEN round(v_total / v_count) ELSE 50 END);

  -- Upsert player_progress
  INSERT INTO player_progress (organization_id, player_id, radar, ovr, last_event_at)
  VALUES (NEW.organization_id, NEW.player_id, v_radar, v_ovr, now())
  ON CONFLICT (organization_id, player_id) DO UPDATE SET
    radar = v_radar,
    ovr = v_ovr,
    last_event_at = now(),
    updated_at = now();

  RETURN NEW;
END;
$$;