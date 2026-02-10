
-- =============================================
-- EVALUATIONS MODULE: 6 new tables
-- =============================================

-- 1. evaluation_weights: pesos por edad configurables
CREATE TABLE public.evaluation_weights (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  age_group text NOT NULL,
  weights jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, age_group)
);
ALTER TABLE public.evaluation_weights ENABLE ROW LEVEL SECURITY;

-- 2. evaluations: una por jugador/mes
CREATE TABLE public.evaluations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.organizations(id),
  category_id uuid NOT NULL REFERENCES public.categories(id),
  player_id uuid NOT NULL REFERENCES public.players(id),
  period text NOT NULL,
  age_group text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  overall_score numeric,
  previous_overall numeric,
  recorded_by uuid REFERENCES auth.users(id),
  closed_by uuid REFERENCES auth.users(id),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, player_id, period)
);
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- 3. evaluation_scores: 6 scores por evaluacion
CREATE TABLE public.evaluation_scores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  stat_key text NOT NULL,
  score smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(evaluation_id, stat_key),
  CONSTRAINT score_range CHECK (score >= 0 AND score <= 20)
);
ALTER TABLE public.evaluation_scores ENABLE ROW LEVEL SECURITY;

-- 4. evaluation_achievements
CREATE TABLE public.evaluation_achievements (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  achievement_key text NOT NULL,
  xp_bonus integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluation_achievements ENABLE ROW LEVEL SECURITY;

-- 5. evaluation_comments
CREATE TABLE public.evaluation_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  evaluation_id uuid NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
  comment text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.evaluation_comments ENABLE ROW LEVEL SECURITY;

-- 6. evaluation_rubrics: tooltips por edad y stat
CREATE TABLE public.evaluation_rubrics (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  age_group text NOT NULL,
  stat_key text NOT NULL,
  band_min smallint NOT NULL,
  band_max smallint NOT NULL,
  bullets jsonb NOT NULL DEFAULT '[]',
  UNIQUE(age_group, stat_key, band_min)
);
ALTER TABLE public.evaluation_rubrics ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS POLICIES
-- =============================================

-- Helper: check if user is trainer for a category
CREATE OR REPLACE FUNCTION public.is_evaluation_category_trainer(p_category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM categories
    WHERE id = p_category_id
    AND trainer_id = auth.uid()
  );
$$;

-- == evaluation_weights ==
CREATE POLICY "Org users can view evaluation weights"
  ON public.evaluation_weights FOR SELECT
  USING (organization_id = get_current_org_id());

CREATE POLICY "Admins can manage evaluation weights"
  ON public.evaluation_weights FOR ALL
  USING (organization_id = get_current_org_id() AND (has_org_role('org_owner') OR has_org_role('director_deportivo')))
  WITH CHECK (organization_id = get_current_org_id() AND (has_org_role('org_owner') OR has_org_role('director_deportivo')));

-- == evaluations ==
CREATE POLICY "Org roles can view evaluations"
  ON public.evaluations FOR SELECT
  USING (
    organization_id = get_current_org_id()
    AND (
      has_org_role('org_owner')
      OR has_org_role('director_deportivo')
      OR (has_org_role('entrenador') AND is_evaluation_category_trainer(category_id))
    )
  );

CREATE POLICY "Trainers and admins can insert evaluations"
  ON public.evaluations FOR INSERT
  WITH CHECK (
    organization_id = get_current_org_id()
    AND (
      has_org_role('org_owner')
      OR has_org_role('director_deportivo')
      OR (has_org_role('entrenador') AND is_evaluation_category_trainer(category_id))
    )
  );

CREATE POLICY "Can update open evaluations only"
  ON public.evaluations FOR UPDATE
  USING (
    organization_id = get_current_org_id()
    AND (
      has_org_role('org_owner')
      OR has_org_role('director_deportivo')
      OR (has_org_role('entrenador') AND is_evaluation_category_trainer(category_id) AND status = 'open')
    )
  )
  WITH CHECK (
    organization_id = get_current_org_id()
    AND (
      has_org_role('org_owner')
      OR has_org_role('director_deportivo')
      OR (has_org_role('entrenador') AND is_evaluation_category_trainer(category_id))
    )
  );

-- == evaluation_scores ==
CREATE POLICY "Org roles can view evaluation scores"
  ON public.evaluation_scores FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.id = evaluation_scores.evaluation_id
      AND e.organization_id = get_current_org_id()
      AND (
        has_org_role('org_owner')
        OR has_org_role('director_deportivo')
        OR (has_org_role('entrenador') AND is_evaluation_category_trainer(e.category_id))
      )
    )
  );

CREATE POLICY "Can insert evaluation scores"
  ON public.evaluation_scores FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.id = evaluation_scores.evaluation_id
      AND e.organization_id = get_current_org_id()
      AND e.status = 'open'
      AND (
        has_org_role('org_owner')
        OR has_org_role('director_deportivo')
        OR (has_org_role('entrenador') AND is_evaluation_category_trainer(e.category_id))
      )
    )
  );

CREATE POLICY "Can update evaluation scores when open"
  ON public.evaluation_scores FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.id = evaluation_scores.evaluation_id
      AND e.organization_id = get_current_org_id()
      AND e.status = 'open'
      AND (
        has_org_role('org_owner')
        OR has_org_role('director_deportivo')
        OR (has_org_role('entrenador') AND is_evaluation_category_trainer(e.category_id))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.id = evaluation_scores.evaluation_id
      AND e.organization_id = get_current_org_id()
      AND e.status = 'open'
    )
  );

-- == evaluation_achievements ==
CREATE POLICY "Org roles can view evaluation achievements"
  ON public.evaluation_achievements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.id = evaluation_achievements.evaluation_id
      AND e.organization_id = get_current_org_id()
    )
  );

CREATE POLICY "Admins can insert evaluation achievements"
  ON public.evaluation_achievements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.id = evaluation_achievements.evaluation_id
      AND e.organization_id = get_current_org_id()
      AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
    )
  );

-- == evaluation_comments ==
CREATE POLICY "Org roles can view evaluation comments"
  ON public.evaluation_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.id = evaluation_comments.evaluation_id
      AND e.organization_id = get_current_org_id()
    )
  );

CREATE POLICY "Org users can insert evaluation comments"
  ON public.evaluation_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM evaluations e
      WHERE e.id = evaluation_comments.evaluation_id
      AND e.organization_id = get_current_org_id()
    )
    AND created_by = auth.uid()
  );

-- == evaluation_rubrics (public read) ==
CREATE POLICY "Anyone authenticated can view rubrics"
  ON public.evaluation_rubrics FOR SELECT
  USING (true);

-- =============================================
-- SEED: Default weights (inserted per-org via trigger)
-- =============================================

-- We'll seed rubrics as static data
INSERT INTO public.evaluation_rubrics (age_group, stat_key, band_min, band_max, bullets) VALUES
-- 6-7 age group
('6-7', 'actitud_esfuerzo', 0, 7, '["Se distrae fácilmente", "Poca participación activa", "Necesita motivación constante"]'),
('6-7', 'actitud_esfuerzo', 8, 14, '["Participa con entusiasmo variable", "Responde bien al estímulo", "Esfuerzo intermitente"]'),
('6-7', 'actitud_esfuerzo', 15, 20, '["Siempre da el máximo", "Líder por ejemplo", "Energía contagiosa"]'),
('6-7', 'disciplina_constancia', 0, 7, '["Le cuesta seguir instrucciones", "Se dispersa en ejercicios", "Falta regularidad"]'),
('6-7', 'disciplina_constancia', 8, 14, '["Sigue instrucciones básicas", "Mejorando en constancia", "Requiere recordatorios"]'),
('6-7', 'disciplina_constancia', 15, 20, '["Muy disciplinado para su edad", "Constante en esfuerzo", "Ejemplo para compañeros"]'),
('6-7', 'autonomia_liderazgo', 0, 7, '["Depende mucho del entrenador", "No toma iniciativa", "Tímido en grupo"]'),
('6-7', 'autonomia_liderazgo', 8, 14, '["Empieza a tomar decisiones", "Participa en dinámicas", "Se integra al grupo"]'),
('6-7', 'autonomia_liderazgo', 15, 20, '["Toma iniciativa natural", "Ayuda a compañeros", "Organiza juegos"]'),
('6-7', 'control_conduccion', 0, 7, '["Dificultad con el balón", "Poco control en movimiento", "Necesita fundamentos"]'),
('6-7', 'control_conduccion', 8, 14, '["Controla balón parado", "Mejorando conducción", "Progreso visible"]'),
('6-7', 'control_conduccion', 15, 20, '["Excelente control para su edad", "Conduce con ambos perfiles", "Habilidad natural"]'),
('6-7', 'pase_recepcion', 0, 7, '["Pase sin dirección", "No mira antes de pasar", "Recepción débil"]'),
('6-7', 'pase_recepcion', 8, 14, '["Pase corto efectivo", "Mejorando recepción", "Empieza a levantar la vista"]'),
('6-7', 'pase_recepcion', 15, 20, '["Pase preciso y variado", "Buena recepción orientada", "Visión incipiente de juego"]'),
('6-7', 'decision_juego', 0, 7, '["Juega solo", "No lee el juego", "Decisiones impulsivas"]'),
('6-7', 'decision_juego', 8, 14, '["Empieza a buscar compañeros", "Entiende posiciones básicas", "Mejorando lectura"]'),
('6-7', 'decision_juego', 15, 20, '["Lee situaciones simples", "Elige bien cuándo pasar", "Juego colectivo natural"]'),
-- 8-9 age group
('8-9', 'actitud_esfuerzo', 0, 7, '["Bajo compromiso", "Se rinde ante dificultad", "Actitud pasiva"]'),
('8-9', 'actitud_esfuerzo', 8, 14, '["Buen esfuerzo general", "Competitivo sano", "Acepta correcciones"]'),
('8-9', 'actitud_esfuerzo', 15, 20, '["Mentalidad ganadora", "Siempre al 100%", "Inspira al equipo"]'),
('8-9', 'disciplina_constancia', 0, 7, '["Irregular en asistencia", "Le cuesta la rutina", "Bajo enfoque"]'),
('8-9', 'disciplina_constancia', 8, 14, '["Cumple con regularidad", "Atento en ejercicios", "Mejorando enfoque"]'),
('8-9', 'disciplina_constancia', 15, 20, '["Muy constante", "Auto-disciplinado", "Llega preparado siempre"]'),
('8-9', 'autonomia_liderazgo', 0, 7, '["Espera que le digan todo", "No propone", "Poco protagonismo"]'),
('8-9', 'autonomia_liderazgo', 8, 14, '["Resuelve situaciones", "Comunica con compañeros", "Liderazgo emergente"]'),
('8-9', 'autonomia_liderazgo', 15, 20, '["Líder natural", "Organiza al equipo", "Toma responsabilidad"]'),
('8-9', 'control_conduccion', 0, 7, '["Pierde balón frecuentemente", "Solo perfil dominante", "Técnica básica"]'),
('8-9', 'control_conduccion', 8, 14, '["Buen control en estático", "Mejorando ambos perfiles", "Conducción en línea recta"]'),
('8-9', 'control_conduccion', 15, 20, '["Domina ambos perfiles", "Conducción con cambio de ritmo", "Técnica depurada"]'),
('8-9', 'pase_recepcion', 0, 7, '["Pase sin intención", "Recepción a mejorar", "No levanta la cabeza"]'),
('8-9', 'pase_recepcion', 8, 14, '["Pase con intención", "Recibe orientado", "Empieza a usar el pase largo"]'),
('8-9', 'pase_recepcion', 15, 20, '["Pase al espacio", "Control orientado excelente", "Visión de juego clara"]'),
('8-9', 'decision_juego', 0, 7, '["Individualista", "No entiende sistema", "Reacciona tarde"]'),
('8-9', 'decision_juego', 8, 14, '["Entiende roles básicos", "Decide con criterio", "Juega para el equipo"]'),
('8-9', 'decision_juego', 15, 20, '["Lectura avanzada", "Anticipación táctica", "Creador de juego"]'),
-- 10-11 age group
('10-11', 'actitud_esfuerzo', 0, 7, '["Desmotivado", "Esfuerzo mínimo", "Actitud negativa ante retos"]'),
('10-11', 'actitud_esfuerzo', 8, 14, '["Comprometido", "Buena respuesta al desafío", "Esfuerzo consistente"]'),
('10-11', 'actitud_esfuerzo', 15, 20, '["Mentalidad élite", "Liderazgo por actitud", "Resiliencia ejemplar"]'),
('10-11', 'disciplina_constancia', 0, 7, '["Irregular", "No cumple objetivos", "Falta compromiso"]'),
('10-11', 'disciplina_constancia', 8, 14, '["Responsable", "Cumple metas", "Disciplina en progreso"]'),
('10-11', 'disciplina_constancia', 15, 20, '["Auto-exigente", "Disciplina total", "Profesionalismo temprano"]'),
('10-11', 'autonomia_liderazgo', 0, 7, '["Dependiente", "Poca voz en equipo", "No asume responsabilidad"]'),
('10-11', 'autonomia_liderazgo', 8, 14, '["Autónomo en ejercicios", "Comunicador", "Asume su rol"]'),
('10-11', 'autonomia_liderazgo', 15, 20, '["Capitán natural", "Resuelve conflictos", "Mentor de menores"]'),
('10-11', 'control_conduccion', 0, 7, '["Técnica limitada", "Solo perfil fuerte", "Pierde balón bajo presión"]'),
('10-11', 'control_conduccion', 8, 14, '["Buen primer toque", "Conduce con ambos", "Técnica en desarrollo"]'),
('10-11', 'control_conduccion', 15, 20, '["Técnica refinada", "Gambeta efectiva", "Control bajo presión excelente"]'),
('10-11', 'pase_recepcion', 0, 7, '["Pase impreciso", "No varía el pase", "Recepción deficiente"]'),
('10-11', 'pase_recepcion', 8, 14, '["Pase preciso a corta", "Empieza a variar distancias", "Buen primer control"]'),
('10-11', 'pase_recepcion', 15, 20, '["Distribución excelente", "Pase filtrado efectivo", "Control y giro impecable"]'),
('10-11', 'decision_juego', 0, 7, '["No lee el juego", "Posicionamiento pobre", "Decisiones erráticas"]'),
('10-11', 'decision_juego', 8, 14, '["Entiende el sistema", "Buenas decisiones", "Posicionamiento correcto"]'),
('10-11', 'decision_juego', 15, 20, '["Inteligencia táctica alta", "Genera superioridad", "Visión de juego excepcional"]');
