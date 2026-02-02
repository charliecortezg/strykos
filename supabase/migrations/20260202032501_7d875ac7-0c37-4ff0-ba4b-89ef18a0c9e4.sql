-- =====================================================
-- Auto-creación de Guardian al Registrar Jugador
-- =====================================================

-- 1. Función que auto-crea guardian cuando se crea/actualiza un jugador
CREATE OR REPLACE FUNCTION public.auto_create_guardian_from_player()
RETURNS TRIGGER AS $$
DECLARE
  v_phone_normalized TEXT;
  v_guardian_name TEXT;
  v_guardian_id UUID;
BEGIN
  -- Solo procesar si hay teléfono válido
  IF NEW.phone IS NULL OR NEW.phone = '' OR NEW.phone = 'S/N' THEN
    RETURN NEW;
  END IF;

  -- Normalizar teléfono (últimos 10 dígitos)
  v_phone_normalized := RIGHT(regexp_replace(NEW.phone, '[^0-9]', '', 'g'), 10);
  
  -- Mínimo 10 dígitos para ser válido
  IF length(v_phone_normalized) < 10 THEN
    RETURN NEW;
  END IF;

  -- Determinar nombre del guardian
  v_guardian_name := COALESCE(
    NULLIF(NEW.tutor_name, ''),
    'Tutor de ' || NEW.full_name
  );

  -- Upsert guardian
  INSERT INTO public.guardians (
    organization_id, full_name, phone, phone_normalized, relationship
  ) VALUES (
    NEW.organization_id,
    v_guardian_name,
    NEW.phone,
    v_phone_normalized,
    'Padre/Madre'
  )
  ON CONFLICT (organization_id, phone_normalized) 
  DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    updated_at = now()
  RETURNING id INTO v_guardian_id;

  -- Vincular player con guardian
  INSERT INTO public.player_guardians (player_id, guardian_id, is_primary)
  VALUES (NEW.id, v_guardian_id, true)
  ON CONFLICT (player_id, guardian_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Trigger en players
DROP TRIGGER IF EXISTS trigger_auto_create_guardian ON public.players;
CREATE TRIGGER trigger_auto_create_guardian
AFTER INSERT OR UPDATE OF phone, tutor_name ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.auto_create_guardian_from_player();

-- 3. Procesar jugadores existentes (retroactivo)
WITH players_needing_guardians AS (
  SELECT 
    p.id AS player_id,
    p.organization_id,
    p.full_name,
    p.phone,
    p.tutor_name,
    RIGHT(regexp_replace(p.phone, '[^0-9]', '', 'g'), 10) AS phone_normalized
  FROM public.players p
  LEFT JOIN public.player_guardians pg ON pg.player_id = p.id
  WHERE pg.id IS NULL
    AND p.phone IS NOT NULL 
    AND p.phone != ''
    AND p.phone != 'S/N'
    AND length(RIGHT(regexp_replace(p.phone, '[^0-9]', '', 'g'), 10)) >= 10
    AND p.is_active = true
),
inserted_guardians AS (
  INSERT INTO public.guardians (organization_id, full_name, phone, phone_normalized, relationship)
  SELECT DISTINCT ON (organization_id, phone_normalized)
    organization_id,
    COALESCE(NULLIF(tutor_name, ''), 'Tutor de ' || full_name),
    phone,
    phone_normalized,
    'Padre/Madre'
  FROM players_needing_guardians
  ON CONFLICT (organization_id, phone_normalized) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = now()
  RETURNING id, organization_id, phone_normalized
)
INSERT INTO public.player_guardians (player_id, guardian_id, is_primary)
SELECT 
  png.player_id,
  COALESCE(ig.id, g.id),
  true
FROM players_needing_guardians png
LEFT JOIN inserted_guardians ig 
  ON ig.organization_id = png.organization_id 
  AND ig.phone_normalized = png.phone_normalized
LEFT JOIN public.guardians g 
  ON g.organization_id = png.organization_id 
  AND g.phone_normalized = png.phone_normalized
WHERE COALESCE(ig.id, g.id) IS NOT NULL
ON CONFLICT (player_id, guardian_id) DO NOTHING;