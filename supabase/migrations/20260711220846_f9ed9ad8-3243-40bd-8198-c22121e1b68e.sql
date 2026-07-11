-- =====================================================================
-- MIGRACIÓN WL — Sistema de Evaluación Mensual White Lions
-- Prompt 1 de 3: SOLO base de datos. NO modificar ningún componente React.
-- =====================================================================

-- ---------- A. TABLAS ----------

CREATE TABLE IF NOT EXISTS public.wl_methodology_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_key text NOT NULL CHECK (category_key IN ('sub-5','sub-7','sub-9','sub-11','sub-13')),
  display_name text NOT NULL,
  age_range text NOT NULL,
  consolidation_threshold int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, category_key)
);

CREATE TABLE IF NOT EXISTS public.wl_monthly_indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_key text NOT NULL,
  month_key text NOT NULL CHECK (month_key IN ('ago','sep','oct','nov','dic','ene','feb','mar','abr','may','jun')),
  month_order int NOT NULL,
  eval_type text NOT NULL,
  context_note text,
  ind1_dim text, ind1_name text, ind1_source text,
  ind1_nivel1 text, ind1_nivel2 text, ind1_nivel3 text,
  ind1_frase1 text, ind1_frase2 text, ind1_frase3 text,
  ind1_is_proposed boolean DEFAULT false,
  ind2_dim text, ind2_name text, ind2_source text,
  ind2_nivel1 text, ind2_nivel2 text, ind2_nivel3 text,
  ind2_frase1 text, ind2_frase2 text, ind2_frase3 text,
  ind2_is_proposed boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, category_key, month_key)
);

CREATE TABLE IF NOT EXISTS public.wl_battery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_key text NOT NULL,
  item_number int NOT NULL CHECK (item_number BETWEEN 1 AND 15),
  dimension text NOT NULL CHECK (dimension IN ('coordinativo','conductual')),
  observable text NOT NULL,
  criterion text NOT NULL,
  window_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, category_key, item_number)
);

CREATE TABLE IF NOT EXISTS public.wl_monthly_evaluations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  category_key text NOT NULL,
  month_key text NOT NULL,
  season text NOT NULL DEFAULT '2025-2026',
  nivel_ind1 int CHECK (nivel_ind1 IN (1,2,3)),
  nivel_ind2 int CHECK (nivel_ind2 IN (1,2,3)),
  battery_results jsonb NOT NULL DEFAULT '{}'::jsonb,
  coach_note text,
  recorded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, player_id, month_key, season)
);

CREATE INDEX IF NOT EXISTS idx_wl_monthly_evals_player ON public.wl_monthly_evaluations(player_id, season);
CREATE INDEX IF NOT EXISTS idx_wl_monthly_evals_category ON public.wl_monthly_evaluations(category_id, month_key, season);

-- ---------- GRANTS ----------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_methodology_categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_monthly_indicators TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_battery_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wl_monthly_evaluations TO authenticated;
GRANT ALL ON public.wl_methodology_categories TO service_role;
GRANT ALL ON public.wl_monthly_indicators TO service_role;
GRANT ALL ON public.wl_battery_items TO service_role;
GRANT ALL ON public.wl_monthly_evaluations TO service_role;

-- ---------- B. RLS ----------

ALTER TABLE public.wl_methodology_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_monthly_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_battery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wl_monthly_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY wl_meth_cat_select ON public.wl_methodology_categories FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_org_roles r WHERE r.user_id = auth.uid() AND r.organization_id = org_id));
CREATE POLICY wl_month_ind_select ON public.wl_monthly_indicators FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_org_roles r WHERE r.user_id = auth.uid() AND r.organization_id = org_id));
CREATE POLICY wl_batt_items_select ON public.wl_battery_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_org_roles r WHERE r.user_id = auth.uid() AND r.organization_id = org_id));

CREATE POLICY wl_meth_cat_write ON public.wl_methodology_categories FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_org_roles r WHERE r.user_id = auth.uid() AND r.organization_id = org_id AND r.role IN ('org_owner','director_deportivo')));
CREATE POLICY wl_month_ind_write ON public.wl_monthly_indicators FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_org_roles r WHERE r.user_id = auth.uid() AND r.organization_id = org_id AND r.role IN ('org_owner','director_deportivo')));
CREATE POLICY wl_batt_items_write ON public.wl_battery_items FOR ALL
  USING (EXISTS (SELECT 1 FROM public.user_org_roles r WHERE r.user_id = auth.uid() AND r.organization_id = org_id AND r.role IN ('org_owner','director_deportivo')));

CREATE POLICY wl_month_eval_select ON public.wl_monthly_evaluations FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.user_org_roles r WHERE r.user_id = auth.uid() AND r.organization_id = org_id));
CREATE POLICY wl_month_eval_insert ON public.wl_monthly_evaluations FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_org_roles r WHERE r.user_id = auth.uid() AND r.organization_id = org_id AND r.role IN ('org_owner','director_deportivo','entrenador')));
CREATE POLICY wl_month_eval_update ON public.wl_monthly_evaluations FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.user_org_roles r WHERE r.user_id = auth.uid() AND r.organization_id = org_id AND r.role IN ('org_owner','director_deportivo','entrenador')));

-- ---------- C. SEED ----------

DO $$
DECLARE
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM public.organizations WHERE is_active = true ORDER BY created_at ASC LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'No se encontró organización activa para seed WL';
  END IF;

  INSERT INTO public.wl_methodology_categories (org_id, category_key, display_name, age_range, consolidation_threshold)
  VALUES (v_org, 'sub-5', 'SUB-5', '4-5 años', 50)
  ON CONFLICT (org_id, category_key) DO NOTHING;

  INSERT INTO public.wl_methodology_categories (org_id, category_key, display_name, age_range, consolidation_threshold)
  VALUES (v_org, 'sub-7', 'SUB-7', '6-7 años', 60)
  ON CONFLICT (org_id, category_key) DO NOTHING;

  INSERT INTO public.wl_methodology_categories (org_id, category_key, display_name, age_range, consolidation_threshold)
  VALUES (v_org, 'sub-9', 'SUB-9', '8-9 años', 65)
  ON CONFLICT (org_id, category_key) DO NOTHING;

  INSERT INTO public.wl_methodology_categories (org_id, category_key, display_name, age_range, consolidation_threshold)
  VALUES (v_org, 'sub-11', 'SUB-11', '10-11 años', 70)
  ON CONFLICT (org_id, category_key) DO NOTHING;

  INSERT INTO public.wl_methodology_categories (org_id, category_key, display_name, age_range, consolidation_threshold)
  VALUES (v_org, 'sub-13', 'SUB-13', '12-13 años', 75)
  ON CONFLICT (org_id, category_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'ago', 1, 'diagnostica', 'Foto de inicio. Nivel 0 permitido. En Sub-5 el diagnóstico también identifica quién llega sin experiencia previa con el balón.',
    'TÉCNICO', 'Conduce el balón con pie dominante sin perderlo', 'Rúbrica Sub-5 (literal)', 'Corre detrás del balón sin controlarlo. Patea y persigue.', 'Conduce 3-5 metros con el pie dominante antes de perderlo.', 'Conduce 5+ metros con pie dominante en juego libre, cabeza levantada ocasionalmente.', 'Está descubriendo cómo llevar el balón — todos empiezan aquí.', 'Ya lleva el balón varios metros con él.', 'El balón ya lo obedece: lo lleva consigo mientras juega, y a veces mirando el juego.', false,
    'PSICOLÓGICO', 'Corre hacia el balón activamente', 'Rúbrica Sub-5 (literal)', 'Permanece estático esperando el balón.', 'Se mueve hacia el balón ocasionalmente.', 'Busca el balón activa y consistentemente en el partido.', 'Está tomando confianza para entrar al juego.', 'Cada vez participa más — ya va por el balón.', 'Quiere el balón: lo busca durante todo el juego.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'sep', 2, 'formativa', 'Foco del mes: conducción. Observación acumulada en los juegos de los grupos A y F.',
    'TÉCNICO', 'Conduce el balón con pie dominante sin perderlo', 'Rúbrica Sub-5 (literal — misma tabla de agosto, ahora como foco activo)', 'Corre detrás del balón sin controlarlo. Patea y persigue.', 'Conduce 3-5 metros con el pie dominante antes de perderlo.', 'Conduce 5+ metros con pie dominante en juego libre, cabeza levantada ocasionalmente.', 'Está descubriendo cómo llevar el balón.', 'Ya lleva el balón varios metros con él.', 'El balón ya lo obedece: lo lleva consigo mientras juega.', false,
    'TÁCTICA EMERGENTE', 'Orienta el juego hacia la portería rival', 'Rúbrica Sub-5 (literal)', 'No distingue las porterías. Remata a cualquiera.', 'Remata a la portería correcta con recordatorio.', 'Juega con orientación hacia la portería rival de forma autónoma en 50%+ del partido.', 'Está entendiendo hacia dónde se juega — es parte del descubrimiento.', 'Ya sabe cuál es su portería cuando se le recuerda.', 'Entendió el juego: ataca la portería correcta por sí solo.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'oct', 3, 'formativa', 'Foco del mes: el pase con intención. Nunca se obliga a pasar — se celebra cuando ocurre.',
    'TÉCNICO', 'Intenta pasar al compañero con intención (no patada al azar)', 'Rúbrica Sub-5 (literal)', 'Patea al azar sin dirección clara.', 'Orienta el pase hacia un compañero aunque no llegue.', 'Pasa al compañero más cercano libre en 50%+ de las situaciones con opción de pase.', 'Todavía patea el balón para adelante — es lo natural a esta edad.', 'Ya intenta dárselo a un compañero.', 'Descubrió el pase: busca a su compañero y se lo da.', false,
    'TÁCTICA EMERGENTE', 'Juega separado del montón alguna vez', 'Derivado de Doc 04 (el juego colectivo emerge, no se prescribe) — no existe en rúbrica Sub-5', 'Siempre está dentro del montón alrededor del balón.', 'Se separa del montón cuando el diseño del juego lo provoca (2 porterías, zonas de color).', 'Se separa del montón espontáneamente al menos 2 veces por partido para recibir en espacio libre.', 'Juega donde está el balón, como todos los niños de su edad.', 'A veces ya descubre que hay espacio libre.', 'Empezó a descubrir el espacio: se separa del grupo para que le llegue el balón.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'nov', 4, 'formativa', 'Foco del mes: remate. Cierre del contenido de M1.',
    'TÉCNICO', 'Remata a portería cuando está cerca', 'Rúbrica Sub-5 (literal)', 'No reconoce la portería como objetivo.', 'Remata en dirección correcta con recordatorio.', 'Remata con intención hacia la portería espontáneamente cuando tiene el espacio libre.', 'Está descubriendo que el gol es el premio del juego.', 'Ya patea hacia la portería cuando se le anima.', 'Busca el gol solo: cuando tiene espacio, remata con intención.', false,
    'PSICOLÓGICO', 'No abandona ni llora al error — vuelve a intentarlo', 'Rúbrica Sub-5 (literal)', 'Abandona o se frustra ante el error.', 'Continúa jugando aunque se frustra brevemente.', 'Responde al error con actitud positiva — sigue intentando.', 'Está aprendiendo que equivocarse es parte de jugar.', 'Ya se recupera rápido cuando algo no le sale.', 'Los errores no lo detienen: vuelve a intentarlo con la misma alegría.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'dic', 5, 'cierre', 'Re-evaluar todos los indicadores de M1 (conducción, pase, remate, actitud) con las tablas de agosto-noviembre. Comparativa con agosto. Retroalimentación positiva antes de vacaciones.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'ene', 6, 'retorno', 'Semana de retorno: observar conducción y actitud con las tablas de M1. Después, primer contenido de M2:',
    'TÉCNICO', 'Control simple: para el balón que le llega', 'Derivado de Doc 04 (Control simple INTRO) — no existe en rúbrica Sub-5', 'El balón le rebota — no logra detenerlo.', 'Para el balón con 2-3 toques o usando todo el cuerpo.', 'Detiene el balón cerca de su pie con 1 contacto en 50%+ de los balones que le llegan en juego libre.', 'Está aprendiendo a recibir el balón — el primer gran reto.', 'Ya logra quedarse con el balón que le llega.', 'El balón que le llega, se queda con él: lo controla con un toque.', true,
    'PSICOLÓGICO', 'Atiende una instrucción simple del juego', 'Batería Conductual Sub-5, ítem 3 (mismo criterio, formato de nivel)', 'Necesita repetición individual para cada consigna.', 'Ejecuta la consigna tras repetición grupal.', 'Ejecuta una consigna de un paso a la primera, en 50%+ de las ocasiones.', 'Está aprendiendo a escuchar dentro del juego.', 'Ya sigue las instrucciones del juego con un poco de ayuda.', 'Escucha y juega: entiende la consigna a la primera.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'feb', 7, 'formativa', 'Foco del mes: el regate como descubrimiento (esquivar, no técnica formal).',
    'TÉCNICO', 'Regate básico: esquiva a un rival sin perder el balón', 'Derivado de Doc 04 (Regate básico INTRO) — no existe en rúbrica Sub-5', 'Choca con el rival o suelta el balón al verlo.', 'Esquiva al rival cuando tiene mucho espacio.', 'Supera a un rival en juego libre manteniendo el balón en 50%+ de sus intentos.', 'Está descubriendo que puede esquivar a los rivales.', 'Ya esquiva rivales cuando tiene espacio.', 'Le encanta regatear: esquiva rivales y se queda con el balón.', true,
    'TÁCTICA EMERGENTE', 'Orienta el juego hacia la portería rival', 'Rúbrica Sub-5 (literal — re-verificación de la noción emergente)', 'No distingue las porterías. Remata a cualquiera.', 'Remata a la portería correcta con recordatorio.', 'Juega con orientación hacia la portería rival de forma autónoma en 50%+ del partido.', 'Sigue afianzando hacia dónde se juega.', 'Ya reconoce su portería casi siempre.', 'La orientación del juego ya es suya: ataca la portería correcta sin ayuda.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'mar', 8, 'formativa', 'Foco del mes: el pie no dominante empieza a aparecer. Nunca se exige — se diseñan juegos que lo provocan.',
    'COORDINATIVO', 'Coordinación bilateral: usa el pie no dominante aunque sea 1 vez', 'Rúbrica Sub-5 (literal — indicador coordinativo usado como foco del mes)', 'Solo usa el pie dominante en todos los contextos.', 'Usa el pie no dominante con instrucción explícita.', 'Usa el pie no dominante espontáneamente al menos 1 vez observable en la sesión.', 'Por ahora juega con su pierna favorita, como es normal.', 'Ya prueba la otra pierna cuando el juego se lo pide.', 'Empezó a usar las dos piernas por su cuenta — una señal excelente a esta edad.', false,
    'PSICOLÓGICO', 'Disfruta la sesión de principio a fin', 'Batería Conductual Sub-5, ítem 4 (mismo criterio, formato de nivel)', 'Se distrae o se retira del juego con frecuencia.', 'Disfruta la mayoría de la sesión con momentos de desconexión.', 'Muestra disfrute visible (sonríe, celebra, pide seguir) durante toda la sesión.', 'Estamos construyendo su vínculo con el juego.', 'Cada vez disfruta más sus entrenamientos.', 'Ama venir a entrenar — y eso es el objetivo número 1 de Sub-5.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'abr', 9, 'salida_etapa', 'Re-evaluar TODOS los indicadores del año con sus tablas. Prioridad: conducción 5m (must-consolidate para Sub-6) y actitud positiva ante el error (must-consolidate). Sin indicadores nuevos.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'may', 10, 'consolidacion', 'Juego libre máximo. Carlos observa los indicadores que quedaron bajos en abril y ajusta los juegos — nunca la exigencia al niño.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-5', 'jun', 11, 'final', 'Evaluación anual completa, comparativa agosto vs junio. Alimenta el Pasaporte del Jugador y la decisión Sub-5 → Sub-6. La frase para la familia es de trayectoria anual, generada por Stryk.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'ago', 1, 'diagnostica', 'Foto de inicio. Nivel 0 permitido. Diagnóstico de quién viene de Sub-5 (trae conducción INTRO) y quién es nuevo en el sistema.',
    'TÉCNICO', 'Conducción con pie dominante: cabeza arriba, máx. 1 metro de distancia', 'Rúbrica Sub-6, Doc 07 (literal)', 'Conduce mirando el balón siempre.', 'Levanta la cabeza durante la conducción ocasionalmente.', 'Conduce con cabeza arriba en el 60%+ de los intentos en juego libre.', 'Conduce mirando el balón — el punto de partida de todos.', 'Ya levanta la mirada a ratos mientras conduce.', 'Conduce mirando el juego, no el balón — un salto enorme.', false,
    'TÁCTICO', 'Entiende que hay una portería que atacar y una que defender', 'Rúbrica Sub-6, Doc 07 (literal)', 'No distingue las porterías.', 'Orienta el juego hacia la portería rival con recordatorio.', 'Juega con orientación correcta hacia la portería rival de forma autónoma.', 'Está afianzando la dirección del juego.', 'Reconoce su portería con un pequeño recordatorio.', 'Sabe perfectamente hacia dónde se juega y hacia dónde se defiende.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'sep', 2, 'formativa', 'Foco M1 según Doc 05 banda Sub-6/7: formación base y orientación inicial. Conducción con cabeza arriba como foco técnico central.',
    'TÉCNICO', 'Conducción con cabeza arriba (foco activo)', 'Rúbrica Sub-6, Doc 07 (literal — misma tabla de agosto)', 'Conduce mirando el balón siempre.', 'Levanta la cabeza durante la conducción ocasionalmente.', 'Conduce con cabeza arriba en el 60%+ de los intentos en juego libre.', 'Conduce mirando el balón todavía.', 'Ya levanta la mirada a ratos mientras conduce.', 'Conduce mirando el juego, no el balón.', false,
    'TÁCTICO', 'Ocupa el campo sin agruparse alrededor del balón', 'Rúbrica Sub-6, Doc 07 (literal)', 'Siempre donde está el balón (agrupamiento).', 'Se separa del grupo con indicación del entrenador.', 'Ocupa el espacio libre de forma espontánea en el 60%+ del tiempo.', 'Persigue el balón como todos a su edad — de ahí partimos.', 'Ya busca su espacio cuando se le recuerda.', 'Descubrió el espacio: juega separado del montón por decisión propia.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'oct', 3, 'formativa', 'Foco: el pase con superficie correcta. La formación base (1-3-3-1 en transición hacia Sub-8) se introduce como referencia, no como obligación.',
    'TÉCNICO', 'Pase corto dirigido con borde interno al compañero libre', 'Rúbrica Sub-6, Doc 07 (literal)', 'Pase sin superficie definida.', 'Pasa con borde interno aunque no siempre al pie correcto.', 'Pasa al pie más cercano del receptor con borde interno en 7/10 intentos.', 'Sus pases salen con toda la pierna — estamos puliendo la técnica.', 'Ya usa la parte correcta del pie para pasar.', 'Pasa con técnica: borde interno y al pie del compañero.', false,
    'TÁCTICO', 'Reconoce su posición de inicio en la formación base', 'Derivado de Doc 05 (formación base M1, banda Sub-6/7) — no existe en rúbrica Sub-6', 'No sabe dónde iniciar — se coloca donde ve espacio o donde están sus amigos.', 'Se coloca en su posición cuando el entrenador la señala al inicio.', 'Va a su posición de inicio por sí solo al comenzar el partido y tras cada gol, en 60%+ de las ocasiones.', 'Está conociendo el mapa del equipo.', 'Ya encuentra su lugar cuando se le indica.', 'Sabe cuál es su lugar en el equipo y va solo a él.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'nov', 4, 'formativa', 'Cierre de contenido M1: primeras nociones de orientación al recibir y de reacción a la pérdida.',
    'TÉCNICO', 'Orientación de Balón INTRO: gira la cabeza antes de recibir', 'Derivado de Doc 04 Sec. 5.1 (Orientación DESAR adaptado a INTRO) — no existe en rúbrica Sub-6', 'Recibe sin mirar — el balón llega y después decide.', 'Gira la cabeza antes de recibir cuando el entrenador lo recuerda.', 'Gira la cabeza al menos 1 vez antes de recibir en 50%+ de las recepciones del rondo (umbral INTRO).', 'Recibe el balón y luego mira — el hábito apenas empieza.', 'Ya mira antes de recibir cuando se le recuerda.', 'Empezó a mirar antes de recibir — la semilla del jugador inteligente.', true,
    'TÁCTICO', 'Pressing 1v1 INTRO: reacciona a la pérdida del balón', 'Derivado de Doc 04 (Pressing básico INTRO, banda Sub-6/7) — no existe en rúbrica Sub-6', 'Al perder el balón se detiene o mira al entrenador.', 'Persigue el balón perdido cuando el entrenador lo anima.', 'Reacciona a la pérdida persiguiendo el balón sin señal en 50%+ de las pérdidas propias (umbral INTRO).', 'Cuando pierde el balón, todavía se queda mirando.', 'Ya lo persigue cuando se le anima.', 'Cuando pierde el balón, va por él de inmediato — sin que nadie se lo diga.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'dic', 5, 'cierre', 'Re-evaluar todos los indicadores de M1 con las tablas de agosto-noviembre. Comparativa con agosto. Cierre emocional positivo.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'ene', 6, 'retorno', 'Retorno: conducción cabeza arriba + ocupación del espacio (tablas de M1). M2 según Doc 05: pressing en pareja y movimiento tras el pase.',
    'TÉCNICO', 'Pressing en pareja INTRO: acompaña al compañero que presiona', 'Derivado de Doc 05 (Pressing 2v1 M2, banda Sub-6/7) — no existe en rúbrica Sub-6', 'Cuando un compañero presiona, él mira o se aleja.', 'Acompaña la presión cuando el entrenador lo indica.', 'Se acerca a apoyar la presión del compañero sin señal en 50%+ de las situaciones (umbral INTRO).', 'Está aprendiendo que defender es en equipo.', 'Ya acompaña a su compañero a presionar cuando se le indica.', 'Cuando un compañero presiona, él va a ayudar — defender juntos ya le nace.', true,
    'TÁCTICO', 'Desmarque básico: se mueve después de pasar', 'Derivado de Doc 05 (Desmarque M2, banda Sub-6/7) y Doc 04 — no existe en rúbrica Sub-6', 'Pasa y se queda parado mirando.', 'Se mueve tras el pase cuando el entrenador lo recuerda ("pasa y muévete").', 'Se mueve a un espacio libre después de pasar en 50%+ de sus pases (umbral INTRO).', 'Después de pasar, todavía se queda viendo la jugada.', 'Ya se mueve tras pasar cuando se le recuerda.', 'Pasa y se mueve: entendió que el juego sigue después de su pase.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'feb', 7, 'formativa', 'Foco: remate con superficie correcta y las primeras restricciones de juego de posición.',
    'TÉCNICO', 'Remate con borde interno hacia portería', 'Rúbrica Sub-6, Doc 07 (literal)', 'Golpe con la punta del pie.', 'Usa borde interno en el remate ocasionalmente.', 'Remata con borde interno en el 60%+ de los intentos cerca del área.', 'Remata con la punta, como todos al empezar.', 'Ya usa la técnica correcta de remate a veces.', 'Remata con técnica: coloca el balón, no solo lo golpea.', false,
    'TÁCTICO', 'Juego de posición básico: se mantiene en su zona de color', 'Derivado de Doc 05 (Juego posición M2, banda Sub-6/7) — no existe en rúbrica Sub-6', 'Abandona su zona constantemente para seguir el balón.', 'Vuelve a su zona cuando el entrenador o los conos se lo recuerdan.', 'Se mantiene en su zona de referencia durante el juego de posición en 60%+ del tiempo.', 'El balón todavía lo jala fuera de su zona.', 'Ya regresa a su zona con un recordatorio.', 'Respeta su zona de juego — la base del futuro posicionamiento.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'mar', 8, 'formativa', 'Cierre de M2: el pase gana calidad (peso) y aparece la primera comunicación.',
    'TÉCNICO', 'Pase con peso: el compañero lo controla sin frenarse', 'Derivado de Doc 04 Sec. 5.1 (Pase corto DESAR) — no existe en rúbrica Sub-6', 'El pase llega demasiado fuerte o demasiado suave — el receptor pierde el balón o debe frenarse.', 'El peso es correcto en ejercicios sin presión, varía en juego.', 'El receptor controla y sigue jugando sin frenarse en 60%+ de sus pases en juego.', 'Sus pases llegan, pero la fuerza aún es lotería.', 'Ya calibra la fuerza del pase en los ejercicios.', 'Sus pases llegan "servidos": el compañero los controla sin frenarse.', true,
    'TÁCTICO', 'Comunicación básica: pide el balón con voz ("¡solo!", "¡aquí!")', 'Derivado de Doc 04 (Comunicación vocal INTRO en banda Sub-6/7) — no existe en rúbrica Sub-6', 'No habla durante el juego.', 'Pide el balón cuando el entrenador anima la comunicación.', 'Pide el balón con voz espontáneamente al menos 3 veces por partido.', 'Juega en silencio todavía.', 'Ya se anima a pedir el balón.', 'Su voz apareció en la cancha: pide el balón y se hace presente.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'abr', 9, 'salida_etapa', 'Re-evaluar todo el año. Prioridad must-consolidate para Sub-8: conducción cabeza arriba (60%+), pase borde interno (7/10), ocupa el campo sin agruparse. Sin indicadores nuevos.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'may', 10, 'consolidacion', 'Autonomía y juego. Trabajo sobre los indicadores por debajo de Nivel 3 en abril.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-7', 'jun', 11, 'final', 'Evaluación anual completa, comparativa agosto vs junio. Pasaporte del Jugador y decisión de categoría. Frase de trayectoria anual generada por Stryk.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'ago', 1, 'diagnostica', 'Foto de inicio del año. Única evaluación con Nivel 0 permitido. Comparativa con la salida de Sub-7 cuando el jugador viene del sistema.',
    'TÉCNICO', 'Conducción ambos perfiles bajo presión', 'Rúbrica Sub-9, Doc 07 / Guía Sub-9 Sec. 6.1 (literal)', 'Solo usa pie dominante. Pierde el balón al cambiar de perfil.', 'Usa ambos perfiles en 50-64% de las situaciones que lo requieren.', 'Conduce con ambos perfiles manteniendo el control en 65%+ de las situaciones bajo presión.', 'Hoy conduce principalmente con su pierna dominante — es el punto de partida normal.', 'Ya empieza a usar las dos piernas para llevar el balón.', 'Conduce el balón con ambas piernas incluso cuando lo presionan.', false,
    'TÁCTICO', 'Vocabulario ZA-ZD: usa las zonas espontáneamente', 'Rúbrica Sub-9 (literal)', 'No usa el vocabulario de zonas. Solo "disponemos/recuperamos" básico.', 'Usa las zonas con apoyo visual (conos de colores) o cuando el entrenador lo pide.', 'Usa ZA-ZD de forma espontánea en el partido o en el cierre reflexivo al menos 3 veces.', 'Está conociendo el lenguaje del equipo.', 'Ya reconoce las zonas del campo cuando se le guía.', 'Habla el lenguaje del equipo por sí solo: nombra las zonas del campo durante el juego.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'sep', 2, 'formativa', 'Foco central del mesociclo: Orientación de Balón pasa a DESAR. El trigger principal se introduce. Observar en el rondo 4+1v2 (Bloque 1) y en el partido.',
    'TÉCNICO', 'Orientación de Balón: primer toque fuera del defensor más cercano', 'Rúbrica Sub-9 (literal)', 'Recibe de espaldas o el primer toque va hacia el defensor.', 'Orienta en 50-64% de recepciones en rondo con restricción activa.', 'Orienta el primer toque en 65%+ de recepciones en partido real con presión.', 'Todavía recibe el balón de espaldas al juego — es lo esperado al iniciar.', 'Ya empieza a recibir el balón mirando hacia dónde va a jugar.', 'Recibe el balón ya orientado hacia el juego, incluso con un rival encima.', false,
    'TÁCTICO', 'Trigger principal: pase atrás al portero activa pressing en <2 seg', 'Rúbrica Sub-9 (literal)', 'No reacciona al trigger o lo hace con 5+ seg de retraso.', 'Reacciona en 2-4 seg con señal o gesto del entrenador.', 'Activa el pressing en menos de 2 seg al detectar el trigger en 65%+ de las situaciones.', 'Está aprendiendo a leer las señales del juego.', 'Ya reconoce el momento de presionar cuando el entrenador se lo indica.', 'Lee el juego solo: reconoce el momento de presionar y reacciona de inmediato.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'oct', 3, 'formativa', 'Orientación de Balón se consolida como hábito. El foco pasa al pase corto y al posicionamiento en pasillos. Observar en el Juego de Posición del miércoles.',
    'TÉCNICO', 'Pase corto con peso y dirección precisos', 'Rúbrica Sub-9 (literal)', 'El pase llega pero con peso incorrecto o al pie equivocado.', 'Preciso en el 50-64% — varía bajo presión.', 'Pase preciso al pie correcto en 65%+ incluyendo situaciones con presión de 2 defensores.', 'Sus pases llegan, pero aún trabaja la precisión.', 'Sus pases son cada vez más precisos, aunque la presión todavía le afecta.', 'Da pases precisos al pie correcto del compañero, incluso bajo presión.', false,
    'TÁCTICO', 'Posicionamiento en el pasillo correcto: no ocupa el mismo pasillo que un compañero', 'Rúbrica Sub-9 (literal)', 'Sin conciencia del pasillo. Se agrupa con los compañeros.', 'Ajusta su posición con la restricción activa del juego de posición.', 'Ocupa el pasillo correcto de forma autónoma en 65%+ del partido de sesión.', 'Todavía sigue al balón como todos los niños al empezar — es parte del proceso.', 'Ya entiende dónde debe ubicarse cuando el juego se lo recuerda.', 'Ocupa su espacio en el campo por decisión propia — entiende dónde debe estar.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'nov', 4, 'formativa', 'Cierre del contenido nuevo de M1: pressing 1v1 en DESAR y trigger consolidándose. Secundarios (registrar solo si hay dato claro): regate con finta INTRO, desmarque de apoyo INTRO.',
    'TÉCNICO', 'Pressing básico 1v1: reacción en menos de 3 segundos', 'Rúbrica Sub-9 (literal)', 'Reacción de 5+ seg o sin reacción.', 'Reacciona en 3-5 seg con señal del entrenador.', 'Reacciona en menos de 3 seg en 65%+ de las pérdidas de su equipo sin señal.', 'Cuando el equipo pierde el balón, todavía tarda en reaccionar.', 'Ya reacciona a la pérdida del balón cuando se le anima.', 'Cuando su equipo pierde el balón, reacciona de inmediato sin que nadie se lo diga.', false,
    'TÁCTICO', 'Compactación sin balón: mantiene las distancias de referencia con su línea', 'Derivado de Doc 03 Sec. 10 y Guía Sub-9 Sec. 2.3 — no existe en rúbricas', 'Se separa de su línea o persigue el balón. Las distancias se rompen constantemente.', 'Se compacta con su línea cuando el entrenador o el capitán lo recuerda.', 'Mantiene las distancias de referencia con su línea sin instrucción en 65%+ de las secuencias defensivas.', 'Está aprendiendo a defender en equipo, no solo persiguiendo el balón.', 'Ya se acomoda con sus compañeros para defender cuando se lo recuerdan.', 'Defiende en bloque con su equipo: mantiene su distancia con los compañeros sin que se lo pidan.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'dic', 5, 'cierre', 'Re-evaluar TODOS los indicadores de M1 con las tablas de agosto-noviembre. Comparativa con agosto. La retroalimentación positiva antes de vacaciones es el combustible de enero (Doc 05).',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'ene', 6, 'retorno', 'Semana 1: retención con los 3 indicadores más importantes de M1 (orientación, pressing 1v1, posicionamiento). Si >50% del grupo bajó de nivel, 2 semanas de reconsolidación. Después, M2:',
    'TÉCNICO', 'Pressing coordinado 2v1: uno presiona, otro tapa canal (INTRO)', 'Rúbrica Sub-9 (literal — umbral INTRO 50%)', 'No coordina — ambos van al portador.', 'Coordina con indicación previa o señal del entrenador.', 'Activa el pressing 2v1 coordinado en 50%+ de los triggers en M2-M3.', 'Está aprendiendo que defender es un trabajo de dos, no de uno.', 'Ya coordina la presión con un compañero cuando se le indica.', 'Presiona en pareja con inteligencia: uno va al balón y él tapa el pase — o al revés.', false,
    'TÁCTICO', 'Superioridad 2v1 ofensiva: decide correctamente pasar o conducir', 'Derivado de Guía Sub-9 Sec. 4.2 y notas Stryk de ejercicios — no existe en rúbricas', 'No reconoce la superioridad — decide igual con o sin ventaja numérica.', 'Reconoce el 2v1 con señal del entrenador y a veces decide bien.', 'Decide correctamente (pasar vs conducir para fijar al defensor) en 65%+ de los 2v1 observados.', 'Está aprendiendo a reconocer cuándo su equipo tiene ventaja.', 'Ya nota cuando son dos contra uno, y empieza a aprovecharlo.', 'Reconoce la ventaja numérica y toma la decisión correcta: pasa o conduce según lo que hace el rival.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'feb', 7, 'formativa', 'Introducción del juego en profundidad y la transición ofensiva. Ambos en INTRO — umbral de Consolidado: 50%+.',
    'TÉCNICO', 'Pase en profundidad con timing correcto (INTRO)', 'Derivado de Doc 04 (mapa de progresión) y Guía Sub-9 Sec. 3.1 — no existe en rúbricas', 'No reconoce el desmarque del compañero — el pase llega tarde o no llega.', 'Reconoce el desmarque pero el timing falla: pasa demasiado pronto o demasiado tarde.', 'Ejecuta el pase al espacio con timing correcto en 50%+ de las oportunidades claras.', 'Está descubriendo el pase al espacio — el más difícil de todos.', 'Ya ve al compañero que se escapa, y está afinando el momento del pase.', 'Ve el desmarque del compañero y le pone el balón al espacio en el momento justo.', true,
    'TÁCTICO', 'Transición ofensiva: primera acción progresiva en menos de 3 seg tras recuperar', 'Derivado de Guía Sub-9 Sec. 4.2 — no existe en rúbricas', 'Tras recuperar el balón, se detiene, duda o mira al entrenador.', 'Avanza tras recuperar cuando el entrenador o el capitán lo indica.', 'Su primera acción tras recuperar es progresiva (pase adelante o conducción) en menos de 3 seg, en 65%+ de recuperaciones.', 'Está aprendiendo qué hacer justo después de recuperar el balón.', 'Ya busca atacar rápido después de recuperar, con un poco de ayuda.', 'Cuando su equipo recupera el balón, él ya está pensando en atacar: reacciona en segundos.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'mar', 8, 'formativa', 'Cierre de M2. El pressing 2v1 pasa de INTRO a DESAR: misma tabla de enero con umbral estándar Sub-9 (65%+). Foco táctico: primera autonomía real del grupo.',
    'TÉCNICO', 'Pressing coordinado 2v1 — ahora en DESAR (umbral 65%)', 'Rúbrica Sub-9 (misma tabla de enero, umbral elevado a estándar de categoría)', 'No coordina — ambos van al portador.', 'Coordina con indicación previa o señal del entrenador.', 'Activa el pressing 2v1 coordinado en 65%+ de los triggers, sin señal.', 'Sigue construyendo la presión en pareja.', 'Coordina la presión con su compañero cada vez con menos ayuda.', 'La presión en pareja ya es un hábito: la activa solo, sin señal del entrenador.', false,
    'TÁCTICO', 'Autonomía posicional parcial: el equipo se organiza solo', 'Derivado de Guía Sub-9 Sec. 4.2/6.2 — no existe en rúbricas', 'Necesita corrección posicional constante del entrenador.', 'El grupo se reorganiza tras 1 recordatorio del entrenador o del capitán.', 'El jugador corrige su posición y la de un compañero sin intervención del entrenador en 65%+ de las secuencias.', 'Está aprendiendo a ubicarse sin depender del entrenador.', 'Ya corrige su posición con un solo recordatorio.', 'Se organiza solo y ayuda a organizar a sus compañeros — el entrenador casi no interviene.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'abr', 9, 'salida_etapa', 'Re-evaluar TODOS los indicadores del año. Prioridad: Orientación de Balón (Nivel 3), triggers sin señal, posicionamiento autónomo en pasillos. Sin indicadores nuevos.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'may', 10, 'consolidacion', 'Silencio metodológico: el entrenador observa, no corrige. Trabajo sobre indicadores por debajo de Nivel 3 en abril.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-9', 'jun', 11, 'final', 'Todos los indicadores, comparativa agosto vs junio, revisión conjunta DD + entrenador. Alimenta el Pasaporte del Jugador. Frase de trayectoria anual generada por Stryk.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'ago', 1, 'diagnostica', 'Formato F7. Diagnóstico: orientación, pressing, pase en rondo 5v2 posicional. Nivel 0 permitido para jugadores nuevos en el sistema.',
    'TÉCNICO', 'Orientación de Balón — automatismo bajo presión alta', 'Rúbrica Sub-11 (literal)', 'Primer toque sin orientación en 50%+ de las recepciones con presión.', 'Orienta en 50-69% de recepciones con presión activa.', 'Primer toque orientado en 70%+ de recepciones en partido con presión alta real.', 'Bajo presión, todavía recibe sin orientarse.', 'Su primer toque ya suele buscar el espacio libre.', 'Recibir orientado ya es un automatismo: lo hace incluso bajo presión alta.', false,
    'TÁCTICO', 'Triggers 1-3: reconoce las tres señales de presión', 'Derivado de Guía Sub-11 Sec. 3.3 (salida: triggers 70%+) — descriptor no existe como tabla en la rúbrica', 'No reconoce ninguna señal — presiona por impulso o no presiona.', 'Reconoce los triggers cuando Jaime los señala; activa 1 de los 3 sin ayuda.', 'Reconoce y activa los 3 triggers sin señal en 70%+ de las situaciones observadas.', 'Está aprendiendo a leer las señales del juego.', 'Ya reconoce algunas señales de presión por sí solo.', 'Lee el partido: identifica las 3 señales de presión y reacciona sin que nadie se lo diga.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'sep', 2, 'formativa', 'Formatos F7+F9+F11. Orientación de Balón como foco de consolidación definitiva. Triggers activos.',
    'TÉCNICO', 'Orientación de Balón — automatismo (foco de consolidación)', 'Rúbrica Sub-11 (literal — misma tabla de agosto, foco activo)', 'Primer toque sin orientación en 50%+ de las recepciones con presión.', 'Orienta en 50-69% de recepciones con presión activa.', 'Primer toque orientado en 70%+ de recepciones en partido con presión alta real.', 'Bajo presión, todavía recibe sin orientarse.', 'Su primer toque ya suele buscar el espacio libre.', 'Recibir orientado ya es automatismo — el sello del jugador White Lions.', false,
    'TÁCTICO', 'Triggers 1-3 activos sin señal (foco activo)', 'Derivado de Guía Sub-11 Sec. 3.3 — misma tabla de agosto', 'No reconoce ninguna señal.', 'Reconoce los triggers con señal; activa 1 de 3 solo.', 'Activa los 3 triggers sin señal en 70%+ de las situaciones.', 'Sigue construyendo la lectura de señales.', 'Ya activa parte de la presión por su cuenta.', 'Los 3 triggers son suyos: los activa sin instrucción.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'oct', 3, 'formativa', 'Formatos F9+F11. El pase en profundidad sube a DESAR y aparece el concepto central de la pareja delantera.',
    'TÉCNICO', 'Pase en profundidad — timing correcto', 'Rúbrica Sub-11 (literal)', 'No reconoce cuándo lanzar. Siempre pasa tarde o muy pronto.', 'Pasa en profundidad con señal del compañero. El 50% con timing correcto.', 'Lanza en profundidad cuando el receptor arranca (no cuando pide) en 70%+ de situaciones.', 'El pase al espacio todavía le llega tarde o temprano.', 'Ya conecta el pase profundo cuando el compañero se lo señala.', 'Domina el pase al espacio: lanza en el instante en que el compañero arranca.', false,
    'TÁCTICO', 'Arrastre-Ruptura: la pareja delantera coordina el movimiento (INTRO)', 'Derivado de Guía Sub-11 Sec. 3.1 y ejercicios Grupo D — no existe como tabla en la rúbrica', 'Los 2 delanteros se mueven igual — ninguno arrastra, ninguno rompe.', 'Ejecutan arrastre-ruptura cuando Jaime lo indica antes de la jugada.', 'La pareja coordina arrastre-ruptura sin indicación en 50%+ de las situaciones de ataque posicional (umbral INTRO).', 'Está conociendo el movimiento en pareja del ataque.', 'Ya coordina con su pareja cuando se lo plantean.', 'Entiende el juego en pareja: uno arrastra al defensor y el otro rompe al espacio.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'nov', 4, 'formativa', 'Formatos F7+F11. Regate en zonas de creatividad y la transición ofensiva como hábito.',
    'TÉCNICO', 'Regate con finta en ZC/ZD', 'Rúbrica Sub-11 (literal)', 'No usa finta. Choca con el defensor directamente.', 'Usa finta con 30-59% de éxito en 1v1 con defensor activo.', 'Regate con finta genera ventaja (supera o libera espacio) en 60%+ de sus 1v1 en ZC/ZD.', 'En el 1v1 todavía va directo al choque.', 'Sus fintas ya empiezan a funcionar.', 'Su regate genera ventaja real: supera rivales o libera espacio donde el sistema lo permite.', false,
    'TÁCTICO', 'Transición ofensiva: primera acción progresiva en menos de 3 seg tras recuperar', 'Derivado de Guía Sub-11 Sec. 3.1 — no existe como tabla en la rúbrica (umbral 70%)', 'Tras recuperar, se detiene, duda o retrocede sin necesidad.', 'Avanza tras recuperar con indicación de Jaime o del capitán.', 'Primera acción progresiva en menos de 3 seg en 70%+ de las recuperaciones.', 'Después de recuperar, todavía duda qué hacer.', 'Ya busca atacar rápido tras recuperar, con recordatorios.', 'Recupera y ataca: sus primeros 3 segundos tras el robo son siempre hacia adelante.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'dic', 5, 'cierre', 'Re-evaluar todo M1 (orientación, triggers, pase profundidad, arrastre-ruptura, regate, transición) con las tablas de agosto-noviembre. Comparativa con agosto.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'ene', 6, 'retorno', 'Retorno en F7: retención de orientación, pressing y vocabulario (tablas M1). Arranque M2 en F7+F9:',
    'TÉCNICO', 'Pase entre líneas ZC (INTRO)', 'Derivado de Guía Sub-11 Sec. 3.1/3.2 — no existe como tabla en la rúbrica (umbral INTRO 50%)', 'No identifica el pasillo interior — juega siempre por fuera o hacia atrás.', 'Ejecuta el pase entre líneas cuando Jaime marca el momento.', 'Filtra el pase entre líneas al compañero en ZC en 50%+ de las ventanas claras (umbral INTRO).', 'Está descubriendo el pase más valioso del fútbol: el que rompe líneas.', 'Ya ve el pasillo interior cuando se lo señalan.', 'Ve y ejecuta el pase entre líneas — el pase que cambia partidos.', true,
    'TÁCTICO', 'Las 3 funciones de recuperación (INTRO): presionar, tapar canales, líneas intermedias', 'Derivado de Guía Sub-11 Sec. 3.1 — no existe como tabla en la rúbrica (umbral INTRO 50%)', 'Solo conoce una función: ir al balón. Todos presionan al portador.', 'Ocupa la función que Jaime le asigna en la jugada.', 'Reconoce y ocupa la función que le corresponde (presionar / tapar / línea intermedia) sin asignación en 50%+ de las recuperaciones (umbral INTRO).', 'Al defender, todavía solo piensa en ir al balón.', 'Ya cumple el rol defensivo que se le asigna.', 'Entiende la defensa como sistema: sabe cuál de las 3 funciones le toca en cada jugada.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'feb', 7, 'formativa', 'Formatos F9+F11. El arrastre-ruptura sube a DESAR (misma tabla de octubre, umbral 70%) y los laterales aprenden su dilema.',
    'TÉCNICO', 'Arrastre-Ruptura DESAR (misma tabla de octubre, umbral 70%)', 'Derivado — tabla de octubre con umbral elevado', 'Los 2 delanteros se mueven igual.', 'Coordinan con indicación previa.', 'La pareja coordina arrastre-ruptura sin indicación en 70%+ de las situaciones.', 'Sigue construyendo el movimiento en pareja.', 'La coordinación con su pareja mejora cada semana.', 'El arrastre-ruptura ya es hábito de la pareja delantera.', true,
    'TÁCTICO', 'Laterales en F11: cuándo subir y cuándo quedarse', 'Derivado de Guía Sub-11 Sec. 3.3 (salida: 50%+) y ficha 7.2 — no existe como tabla en la rúbrica', 'Sube siempre o nunca — sin lectura del momento. Los 2 laterales arriba al mismo tiempo.', 'Decide bien cuándo subir con indicación de Jaime o del capitán.', 'Decide correctamente subir o quedarse según la situación en 50%+ de las secuencias, y nunca los 2 laterales arriba a la vez.', 'Está aprendiendo el dilema del lateral: ¿ataco o cuido?', 'Ya elige bien cuándo subir con un poco de ayuda.', 'Lee su momento: sube cuando debe y protege cuando toca.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'mar', 8, 'formativa', 'Los 3 formatos. El pressing 2v1 llega a su exigencia de categoría y aparece la autonomía posicional.',
    'TÉCNICO', 'Pressing 2v1 — coordinado en menos de 3 seg', 'Rúbrica Sub-11 (literal)', 'No coordina. Ambos jugadores van al portador.', 'Coordina con indicación o señal previa. 50%+ en los triggers.', 'Activa pressing 2v1 coordinado en menos de 3 seg en 70%+ de los triggers del partido.', 'La presión en pareja aún se desordena.', 'Coordina la presión con señal previa.', 'La presión en pareja es automática: uno va al balón, el otro corta el pase — en 3 segundos.', false,
    'TÁCTICO', 'Percepción espacial avanzada: se posiciona correctamente en los 3 formatos sin instrucción', 'Rúbrica Sub-11 (literal — indicador coordinativo-táctico)', 'No sabe dónde posicionarse cuando cambia de formato.', 'Se posiciona con recordatorio al inicio del partido.', 'Se posiciona autónomamente en el pasillo correcto en F7, F9 y F11 en 65%+ del partido.', 'Cada cambio de formato todavía lo desubica.', 'Ya encuentra su posición con un recordatorio al inicio.', 'Juegue el formato que juegue, sabe exactamente dónde pararse — sin que nadie se lo diga.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'abr', 9, 'salida_etapa', 'Re-evaluación total contra el estándar de salida Sub-11 (Sec. 3.3): orientación CONS 70%+, triggers 1-3 sin señal 70%+, pressing 2v1 70%+, posicionamiento 3 formatos 70%+, vocabulario espontáneo. Sin indicadores nuevos.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'may', 10, 'consolidacion', 'Silencio metodológico. Jaime observa; el capitán gestiona. Trabajo sobre indicadores bajo Nivel 3 en abril.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-11', 'jun', 11, 'final', 'Evaluación anual completa, comparativa agosto vs junio. Pasaporte del Jugador y decisión Sub-11 → Sub-13 con revisión conjunta DD + entrenador.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'ago', 1, 'diagnostica', 'Diagnóstico de todo el catálogo técnico en el rondo 7v3 y el partido libre. Los 5 triggers en diagnóstico.',
    'TÉCNICO', 'Todo el catálogo técnico en partido con oposición real', 'Rúbrica Sub-13 (literal)', 'Algunos fundamentos aún en Nivel 1-2 en partido.', 'La mayoría en Nivel 2-3. 1-2 fundamentos todavía en Nivel 2.', 'Todos los fundamentos del catálogo en Nivel 3 en partido real con presión alta.', 'El diagnóstico muestra qué fundamentos necesitan el año.', 'La mayoría de su técnica ya está al nivel del sistema.', 'Su técnica completa está consolidada — el año se dedica a la autonomía.', false,
    'TÁCTICO', 'Los 5 triggers: diagnóstico de reconocimiento y activación', 'Derivado de Rúbricas Doc 07 Sec. 6.1 (egreso: 5 triggers 75%+) — no existe como tabla en la rúbrica Sub-13', 'Reconoce y activa 2 o menos de los 5 triggers.', 'Activa 3-4 triggers, alguno todavía con señal.', 'Activa los 5 triggers sin señal en 75%+ de las situaciones observadas.', 'El diagnóstico define qué señales del juego debe automatizar este año.', 'Domina la mayoría de las señales de presión del sistema.', 'Lee el partido completo: las 5 señales de presión son automáticas.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'sep', 2, 'formativa', 'El pase entre líneas entra al catálogo y el triángulo aprende sus variantes.',
    'TÉCNICO', 'Pase entre líneas ZC (INTRO→DESAR)', 'Derivado de Guía Sub-13 Sec. 4.2 y ejercicios — no existe como tabla en la rúbrica Sub-13 (umbral DESAR en construcción, meta 75% a fin de año)', 'No identifica el pasillo interior — juega por fuera o hacia atrás.', 'Filtra el pase entre líneas en 55-74% de las ventanas claras.', 'Filtra el pase entre líneas en 75%+ de las ventanas claras en partido.', 'Está incorporando el pase que rompe líneas.', 'Ya filtra pases interiores con regularidad.', 'El pase entre líneas es parte de su repertorio de partido.', true,
    'TÁCTICO', 'Variantes del triángulo: vértice arriba / vértice abajo (INTRO)', 'Derivado de Guía Sub-13 ejercicios Grupo D y Modelo Posicional — no existe como tabla en la rúbrica', 'No distingue las variantes — el triángulo es estático.', 'Cambia de variante cuando Carlos o el 6 lo anuncian.', 'Reconoce el momento del partido y cambia de variante con el llamado del 6, ejecutando su rol correcto en 55%+ de los cambios (umbral en construcción).', 'Está conociendo las dos formas del mediocampo.', 'Ya cambia de estructura cuando se anuncia.', 'Entiende cuándo el equipo ataca con vértice arriba y cuándo construye con vértice abajo — y ejecuta su rol.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'oct', 3, 'formativa', 'El centro llega a consolidación y la defensa se organiza en sus 3 funciones.',
    'TÉCNICO', 'Centro desde la banda — timing y palo correcto', 'Rúbrica Sub-13 (literal)', 'No identifica el palo correcto. Centro sin criterio de destino.', 'Centra al palo correcto con orientación del entrenador o señal del delantero.', 'Centra al palo correcto según la posición del delantero en 65%+ de las oportunidades de manera autónoma.', 'Sus centros aún no tienen destinatario claro.', 'Ya elige el palo correcto con ayuda.', 'Sus centros son pases: lee dónde está el delantero y pone el balón ahí.', false,
    'TÁCTICO', 'Las 3 funciones de recuperación (DESAR): ocupa su función sin asignación', 'Derivado de Guía Sub-13 Sec. 4.2 — no existe como tabla en la rúbrica (umbral DESAR 55-74%, meta CONS nov)', 'Solo conoce ir al balón.', 'Ocupa su función en 55-74% de las recuperaciones sin asignación.', 'Ocupa la función correcta (presionar / tapar / línea intermedia) sin asignación en 75%+ de las recuperaciones.', 'La defensa como sistema está en construcción.', 'Casi siempre ocupa su rol defensivo sin que se le asigne.', 'La defensa organizada es automática: sabe siempre cuál de las 3 funciones le toca.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'nov', 4, 'formativa', 'Cierre de M1: las 3 funciones deben llegar a CONS (misma tabla de octubre, exigir Nivel 3) y las variantes del triángulo suben a DESAR (misma tabla de septiembre, umbral 55-74% ejecutado consistentemente).',
    'TÉCNICO', 'Regate con finta — consolidación Sub-13', 'Derivado de Rúbrica Sub-11 (literal) con umbral Sub-13 — la rúbrica Sub-13 lo integra en "todo el catálogo"', 'No usa finta. Choca con el defensor directamente.', 'La finta genera ventaja en 55-74% de sus 1v1 en ZC/ZD.', 'La finta genera ventaja (supera o libera espacio) en 75%+ de sus 1v1 en ZC/ZD en partido.', 'El 1v1 directo sigue siendo su recurso.', 'Sus fintas funcionan la mayoría de las veces.', 'Su regate es un arma consolidada: genera ventaja casi siempre que lo intenta.', true,
    'TÁCTICO', 'Transición ofensiva/defensiva autónoma', 'Derivado de Guía Sub-13 Sec. 4.2 y Doc 07 Sec. 6.1 (egreso: transiciones 70%+) — no existe como tabla en la rúbrica Sub-13', 'Las transiciones dependen de la voz de Carlos.', 'Transiciona correctamente en 55-74% de los cambios de posesión sin instrucción.', 'Transiciona (ataque↔defensa) correctamente y sin instrucción en 75%+ de los cambios de posesión.', 'Los cambios de ritmo del partido todavía lo toman por sorpresa.', 'Casi siempre reacciona bien al cambio de posesión.', 'Las transiciones son suyas: cambia de rol al instante, sin una sola indicación.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'dic', 5, 'cierre', 'Re-evaluar todo M1. En Sub-13, Nivel 2 sostenido en cualquier indicador principal = ajuste de método en enero, no avance.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'ene', 6, 'retorno', 'Retorno: rondo 7v3 lúdico + partido libre; diagnóstico de retención y organización autónoma. Arranque M2:',
    'TÉCNICO', 'Combinaciones de área: definir en máximo 4 toques entre 3', 'Derivado de ejercicios Guía Sub-13 (Grupo C: 3 atacantes, máx 4 toques) — no existe como tabla en la rúbrica', 'Las combinaciones en el área siempre exceden los 4 toques — el defensor llega.', 'Combina en 4 toques en el ejercicio; en partido lo logra en 55-74% de las llegadas claras.', 'Combina y define en máximo 4 toques en 75%+ de las llegadas claras al área en partido.', 'La velocidad de definición en el área está en construcción.', 'Sus combinaciones en el área son cada vez más rápidas.', 'En el área piensa rápido: combina y define antes de que la defensa se organice.', true,
    'TÁCTICO', 'Contra-presión coordinada en ZD: 3 segundos', 'Rúbrica Sub-13 (literal)', 'Sin contra-presión organizada. Cada jugador reacciona solo.', 'Contra-presión activada pero sin coordinación entre los 3.', 'Contra-presión coordinada por los 3 jugadores en menos de 3 seg en 75%+ de las pérdidas en ZD.', 'Tras perder el balón arriba, todavía reacciona en solitario.', 'La reacción a la pérdida ya es colectiva, aunque falta coordinación.', 'Al perder el balón cerca del gol rival, el equipo cae encima coordinado en 3 segundos — presión de élite.', false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'feb', 7, 'formativa', 'El tiro de primera entra al partido y el balón parado se sistematiza.',
    'TÉCNICO', 'Tiro de primera — ejecución en partido real', 'Rúbrica Sub-13 (literal)', 'No ejecuta el tiro de primera en partido. Controla siempre.', 'Ejecuta el tiro de primera en situaciones controladas.', 'Tiro de primera con intención y dirección en partido real en 60%+ de las situaciones de tiro de primera.', 'El tiro sin control todavía no aparece en partido.', 'Ya ejecuta de primera en situaciones favorables.', 'Remata de primera cuando el partido lo pide — decisión y técnica en un solo gesto.', false,
    'TÁCTICO', 'Pelota parada básica: ejecuta su rol en córner y saque de banda ensayados', 'Derivado de Guía Sub-13 Sec. 4.2 — no existe como tabla en la rúbrica', 'No recuerda su rol en las jugadas ensayadas.', 'Ejecuta su rol con recordatorio previo a la jugada.', 'Ejecuta su rol en la jugada ensayada sin recordatorio en 75%+ de las pelotas paradas.', 'Las jugadas ensayadas están en proceso de memorización.', 'Ya cumple su rol en el balón parado con un recordatorio.', 'El balón parado es un arma del equipo: cada quien sabe su papel, y él cumple el suyo.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'mar', 8, 'formativa', 'Cierre M2: las acciones sin balón llegan a consolidación y la autonomía se vuelve total. Variantes del triángulo a CONS (tabla de septiembre, Nivel 3 exigido).',
    'TÉCNICO', 'Acciones sin balón conscientes (CONS)', 'Derivado de Doc 04 (Acciones sin balón CONS en S13) — no existe como tabla en la rúbrica Sub-13', 'Entre acciones con balón, se desconecta: camina o mira.', 'Sus movimientos sin balón son útiles en 55-74% de las secuencias (apoyo, arrastre, cobertura).', 'Cada movimiento sin balón tiene propósito (apoyo, arrastre, cobertura, línea de pase) en 75%+ de las secuencias observadas.', 'Su juego todavía vive solo cuando tiene el balón.', 'Ya participa del juego aunque el balón esté lejos.', 'Juega los 90 minutos, no solo sus toques: sin balón siempre está haciendo algo útil para el equipo.', true,
    'TÁCTICO', 'Autonomía total: el equipo se organiza en los primeros 30 seg sin instrucción', 'Derivado de Guía Sub-13 (ficha 7.2 y Sec. 1.1) — no existe como tabla en la rúbrica', 'La organización inicial depende de Carlos.', 'Se organizan solos tras una orientación breve.', 'El equipo se organiza (posiciones, roles, variante del triángulo) en los primeros 30 seg sin una palabra de Carlos, en 75%+ de los partidos.', 'La organización del equipo todavía necesita al entrenador.', 'El equipo casi se organiza solo.', 'La prueba máxima del sistema: el equipo se organiza completamente solo. El entrenador solo observa.', true)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'abr', 9, 'salida_etapa', 'Silencio metodológico total. Re-evaluar contra el estándar de EGRESO (Doc 07): todo el catálogo Nivel 3, autonomía táctica total, liderazgo vocal, explica el modelo completo. El capitán dirige.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'may', 10, 'consolidacion', 'Carlos no interviene. Cada sesión alimenta el Pasaporte de Egreso: registrar qué indicadores de egreso se confirman.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_monthly_indicators (org_id, category_key, month_key, month_order, eval_type, context_note,
    ind1_dim, ind1_name, ind1_source, ind1_nivel1, ind1_nivel2, ind1_nivel3, ind1_frase1, ind1_frase2, ind1_frase3, ind1_is_proposed,
    ind2_dim, ind2_name, ind2_source, ind2_nivel1, ind2_nivel2, ind2_nivel3, ind2_frase1, ind2_frase2, ind2_frase3, ind2_is_proposed)
  VALUES (v_org, 'sub-13', 'jun', 11, 'salida_etapa', 'Evaluación final: el jugador explica el sistema completo (indicador psicológico literal de la rúbrica: explica el modelo White Lions a un jugador nuevo con vocabulario correcto). Pasaporte de Egreso entregado. Cierre emocional.',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false,
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false)
  ON CONFLICT (org_id, category_key, month_key) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 1, 'coordinativo', 'Equilibrio estático en 1 pie', 'Se mantiene en un pie 5 segundos sin apoyo, cada pierna, al menos 1 intento logrado.', 'Equilibrio (MÁXIMA)')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 2, 'coordinativo', 'Salto bipodal con aterrizaje', 'Salta con los 2 pies y aterriza sin caerse ni apoyar las manos.', 'Equilibrio + esquema corporal')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 3, 'coordinativo', 'Salto unipodal', 'Da 3 saltos seguidos en un pie sin apoyar el otro (pie dominante basta para SÍ).', 'Equilibrio (MÁXIMA)')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 4, 'coordinativo', 'Cambio de dirección corriendo', 'Cambia de dirección en carrera sin detenerse por completo ni caer.', 'Equilibrio dinámico')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 5, 'coordinativo', 'Carrera hacia atrás', 'Corre hacia atrás 5 metros sin caerse.', 'Esquema corporal')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 6, 'coordinativo', 'Contacto con balón en movimiento', 'Contacta el balón en movimiento sin perderlo en el 50%+ de los intentos en juego libre.', 'Ojo-pie (MÁXIMA) · Rúbrica Sub-5')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 7, 'coordinativo', 'Levantarse y arrancar', 'Desde el suelo, se levanta y arranca a correr en menos de 2 segundos.', 'Esquema corporal')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 8, 'coordinativo', 'Lanzar y atrapar', 'Lanza una pelota hacia arriba y la atrapa con las 2 manos, 2 de 3 intentos.', 'Ojo-mano / esquema corporal')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 9, 'coordinativo', 'Imitación motriz', 'Imita un gesto corporal del entrenador (tocar rodilla contraria, girar, saltar) sin demostración repetida.', 'Esquema corporal (MÁXIMA)')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 10, 'coordinativo', 'Skipping imitado', 'Reproduce un skipping básico (rodillas arriba) durante 5 metros, aunque sin ritmo perfecto.', 'Coordinación segmentaria')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 11, 'conductual', 'Busca el balón activamente', 'Se mueve hacia el balón por iniciativa propia durante el partido — no permanece estático.', 'Doc 01 · Rúbrica Sub-5')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 12, 'conductual', 'Responde al error sin abandonar', 'Tras un error o caída, vuelve al juego sin llorar ni retirarse (frustración breve cuenta como SÍ).', 'Doc 01 · Descubrimiento')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 13, 'conductual', 'Atiende una instrucción simple', 'Ejecuta una consigna de un paso ("lleva el balón al cono") sin repetición individual.', 'Atención básica')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 14, 'conductual', 'Disfruta la sesión', 'Muestra señales visibles de disfrute (sonríe, celebra, pide seguir) en la mayoría de la sesión.', 'Doc 01 · Vínculo con el juego')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-5', 15, 'conductual', 'Comparte el juego', 'Al menos una vez por sesión pasa el balón o cede el turno sin intervención del entrenador.', 'Socialización inicial')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 1, 'coordinativo', 'Equilibrio estático en 1 pie', 'Se mantiene 10 segundos en cada pie sin apoyo.', 'Equilibrio (ALTA)')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 2, 'coordinativo', 'Salto unipodal continuo', 'Da 5 saltos seguidos en un pie manteniendo la línea, con cada pie.', 'Equilibrio + fuerza reactiva lúdica')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 3, 'coordinativo', 'Skipping con ritmo', 'Skipping alternado 10 metros con ritmo constante (rodillas arriba, sin trabarse).', 'Coordinación segmentaria')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 4, 'coordinativo', 'Galope lateral ambos lados', 'Se desplaza en galope lateral 8 metros hacia cada lado sin cruzar los pies.', 'Esquema corporal')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 5, 'coordinativo', 'Carrera hacia atrás + giro', 'Corre hacia atrás 8 metros y gira 180° sin caer ni detenerse por completo.', 'Esquema corporal + equilibrio')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 6, 'coordinativo', 'Aterrizaje estable', 'Salta desde parado con 2 pies y aterriza con rodillas flexionadas, sin colapsar ni dar pasos extra.', 'Control de aterrizaje')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 7, 'coordinativo', 'Conducción con cambio de dirección', 'Conduce el balón cambiando de dirección con la cabeza arriba en el 50%+ de los cambios.', 'Ojo-pie (MÁXIMA) · Doc 04')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 8, 'coordinativo', 'Recepción aérea con manos', 'Atrapa un balón lanzado por el entrenador a media altura, 3 de 4 intentos.', 'Ojo-mano / percepción temporal')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 9, 'coordinativo', 'Zancada caminando', 'Realiza 6 zancadas caminando (lunge) sin perder el equilibrio ni apoyar la rodilla con golpe.', 'Fuerza-equilibrio lúdica')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 10, 'coordinativo', 'Reacción a señal visual', 'Cambia de dirección al gesto del entrenador (sin voz) en menos de 2 segundos.', 'Orientación espacial (abriendo)')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 11, 'conductual', 'Reintenta tras el error', 'Después de perder el balón o fallar, vuelve a intentarlo de inmediato sin detenerse.', 'Doc 01 · Sub-6+')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 12, 'conductual', 'Esfuerzo constante', 'Mantiene la misma intensidad en los últimos 10 minutos de la sesión que al inicio.', 'Doc 01 · Constancia')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 13, 'conductual', 'Celebra al compañero', 'Al menos una vez por sesión celebra o anima a un compañero espontáneamente.', 'Vínculo de equipo')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 14, 'conductual', 'Escucha sin interrumpir', 'Atiende la explicación del ejercicio sin tocar el balón ni interrumpir (con recordatorio grupal máximo).', 'Atención')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-7', 15, 'conductual', 'Tolera perder', 'Termina un juego reducido perdiendo sin conflicto, llanto sostenido ni abandono.', 'Doc 01 · Actitud ante el error')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 1, 'coordinativo', 'Sentadilla unipodal a media altura', 'Baja hasta media sentadilla en un pie y sube sin apoyar el otro pie, cada pierna, 1 repetición limpia.', 'Fuerza-equilibrio')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 2, 'coordinativo', 'Zancada caminando 10 pasos', 'Realiza 10 zancadas continuas con tronco vertical y sin pérdida de equilibrio.', 'Control postural')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 3, 'coordinativo', 'Aterrizaje unipodal', 'Salta y aterriza en un solo pie manteniendo la posición 2 segundos, cada pie.', 'Control de aterrizaje')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 4, 'coordinativo', 'Salto lateral a aros en orden señalado', 'Ejecuta la secuencia de aros que el entrenador señala en tiempo real sin error (estación E2).', 'Orientación espacial (MÁXIMA)')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 5, 'coordinativo', 'Carrera de espaldas + giro a señal', 'Corre de espaldas y gira 90° al aplauso sin perder el equilibrio (estación E3).', 'Esquema corporal + reacción')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 6, 'coordinativo', 'Localización topográfica', 'Identifica en qué zona está (ZA-ZD) sin ayuda del entrenador cuando se le pregunta en movimiento.', 'Orientación espacial · Rúbrica Sub-9')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 7, 'coordinativo', 'Conducción con decisión a grito de zona', 'Al grito de una zona, conduce hacia ella en menos de 2 segundos sin perder el balón (estación E6).', 'Orientación + ojo-pie')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 8, 'coordinativo', 'Reacción con cambio de decisión', 'Cambia de decisión (pase vs conducción) en menos de 2 segundos ante presión activa.', 'Velocidad de reacción (abriendo)')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 9, 'coordinativo', 'Carretilla en parejas 5 m', 'Sostiene su peso corporal en carretilla 5 metros sin colapsar (fuerza general por juego).', 'Fuerza lúdica — sin trabajo formal')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 10, 'coordinativo', 'Secuencia rítmica de apoyos', 'Reproduce una secuencia de 3 apoyos en escalera o aros (ej. dentro-dentro-fuera) tras 1 demostración.', 'Percepción temporal / ritmo')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 11, 'conductual', 'Reacción a la pérdida', 'Reacciona a la pérdida del balón en menos de 2 segundos: presiona o se reposiciona sin instrucción.', 'Doc 01 · Sub-8+')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 12, 'conductual', 'Gestión gestual del error', 'No cambia gestos ni postura ante errores propios: no cabizbaja, no patalea, continúa.', 'Doc 01 · Sub-8+')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 13, 'conductual', 'Escaneo previo', 'Mira sobre el hombro al menos 1 vez antes de recibir en el 50%+ de las recepciones observadas.', 'Control de la atención')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 14, 'conductual', 'Comunicación en juego', 'Comunica verbalmente (pide el balón, avisa "¡solo!", nombra zona) al menos 3 veces por partido.', 'Rúbrica Sub-9')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-9', 15, 'conductual', 'Acepta y aplica feedback', 'Tras una corrección individual, ajusta el comportamiento en la siguiente repetición observada.', 'Coachabilidad')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 1, 'coordinativo', 'Sentadilla unipodal estable', 'Media sentadilla en un pie, 3 repeticiones limpias por pierna, sin que la rodilla colapse hacia adentro.', 'Fuerza-equilibrio / prevención')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 2, 'coordinativo', 'Zancada caminando 20 pasos', '20 zancadas continuas con tronco vertical y control total.', 'Control postural')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 3, 'coordinativo', 'Aterrizaje unipodal tras giro', 'Salta con giro de 180° y aterriza en un pie manteniendo la posición 2 segundos.', 'Control de aterrizaje avanzado')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 4, 'coordinativo', 'Salto + control aéreo orientado', 'Salta, recibe balón aéreo y su primer contacto queda orientado a la zona señalada.', 'Percepción temporal + ojo-pie')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 5, 'coordinativo', 'Reacción visual < 1 segundo', 'Cambia de dirección ante estímulo visual (sin voz) en menos de 1 segundo.', 'Velocidad de reacción (MÁXIMA)')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 6, 'coordinativo', 'Secuencia rítmica de 4 apoyos', 'Reproduce secuencia de 4 apoyos en escalera a ritmo alto tras 1 demostración, sin error.', 'Percepción temporal')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 7, 'coordinativo', 'Frenado y re-arranque', 'Corre de espaldas a velocidad, frena, gira y arranca al frente sin pasos de ajuste excesivos.', 'Esquema corporal + reacción')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 8, 'coordinativo', 'Fuerza general lúdica', '5 lagartijas con cuerpo alineado (cadera no cae ni sube) — como reto lúdico, no serie formal.', 'Fuerza general — ventana condicional cerrada')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 9, 'coordinativo', 'Anticipación motriz en 1v1', 'Anticipa el movimiento del rival antes de que complete la acción en el 60%+ de los duelos observados.', 'Anticipación · Rúbrica')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 10, 'coordinativo', 'Doble escaneo antes de recibir', 'Mira 2 veces (dos direcciones) antes de recibir en el 50%+ de las recepciones.', 'Cognitivo-coordinativa (abriendo)')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 11, 'conductual', 'Rendimiento con marcador adverso', 'Mantiene intensidad y participación cuando su equipo va perdiendo.', 'Doc 01 · Sub-10+')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 12, 'conductual', 'Organización verbal', 'Organiza verbalmente al menos a un compañero por partido (posición, marca, cobertura).', 'Liderazgo emergente')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 13, 'conductual', 'Cumple el modelo independiente del marcador', 'Aplica las instrucciones y el modelo de juego sin importar si van ganando o perdiendo.', 'Doc 01 · Sub-10')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 14, 'conductual', 'Autoevaluación verbal', 'Cuando el entrenador pregunta "¿qué pasó ahí?", describe su error con precisión sin excusas.', 'Metacognición')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-11', 15, 'conductual', 'Liderazgo de tarea', 'Puede dirigir un ejercicio de activación para el grupo cuando se le asigna.', 'Liderazgo')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 1, 'coordinativo', '5 lagartijas reales', '5 lagartijas con cuerpo alineado, pecho al suelo, extensión completa.', 'Condicional (abriendo)')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 2, 'coordinativo', 'Suspensión en barra 30 seg', 'Se sostiene colgado de una barra 30 segundos o más. Alternativa sin barra: tracción de compañero (soga) 10 seg.', 'Fuerza de agarre / tren superior')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 3, 'coordinativo', 'Zancada 20 pasos con carga postural', '20 zancadas con tronco vertical, sin oscilación lateral de rodilla.', 'Control postural / prevención')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 4, 'coordinativo', 'Sentadilla unipodal completa a media altura', '5 repeticiones por pierna con control excéntrico (baja lento, sube firme).', 'Fuerza unipodal / prevención de lesión')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 5, 'coordinativo', 'Salto con contramovimiento + aterrizaje', 'Salto vertical máximo con aterrizaje estable bipodal Y unipodal (1 repetición limpia de cada uno).', 'Potencia + control')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 6, 'coordinativo', 'Técnica de sprint 10 m', 'Sprint de 10 m con braceo coordinado y tronco estable (evaluación técnica, no de tiempo).', 'Mecánica de carrera')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 7, 'coordinativo', 'Frenado a máxima velocidad', 'Frena y cambia de dirección desde velocidad alta sin pérdida de control ni pasos de ajuste excesivos.', 'Desaceleración / prevención')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 8, 'coordinativo', 'Reacción con decisión < 1 segundo', 'Ante presión activa, decide (pase / conducción / protección) en menos de 1 segundo en el 65%+ de duelos.', 'Reacción + cognitivo · Rúbrica')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 9, 'coordinativo', 'Timing de salto de cabeza', 'Conecta de cabeza un balón aéreo con timing correcto en 3 de 5 intentos.', 'Percepción temporal')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 10, 'coordinativo', 'Skipping en variantes a ritmo alto', 'Ejecuta 3 variantes de skipping (frontal, lateral, cruzado) a ritmo alto sin descoordinarse.', 'Coordinación segmentaria')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 11, 'conductual', 'Liderazgo vocal autónomo', 'Organiza al equipo verbalmente en situaciones de partido sin que el entrenador intervenga.', 'Rúbrica · Consolidación')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 12, 'conductual', 'Explica el modelo', 'Puede explicar los aspectos básicos del modelo White Lions a un jugador nuevo con el vocabulario correcto.', 'Doc 01 · Consolidación')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 13, 'conductual', 'Constancia bajo presión', 'No desaparece del juego en los últimos minutos del partido ni en momentos de máxima presión.', 'Doc 01 · Sub-12')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 14, 'conductual', 'Regula a un compañero', 'Al menos una vez ayuda a un compañero frustrado a recomponerse (palabra, gesto, organización).', 'Liderazgo emocional')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

  INSERT INTO public.wl_battery_items (org_id, category_key, item_number, dimension, observable, criterion, window_source)
  VALUES (v_org, 'sub-13', 15, 'conductual', 'Propone soluciones tácticas', 'Propone al entrenador un ajuste táctico coherente al menos una vez por mes.', 'Cognitivo-táctica')
  ON CONFLICT (org_id, category_key, item_number) DO NOTHING;

END $$;