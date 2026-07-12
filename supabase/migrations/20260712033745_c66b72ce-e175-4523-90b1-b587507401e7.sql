
-- 1. Column wl_category_key on categories (single source of truth)
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS wl_category_key text
  CHECK (wl_category_key IN ('sub-5','sub-7','sub-9','sub-11','sub-13'));

-- 2. Backfill for White Lions org by name (ILIKE)
UPDATE public.categories SET wl_category_key = 'sub-5'
  WHERE organization_id = '982f355c-0196-46d3-8da9-3e5e83813dad'
    AND wl_category_key IS NULL AND (name ILIKE '%biberon%' OR name ILIKE '%biberón%');

UPDATE public.categories SET wl_category_key = 'sub-7'
  WHERE organization_id = '982f355c-0196-46d3-8da9-3e5e83813dad'
    AND wl_category_key IS NULL AND name ILIKE '%escuelita%';

UPDATE public.categories SET wl_category_key = 'sub-9'
  WHERE organization_id = '982f355c-0196-46d3-8da9-3e5e83813dad'
    AND wl_category_key IS NULL AND name ILIKE '%estrellita%';

UPDATE public.categories SET wl_category_key = 'sub-11'
  WHERE organization_id = '982f355c-0196-46d3-8da9-3e5e83813dad'
    AND wl_category_key IS NULL AND name ILIKE '%infantil%';

UPDATE public.categories SET wl_category_key = 'sub-13'
  WHERE organization_id = '982f355c-0196-46d3-8da9-3e5e83813dad'
    AND wl_category_key IS NULL AND name ILIKE '%juvenil%';

-- 3. Recreate RPC using categories.wl_category_key (fail-closed if NULL/sub-5)
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
  v_wl_key text;
  v_training jsonb;
  v_totals jsonb;
  v_matches jsonb;
BEGIN
  -- 1. Verify guardian-player link
  IF NOT EXISTS (
    SELECT 1 FROM player_guardians pg
    WHERE pg.guardian_id = p_guardian_id
      AND pg.player_id = p_player_id
  ) THEN
    RETURN NULL;
  END IF;

  -- 2. Resolve WL category via categories.wl_category_key (single source of truth)
  SELECT c.wl_category_key
    INTO v_wl_key
  FROM players p
  JOIN categories c ON c.id = p.category_id
  WHERE p.id = p_player_id;

  v_show_stats := (v_wl_key IN ('sub-7','sub-9','sub-11','sub-13'));

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

  -- 4. Match list — only 'terminado', newest first, limit 50
  IF v_show_stats THEN
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.date DESC), '[]'::jsonb)
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
      JOIN match_players mp
        ON mp.match_id = m.id AND mp.player_id = p_player_id
      WHERE m.status = 'terminado'
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
    -- sub-5 / NULL: no stats, no scores, no goals/assists fields
    SELECT COALESCE(jsonb_agg(row_to_json(t)::jsonb ORDER BY t.date DESC), '[]'::jsonb)
    INTO v_matches
    FROM (
      SELECT
        m.match_date AS date,
        m.rival_name AS rival,
        m.match_type AS type,
        COALESCE(mp.attended, false) AS played
      FROM matches m
      JOIN match_players mp
        ON mp.match_id = m.id AND mp.player_id = p_player_id
      WHERE m.status = 'terminado'
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
