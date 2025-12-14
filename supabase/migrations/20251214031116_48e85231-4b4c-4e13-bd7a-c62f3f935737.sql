-- Corregir search_path en funciones
CREATE OR REPLACE FUNCTION public.generate_org_code(org_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_code TEXT;
  final_code TEXT;
  counter INTEGER := 0;
BEGIN
  base_code := lower(regexp_replace(org_name, '[^a-zA-Z0-9]', '-', 'g'));
  base_code := regexp_replace(base_code, '-+', '-', 'g');
  base_code := trim(both '-' from base_code);
  base_code := substring(base_code, 1, 30);
  
  final_code := base_code;
  
  WHILE EXISTS (SELECT 1 FROM public.organizations WHERE org_code = final_code) LOOP
    counter := counter + 1;
    final_code := base_code || '-' || counter;
  END LOOP;
  
  RETURN final_code;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_access_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..3 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  result := result || '-';
  FOR i IN 1..3 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;