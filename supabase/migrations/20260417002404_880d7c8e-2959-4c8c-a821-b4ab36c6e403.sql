
-- ============================================================
-- 1. CATÁLOGO DE CONTENIDO (global)
-- ============================================================

CREATE TABLE public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_level text NOT NULL CHECK (certification_level IN ('WL-C1','WL-C2','WL-C3','WL-C4','WL-C5')),
  module_order int NOT NULL,
  title text NOT NULL,
  description text,
  estimated_minutes int DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (certification_level, module_order)
);

CREATE TABLE public.training_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  component_order int NOT NULL,
  component_type text NOT NULL CHECK (component_type IN ('lectura','video','examen','tarea_campo')),
  title text NOT NULL,
  content text,
  video_url text,
  estimated_minutes int DEFAULT 0,
  passing_score int DEFAULT 70,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (module_id, component_order)
);

CREATE TABLE public.training_exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id uuid NOT NULL REFERENCES public.training_components(id) ON DELETE CASCADE,
  question_order int NOT NULL,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_option text NOT NULL,
  explanation text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (component_id, question_order)
);

-- ============================================================
-- 2. PROGRESO DEL ENTRENADOR (por organización)
-- ============================================================

CREATE TABLE public.trainer_module_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, trainer_id, module_id)
);

CREATE TABLE public.trainer_component_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.training_components(id) ON DELETE CASCADE,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, trainer_id, component_id)
);

CREATE TABLE public.trainer_exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  component_id uuid NOT NULL REFERENCES public.training_components(id) ON DELETE CASCADE,
  attempt_number int NOT NULL DEFAULT 1,
  score int NOT NULL DEFAULT 0,
  total_questions int NOT NULL DEFAULT 0,
  percentage numeric(5,2) NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.trainer_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  trainer_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  certification_level text NOT NULL CHECK (certification_level IN ('WL-C1','WL-C2','WL-C3','WL-C4','WL-C5')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  issued_by uuid REFERENCES public.profiles(id),
  revoked_at timestamptz,
  revoked_by uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, trainer_id, certification_level)
);

-- Indices
CREATE INDEX idx_training_components_module ON public.training_components(module_id);
CREATE INDEX idx_training_exam_questions_component ON public.training_exam_questions(component_id);
CREATE INDEX idx_trainer_module_progress_trainer ON public.trainer_module_progress(organization_id, trainer_id);
CREATE INDEX idx_trainer_component_progress_trainer ON public.trainer_component_progress(organization_id, trainer_id);
CREATE INDEX idx_trainer_exam_attempts_trainer ON public.trainer_exam_attempts(organization_id, trainer_id, component_id);
CREATE INDEX idx_trainer_certifications_trainer ON public.trainer_certifications(organization_id, trainer_id);

-- Triggers updated_at
CREATE TRIGGER trg_training_modules_updated BEFORE UPDATE ON public.training_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_training_components_updated BEFORE UPDATE ON public.training_components
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_trainer_module_progress_updated BEFORE UPDATE ON public.trainer_module_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_trainer_component_progress_updated BEFORE UPDATE ON public.trainer_component_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 3. RLS
-- ============================================================

ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_exam_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_module_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_component_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainer_certifications ENABLE ROW LEVEL SECURITY;

-- Catálogo: lectura para cualquier autenticado
CREATE POLICY "Authenticated can read modules" ON public.training_modules
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read components" ON public.training_components
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can read exam questions" ON public.training_exam_questions
  FOR SELECT TO authenticated USING (true);

-- trainer_module_progress
CREATE POLICY "Trainer reads own module progress" ON public.trainer_module_progress
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_current_org_id()
    AND (trainer_id = auth.uid()
         OR public.has_org_role('director_deportivo'::org_role)
         OR public.has_org_role('org_owner'::org_role))
  );
CREATE POLICY "Trainer inserts own module progress" ON public.trainer_module_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND trainer_id = auth.uid()
  );
CREATE POLICY "Trainer updates own module progress" ON public.trainer_module_progress
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_current_org_id()
    AND trainer_id = auth.uid()
  );

-- trainer_component_progress
CREATE POLICY "Trainer reads own component progress" ON public.trainer_component_progress
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_current_org_id()
    AND (trainer_id = auth.uid()
         OR public.has_org_role('director_deportivo'::org_role)
         OR public.has_org_role('org_owner'::org_role))
  );
CREATE POLICY "Trainer inserts own component progress" ON public.trainer_component_progress
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND trainer_id = auth.uid()
  );
CREATE POLICY "Trainer updates own component progress" ON public.trainer_component_progress
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_current_org_id()
    AND trainer_id = auth.uid()
  );

-- trainer_exam_attempts
CREATE POLICY "Trainer reads own exam attempts" ON public.trainer_exam_attempts
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_current_org_id()
    AND (trainer_id = auth.uid()
         OR public.has_org_role('director_deportivo'::org_role)
         OR public.has_org_role('org_owner'::org_role))
  );
CREATE POLICY "Trainer inserts own exam attempts" ON public.trainer_exam_attempts
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND trainer_id = auth.uid()
  );

-- trainer_certifications
CREATE POLICY "Read certifications in org" ON public.trainer_certifications
  FOR SELECT TO authenticated
  USING (
    organization_id = public.get_current_org_id()
    AND (trainer_id = auth.uid()
         OR public.has_org_role('director_deportivo'::org_role)
         OR public.has_org_role('org_owner'::org_role))
  );
CREATE POLICY "DD/Owner issues certifications" ON public.trainer_certifications
  FOR INSERT TO authenticated
  WITH CHECK (
    organization_id = public.get_current_org_id()
    AND (public.has_org_role('director_deportivo'::org_role)
         OR public.has_org_role('org_owner'::org_role))
  );
CREATE POLICY "DD/Owner updates certifications" ON public.trainer_certifications
  FOR UPDATE TO authenticated
  USING (
    organization_id = public.get_current_org_id()
    AND (public.has_org_role('director_deportivo'::org_role)
         OR public.has_org_role('org_owner'::org_role))
  );
