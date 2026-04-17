

## Sprint 3-A: Infraestructura de Capacitación y Certificación WL

Construye la base de datos y la capa de acceso para el sistema de certificación de entrenadores WL (5 niveles, comenzando con WL-C1: 4 módulos, 60 preguntas de examen).

### Cambios

**1. Migración SQL — 7 tablas nuevas**
- `training_modules` — módulos por nivel de certificación (globales con `organization_id NULL`)
- `training_components` — lectura, video, examen, tarea_campo
- `training_exam_questions` — preguntas con opciones JSONB y respuesta correcta
- `trainer_module_progress` — progreso por módulo del entrenador
- `trainer_component_progress` — progreso por componente
- `trainer_exam_attempts` — intentos de examen con score
- `trainer_certifications` — certificaciones emitidas por DD/owner

RLS: lectura global de contenido; entrenador ve su progreso, DD/owner ve todos. Patrón consistente con tablas existentes (`get_current_org_id()`, `has_org_role`).

**Nota:** El SQL del prompt usa `(SELECT get_current_org_id())` y CHECK constraints simples — válido y compatible con las funciones SECURITY DEFINER existentes.

**2. Seed WL-C1**
- 4 módulos (Filosofía / Estructura de Sesión / Observación / Feedback)
- 20 componentes (5 por módulo: 2 lecturas + 1 video + 1 examen + 1 tarea de campo)
- 60 preguntas de examen distribuidas: 18 + 15 + 15 + 12

**3. Verificación SQL** después del seed (3 queries de conteo).

**4. Archivos TypeScript nuevos**
- `src/types/training.ts` — interfaces + `CertificationLevel` + labels
- `src/hooks/useTraining.ts` — 9 hooks (React Query + Supabase) siguiendo el patrón de `useEvaluations.ts`:
  - `useTrainingModules`, `useTrainingComponents`, `useExamQuestions`
  - `useTrainerProgress`, `useCompleteComponent`, `useSubmitExam`
  - `useTrainerCertifications`, `useIssueCertification`
  - `useAllTrainersProgress` (vista DD)

### Lo que NO se toca
- Ningún archivo existente
- No se construye UI (eso es Prompt 3-B)

### Orden de ejecución
1. Migración SQL (estructura + RLS) — un solo bloque
2. Migración SQL (seed con bloque DO $$) — un segundo bloque
3. Verificación SQL
4. Crear `src/types/training.ts`
5. Crear `src/hooks/useTraining.ts`
6. `tsc` para validar build

