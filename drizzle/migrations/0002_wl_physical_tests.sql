CREATE TABLE public.wl_physical_tests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_key text NOT NULL,
  test_key text NOT NULL,
  name text NOT NULL,
  unit text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('reps','beep')),
  yellow_min numeric NOT NULL,
  green_min numeric NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, category_key, test_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_physical_tests TO authenticated;
GRANT ALL ON public.wl_physical_tests TO service_role;
ALTER TABLE public.wl_physical_tests ENABLE ROW LEVEL SECURITY;
CREATE POLICY wl_phys_select ON public.wl_physical_tests FOR SELECT TO authenticated USING (public.user_belongs_to_org(org_id));
CREATE POLICY wl_phys_write ON public.wl_physical_tests FOR ALL TO authenticated
  USING (public.user_belongs_to_org(org_id) AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo')))
  WITH CHECK (public.user_belongs_to_org(org_id) AND (public.has_org_role('org_owner') OR public.has_org_role('director_deportivo')));

ALTER TABLE public.wl_monthly_evaluations ADD COLUMN IF NOT EXISTS physical_results jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.validate_wl_physical_results()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE k text; v jsonb; n int; r int;
BEGIN
  IF NEW.physical_results IS NULL THEN NEW.physical_results := '{}'::jsonb; END IF;
  FOR k, v IN SELECT * FROM jsonb_each(NEW.physical_results) LOOP
    IF v = 'null'::jsonb THEN CONTINUE; END IF;
    IF k = 'beep' THEN
      n := (v->>'nivel')::int; r := (v->>'recorrido')::int;
      IF n IS NULL OR r IS NULL OR n < 1 OR n > 10 OR r < 1 OR r > 9 THEN
        RAISE EXCEPTION 'Beep test inválido: nivel 1-10 y recorrido 1-9';
      END IF;
    ELSE
      IF jsonb_typeof(v) <> 'number' OR (v::text)::numeric <> floor((v::text)::numeric)
         OR (v::text)::numeric < 0 OR (v::text)::numeric > 150 THEN
        RAISE EXCEPTION 'Valor inválido en %: debe ser entero entre 0 y 150', k;
      END IF;
    END IF;
  END LOOP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_validate_wl_physical_results
BEFORE INSERT OR UPDATE ON public.wl_monthly_evaluations
FOR EACH ROW EXECUTE FUNCTION public.validate_wl_physical_results();