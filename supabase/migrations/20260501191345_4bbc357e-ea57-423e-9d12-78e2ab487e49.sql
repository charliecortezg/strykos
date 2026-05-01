-- ───────────────────────────────────────────────────────────
-- WHITE LIONS — Player Monthly Reports (individual por jugador)
-- Tabla NUEVA, no toca monthly_reports (reporte ejecutivo del fundador)
-- ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.player_monthly_reports (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  player_id       uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  month           integer NOT NULL CHECK (month BETWEEN 1 AND 12),
  year            integer NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  category_id     uuid REFERENCES public.categories(id),
  status          text NOT NULL DEFAULT 'generated'
                  CHECK (status IN ('generated', 'sent', 'failed')),
  pdf_url         text,
  ai_summary      text,
  report_data     jsonb,
  sent_at         timestamptz,
  sent_to_email   text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid REFERENCES auth.users(id),
  UNIQUE (player_id, month, year)
);

CREATE INDEX IF NOT EXISTS idx_pmr_org_period
  ON public.player_monthly_reports (organization_id, year, month);
CREATE INDEX IF NOT EXISTS idx_pmr_player
  ON public.player_monthly_reports (player_id, year DESC, month DESC);
CREATE INDEX IF NOT EXISTS idx_pmr_category
  ON public.player_monthly_reports (category_id, year, month);

ALTER TABLE public.player_monthly_reports ENABLE ROW LEVEL SECURITY;

-- Staff (org_owner / director / administrativo) puede ver
CREATE POLICY "Staff can view player monthly reports"
  ON public.player_monthly_reports
  FOR SELECT
  USING (
    organization_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner'::org_role)
      OR public.has_org_role('director_deportivo'::org_role)
      OR public.has_org_role('administrativo'::org_role)
    )
  );

-- Staff con permisos puede crear/actualizar
CREATE POLICY "Staff can insert player monthly reports"
  ON public.player_monthly_reports
  FOR INSERT
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner'::org_role)
      OR public.has_org_role('director_deportivo'::org_role)
    )
  );

CREATE POLICY "Staff can update player monthly reports"
  ON public.player_monthly_reports
  FOR UPDATE
  USING (
    organization_id = public.get_current_org_id()
    AND (
      public.has_org_role('org_owner'::org_role)
      OR public.has_org_role('director_deportivo'::org_role)
    )
  );

CREATE POLICY "Staff can delete player monthly reports"
  ON public.player_monthly_reports
  FOR DELETE
  USING (
    organization_id = public.get_current_org_id()
    AND public.has_org_role('org_owner'::org_role)
  );

-- Trigger updated_at
CREATE TRIGGER trg_pmr_updated_at
  BEFORE UPDATE ON public.player_monthly_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ───────────────────────────────────────────────────────────
-- Storage buckets
-- ───────────────────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('monthly-reports', 'monthly-reports', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('email-assets', 'email-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Policies bucket monthly-reports: lectura pública, escritura para staff
CREATE POLICY "Monthly reports public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'monthly-reports');

CREATE POLICY "Staff can upload monthly reports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'monthly-reports'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Staff can update monthly reports"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'monthly-reports' AND auth.uid() IS NOT NULL);

CREATE POLICY "Staff can delete monthly reports"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'monthly-reports' AND auth.uid() IS NOT NULL);

-- Policies bucket email-assets: público read, autenticados pueden subir
CREATE POLICY "Email assets public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'email-assets');

CREATE POLICY "Authenticated upload email assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'email-assets' AND auth.uid() IS NOT NULL);
