
CREATE OR REPLACE FUNCTION public.wl_get_family_profile(
  p_guardian_id uuid,
  p_player_id uuid
)
RETURNS TABLE (
  season text,
  month_key text,
  month_order integer,
  ind1_name text,
  ind1_frase text,
  ind2_name text,
  ind2_frase text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM player_guardians pg
    WHERE pg.guardian_id = p_guardian_id
      AND pg.player_id = p_player_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    e.season,
    e.month_key,
    i.month_order,
    i.ind1_name,
    CASE e.nivel_ind1
      WHEN 1 THEN i.ind1_frase1
      WHEN 2 THEN i.ind1_frase2
      WHEN 3 THEN i.ind1_frase3
      ELSE NULL
    END AS ind1_frase,
    i.ind2_name,
    CASE e.nivel_ind2
      WHEN 1 THEN i.ind2_frase1
      WHEN 2 THEN i.ind2_frase2
      WHEN 3 THEN i.ind2_frase3
      ELSE NULL
    END AS ind2_frase
  FROM wl_monthly_evaluations e
  JOIN wl_monthly_indicators i
    ON i.org_id = e.org_id
   AND i.category_key = e.category_key
   AND i.month_key = e.month_key
  WHERE e.player_id = p_player_id
    AND (e.nivel_ind1 IS NOT NULL OR e.nivel_ind2 IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.wl_get_family_profile(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.wl_get_family_profile(uuid, uuid) TO anon, authenticated;
