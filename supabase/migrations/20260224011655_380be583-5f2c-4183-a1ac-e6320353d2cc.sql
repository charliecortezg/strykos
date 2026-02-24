
-- Function to sync evaluation scores to player_progress radar
CREATE OR REPLACE FUNCTION public.sync_evaluation_to_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_scores RECORD;
  v_radar JSONB;
  v_ovr NUMERIC;
BEGIN
  -- Only fire when status changes to 'closed'
  IF NEW.status != 'closed' OR OLD.status = 'closed' THEN
    RETURN NEW;
  END IF;

  -- Build radar from evaluation_scores (scale 0-20 -> 0-100)
  SELECT
    COALESCE(MAX(CASE WHEN stat_key = 'actitud_esfuerzo' THEN round((score::numeric / 20) * 100) END), 50) AS mental,
    COALESCE(MAX(CASE WHEN stat_key = 'disciplina_constancia' THEN round((score::numeric / 20) * 100) END), 50) AS disciplina,
    COALESCE(MAX(CASE WHEN stat_key = 'autonomia_liderazgo' THEN round((score::numeric / 20) * 100) END), 50) AS social,
    COALESCE(MAX(CASE WHEN stat_key = 'control_conduccion' THEN round((score::numeric / 20) * 100) END), 50) AS tecnica,
    COALESCE(MAX(CASE WHEN stat_key = 'pase_recepcion' THEN round((score::numeric / 20) * 100) END), 50) AS fisica,
    COALESCE(MAX(CASE WHEN stat_key = 'decision_juego' THEN round((score::numeric / 20) * 100) END), 50) AS tactica
  INTO v_scores
  FROM evaluation_scores
  WHERE evaluation_id = NEW.id;

  v_radar := jsonb_build_object(
    'mental', v_scores.mental,
    'disciplina', v_scores.disciplina,
    'social', v_scores.social,
    'tecnica', v_scores.tecnica,
    'fisica', v_scores.fisica,
    'tactica', v_scores.tactica
  );

  v_ovr := COALESCE(NEW.overall_score, 50);

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

-- Create trigger
CREATE TRIGGER trg_sync_evaluation_to_progress
  BEFORE UPDATE ON public.evaluations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_evaluation_to_progress();

-- Backfill: sync all existing closed evaluations to player_progress
DO $$
DECLARE
  v_eval RECORD;
  v_scores RECORD;
  v_radar JSONB;
BEGIN
  FOR v_eval IN
    SELECT e.id, e.organization_id, e.player_id, e.overall_score
    FROM evaluations e
    WHERE e.status = 'closed'
    ORDER BY e.closed_at DESC NULLS LAST
  LOOP
    SELECT
      COALESCE(MAX(CASE WHEN stat_key = 'actitud_esfuerzo' THEN round((score::numeric / 20) * 100) END), 50) AS mental,
      COALESCE(MAX(CASE WHEN stat_key = 'disciplina_constancia' THEN round((score::numeric / 20) * 100) END), 50) AS disciplina,
      COALESCE(MAX(CASE WHEN stat_key = 'autonomia_liderazgo' THEN round((score::numeric / 20) * 100) END), 50) AS social,
      COALESCE(MAX(CASE WHEN stat_key = 'control_conduccion' THEN round((score::numeric / 20) * 100) END), 50) AS tecnica,
      COALESCE(MAX(CASE WHEN stat_key = 'pase_recepcion' THEN round((score::numeric / 20) * 100) END), 50) AS fisica,
      COALESCE(MAX(CASE WHEN stat_key = 'decision_juego' THEN round((score::numeric / 20) * 100) END), 50) AS tactica
    INTO v_scores
    FROM evaluation_scores
    WHERE evaluation_id = v_eval.id;

    v_radar := jsonb_build_object(
      'mental', v_scores.mental, 'disciplina', v_scores.disciplina,
      'social', v_scores.social, 'tecnica', v_scores.tecnica,
      'fisica', v_scores.fisica, 'tactica', v_scores.tactica
    );

    INSERT INTO player_progress (organization_id, player_id, radar, ovr, last_event_at)
    VALUES (v_eval.organization_id, v_eval.player_id, v_radar, COALESCE(v_eval.overall_score, 50), now())
    ON CONFLICT (organization_id, player_id) DO UPDATE SET
      radar = v_radar,
      ovr = COALESCE(v_eval.overall_score, 50),
      last_event_at = now(),
      updated_at = now();
  END LOOP;
END;
$$;
