-- Fix search_path for normalization functions
CREATE OR REPLACE FUNCTION public.normalize_phone(phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF phone IS NULL THEN RETURN NULL; END IF;
  RETURN RIGHT(regexp_replace(phone, '[^0-9]', '', 'g'), 10);
END;
$$;

CREATE OR REPLACE FUNCTION public.normalize_name(name text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF name IS NULL THEN RETURN NULL; END IF;
  RETURN lower(trim(regexp_replace(
    translate(name, 'áéíóúñÁÉÍÓÚÑäëïöüÄËÏÖÜàèìòùÀÈÌÒÙ', 'aeiounAEIOUNaeiouAEIOUaeiouAEIOU'),
    '\s+', ' ', 'g'
  )));
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_intake_idempotency_key(
  p_org_id uuid,
  p_phone_normalized text,
  p_birth_date date,
  p_name_normalized text
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN encode(
    sha256(
      (p_org_id::text || '|' || COALESCE(p_phone_normalized, '') || '|' || p_birth_date::text || '|' || p_name_normalized)::bytea
    ),
    'hex'
  );
END;
$$;