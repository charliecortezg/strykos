
CREATE OR REPLACE FUNCTION public.wl_get_player_history(
  p_guardian_id uuid,
  p_player_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_show_stats boolean;
  v_category_id uuid;
  v_age_group text;
  v_age_num int;
  v_training jsonb;
  v_totals jsonb;
  v_matches jsonb;
BEGIN
  -- 1. Verify guardian-player link (same pattern as wl_get_family_profile)
  IF NOT EXISTS (
    SELECT 1 FROM player_guardians pg
    WHERE pg.guardian_id = p_guardian_id
      AND pg.player_id = p_player_id
  ) THEN
    RETURN NULL;
  END IF;

  -- 2. Determine v_show_stats from category age_group.
  --    Extract first integer from age_group (handles 'sub-7', 'sub-13', '8-9', etc.)
  SELECT p.category_id INTO v_category_id FROM players p WHERE p.id = p_player_id;
  SELECT c.age_group INTO v_age_group FROM categories c WHERE c.id = v_category_id;

  v_age_num := NULL;
  IF v_age_group IS NOT NULL THEN
    BEGIN
      v_age_num := (regexp_match(v_age_group, '(\d+)'))[1]::int;
    EXCEPTION WHEN OTHERS THEN
      v_age_num := NULL;
    END;
  END IF;

  v_show_stats := (v_age_num IS NOT NULL AND v_age_num >= 7);

  -- 3. Training attendance summary
  SELECT jsonb_build_object(
    'presente',    COALESCE(SUM(CASE WHEN a.status = 'presente'    THEN 1 ELSE 0 END), 0),
    'justificado', COALESCE(SUM(CASE WHEN a.status = 'justificado' THEN 1 ELSE 0 END), 0),
    'ausente',     COALESCE(SUM(CASE WHEN a.status = 'ausente'     THEN 1 ELSE 0 END), 0),
    'total',       COALESCE(COUNT(*), 0)
  )
  INTO v_training
  FROM attendance a
  WHERE a.player_id = p_player_id;

  -- 4. Match list (only 'terminado', newest first, limit 50)
  IF v_show_stats THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.match_date DESC), '[]'::jsonb)
    INTO v_matches
    FROM (
      SELECT
        m.match_date       AS date,
        m.rival_name       AS rival,
        m.match_type       AS type,
        COALESCE(mp.attended, false) AS played,
        m.goals_for        AS score_for,
        m.goals_against    AS score_against,
        COALESCE(mp.goals, 0)   AS goals,
        COALESCE(mp.assists, 0) AS assists
      FROM matches m
      LEFT JOIN match_players mp
        ON mp.match_id = m.id AND mp.player_id = p_player_id
      WHERE m.status = 'terminado'
        AND (mp.player_id IS NOT NULL)
      ORDER BY m.match_date DESC
      LIMIT 50
    ) t;

    SELECT jsonb_build_object(
      'matches_played', COALESCE(SUM(CASE WHEN mp.attended THEN 1 ELSE 0 END), 0),
      'goals',          COALESCE(SUM(COALESCE(mp.goals, 0)), 0),
      'assists',        COALESCE(SUM(COALESCE(mp.assists, 0)), 0)
    )
    INTO v_totals
    FROM match_players mp
    JOIN matches m ON m.id = mp.match_id
    WHERE mp.player_id = p_player_id
      AND m.status = 'terminado';
  ELSE
    -- No stats: matches list without score/goals/assists fields
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.match_date DESC), '[]'::jsonb)
    INTO v_matches
    FROM (
      SELECT
        m.match_date AS date,
        m.rival_name AS rival,
        m.match_type AS type,
        COALESCE(mp.attended, false) AS played
      FROM matches m
      LEFT JOIN match_players mp
        ON mp.match_id = m.id AND mp.player_id = p_player_id
      WHERE m.status = 'terminado'
        AND (mp.player_id IS NOT NULL)
      ORDER BY m.match_date DESC
      LIMIT 50
    ) t;

    v_totals := NULL;
  END IF;

  RETURN jsonb_build_object(
    'show_stats', v_show_stats,
    'training',   COALESCE(v_training, jsonb_build_object('presente',0,'justificado',0,'ausente',0,'total',0)),
    'totals',     v_totals,
    'matches',    COALESCE(v_matches, '[]'::jsonb)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.wl_get_player_history(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wl_get_player_history(uuid, uuid) TO anon, authenticated;
