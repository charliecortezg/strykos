-- ============================================
-- TABLE: session_plans
-- ============================================
CREATE TABLE public.session_plans (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid NOT NULL REFERENCES public.organizations(id),
  trainer_id            uuid NOT NULL REFERENCES public.profiles(id),
  category_id           uuid NOT NULL REFERENCES public.categories(id),
  session_date          date NOT NULL,

  macrocycle_month      text NOT NULL,
  macrocycle_period     text NOT NULL,
  period_color          text,

  fundamento_mes        text NOT NULL,
  fundamento_nivel      text NOT NULL,
  restriccion_rondo     text,
  juego_posicional      text,
  foco_partido          text,
  pregunta_cierre       text,

  partido_iniciado_at   timestamptz,
  partido_finalizado_at timestamptz,
  observaciones_partido jsonb DEFAULT '{}'::jsonb,
  sincronizado_stryk    boolean DEFAULT false,

  autoevaluacion        jsonb,
  notas_entrenador      text,

  status                text DEFAULT 'borrador',
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

-- Validation trigger for fundamento_nivel
CREATE OR REPLACE FUNCTION public.validate_session_plan_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.fundamento_nivel NOT IN ('intro', 'desar', 'cons') THEN
    RAISE EXCEPTION 'Invalid fundamento_nivel: %', NEW.fundamento_nivel;
  END IF;
  IF NEW.status NOT IN ('borrador', 'activa', 'completada') THEN
    RAISE EXCEPTION 'Invalid status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_validate_session_plan
BEFORE INSERT OR UPDATE ON public.session_plans
FOR EACH ROW
EXECUTE FUNCTION public.validate_session_plan_fields();

-- Indexes
CREATE INDEX idx_session_plans_trainer
  ON public.session_plans(organization_id, trainer_id, session_date DESC);
CREATE INDEX idx_session_plans_category
  ON public.session_plans(organization_id, category_id, session_date DESC);

-- Updated_at trigger
CREATE TRIGGER update_session_plans_updated_at
BEFORE UPDATE ON public.session_plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.session_plans ENABLE ROW LEVEL SECURITY;

-- Trainers can view their own session plans
CREATE POLICY "Trainers can view own session plans"
ON public.session_plans FOR SELECT
USING (
  organization_id = get_current_org_id()
  AND (
    trainer_id = auth.uid()
    OR has_org_role('org_owner'::org_role)
    OR has_org_role('director_deportivo'::org_role)
  )
);

-- Trainers can insert their own session plans
CREATE POLICY "Trainers can insert own session plans"
ON public.session_plans FOR INSERT
WITH CHECK (
  organization_id = get_current_org_id()
  AND trainer_id = auth.uid()
  AND (
    has_org_role('entrenador'::org_role)
    OR has_org_role('org_owner'::org_role)
    OR has_org_role('director_deportivo'::org_role)
  )
);

-- Trainers can update their own session plans
CREATE POLICY "Trainers can update own session plans"
ON public.session_plans FOR UPDATE
USING (
  organization_id = get_current_org_id()
  AND trainer_id = auth.uid()
  AND (
    has_org_role('entrenador'::org_role)
    OR has_org_role('org_owner'::org_role)
    OR has_org_role('director_deportivo'::org_role)
  )
)
WITH CHECK (
  organization_id = get_current_org_id()
  AND trainer_id = auth.uid()
);

-- ============================================
-- TABLE: restriction_bank
-- ============================================
CREATE TABLE public.restriction_bank (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid REFERENCES public.organizations(id),
  fundamento      text NOT NULL,
  age_group       text NOT NULL,
  restriccion     text NOT NULL,
  descripcion     text,
  es_recomendada  boolean DEFAULT false,
  created_at      timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.restriction_bank ENABLE ROW LEVEL SECURITY;

-- All org roles can read restrictions (org-specific + global where org_id IS NULL)
CREATE POLICY "Org members can view restrictions"
ON public.restriction_bank FOR SELECT
USING (
  organization_id IS NULL
  OR organization_id = get_current_org_id()
);

-- Only directors and owners can insert restrictions
CREATE POLICY "Directors can insert restrictions"
ON public.restriction_bank FOR INSERT
WITH CHECK (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner'::org_role)
    OR has_org_role('director_deportivo'::org_role)
  )
);

-- Only directors and owners can update restrictions
CREATE POLICY "Directors can update restrictions"
ON public.restriction_bank FOR UPDATE
USING (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner'::org_role)
    OR has_org_role('director_deportivo'::org_role)
  )
)
WITH CHECK (
  organization_id = get_current_org_id()
  AND (
    has_org_role('org_owner'::org_role)
    OR has_org_role('director_deportivo'::org_role)
  )
);