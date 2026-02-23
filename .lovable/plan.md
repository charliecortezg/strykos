# Plan: Motor Formativo 2.0 (Revisado)

## Resumen

Mejorar el motor de evaluaciones y Plan de Desarrollo (IDP) sin ranking entre jugadores. El grupo de edad se define en la categoria (fuente de verdad). El historial de evaluaciones se muestra en el portal de padres. La IA genera planes usando stats + comentarios del entrenador + historial (delta vs anterior) + asistencia.

---

## Parte 1: Grupo de Edad en Categorias

### Problema actual

El `age_group` se calcula por fecha de nacimiento del jugador (`calculateAgeGroup` en `evaluation-utils.ts`). No hay campo en categorias. Todos los jugadores caen en el mismo grupo porque la logica es generica.

### Solucion

Agregar campo `age_group` a la tabla `categories`. Este es la fuente de verdad.

**Migracion SQL:**

```sql
ALTER TABLE categories ADD COLUMN age_group TEXT DEFAULT '8-9';
```

**Cambios en UI:**

- `CreateCategoryModal.tsx`: Agregar selector de grupo de edad (opciones: '6-7', '8-9', '10-11')
- `EditCategoryModal.tsx`: Mismo selector
- `CategoriesTable.tsx`: Mostrar columna de grupo de edad

**Cambios en logica de evaluacion:**

- `useEvaluations.ts` > `saveEvaluation`: En lugar de `calculateAgeGroup(dateOfBirth)`, usar el `age_group` de la categoria seleccionada
- Esto requiere pasar el `age_group` de la categoria como parametro o hacer un lookup

**Tipo `Category**` en `src/types/categories.ts`: Agregar `age_group: string`
**Tipo `CreateCategoryData**`: Agregar `age_group?: string`

---

## Parte 2: Insights Estructurados del Comentario

### Objetivo

Extraer fortalezas, debilidades, habitos y nivel de riesgo del comentario del entrenador usando IA, para alimentar el plan de desarrollo.

### Migracion SQL

```sql
ALTER TABLE evaluations ADD COLUMN insights_json JSONB DEFAULT NULL;
```

### Nueva Edge Function: `generate-insights`

Se invoca desde `process-idp` como paso previo. Analiza el comentario con IA y guarda el resultado.

**Input:** comentario(s) del entrenador + scores + age_group
**Output:**

```json
{
  "fortalezas": ["vision de juego", "comunicacion"],
  "debilidades": ["regularidad", "enfoque"],
  "habitos": ["asistencia irregular"],
  "riesgo": "medio",
  "palabras_clave": ["presion", "liderazgo"]
}
```

Usa Lovable AI gateway (sin API key externa). Tool calling para output estructurado.

---

## Parte 3: OVR Ponderado por Grupo de Edad

### Estado actual

Ya existe un sistema de pesos por age_group en `evaluation_weights` y `DEFAULT_WEIGHTS`. El OVR se calcula en `calculateOverall()`.

### Cambio

No se necesita tabla nueva. Los pesos ya estan por age_group. Lo unico que cambia es que ahora el `age_group` viene de la categoria en lugar de la fecha de nacimiento.

La funcion `calculateOverall` ya soporta pesos personalizados. Sin cambios en la formula.

---

## Parte 4: Historial de Evaluaciones en Portal de Padres

### Objetivo

Los padres pueden ver todas las evaluaciones pasadas, no solo la ultima.

### Nuevo hook: `usePlayerEvaluationHistory`

```typescript
// Retorna todas las evaluaciones cerradas del jugador, ordenadas por periodo DESC
// Incluye scores, comments y rubrics para cada una
```

### Cambios en `LastEvaluationCard.tsx`

- Renombrar a `EvaluationHistoryCard.tsx` o agregar funcionalidad
- Mostrar la evaluacion mas reciente con sus datos completos (como hoy)
- Agregar un accordion/lista colapsable abajo: "Evaluaciones anteriores"
- Cada evaluacion anterior muestra: periodo, overall, delta vs la anterior, radar mini
- Si no hay evaluaciones anteriores, no mostrar nada de historial (solo la actual)
- Si no hay ninguna evaluacion, mostrar el mensaje actual "Aun no hay evaluaciones"

### Delta vs anterior

- Ya existe `previous_overall` en evaluations
- En el historial se calcula automaticamente al mostrar (overall de periodo N - overall de periodo N-1)

---

## Parte 5: Plan IA 2.0 (process-idp mejorado)

### Nuevos inputs al prompt de IA

1. **Stats actuales** (ya existe)
2. **Comentarios del entrenador** (ya se pasan pero sin estructura)
3. **insights_json** (nuevo - fortalezas/debilidades/habitos del comentario)
4. **Delta vs evaluacion anterior** (scores actuales - scores anteriores por stat)
5. **Asistencia ultimos 30 dias** (query a tabla attendance)
6. **Grupo de edad de la categoria** (nuevo - viene de categories.age_group)

### Prompt mejorado

```text
JUGADOR: {nombre}
CATEGORIA: {categoria_nombre}
GRUPO DE EDAD: {age_group}

SCORES ACTUALES: {scores con label}
DELTA VS ANTERIOR: {+2 en Control, -1 en Actitud, etc.} o "Primera evaluacion"

INSIGHTS DEL ENTRENADOR:
  Fortalezas: {insights.fortalezas}
  Debilidades: {insights.debilidades}
  Habitos: {insights.habitos}
  Riesgo: {insights.riesgo}

COMENTARIOS ORIGINALES: {texto completo del entrenador}

ASISTENCIA (30 dias): {presente}/{total} ({pct}%)

Genera un plan con:
1. DIAGNOSTICO: Cruce de numeros + comentario + asistencia
2. FOCO TECNICO: Max 2 areas (priorizando stats debiles + debilidades del comentario)
3. FOCO CONDUCTUAL: Si el comentario indica habitos o riesgo medio/alto
4. RECOMENDACIONES: 3 especificas
5. PLAN SEMANAL: 3 dias estructurados
```

### Tool call actualizado

```json
{
  "diagnostico": "string",
  "ai_comment": "string",
  "ai_recommendations": ["string"],
  "ai_weekly_plan": "string",
  "foco_conductual": "string | null"
}
```

### plan_json actualizado

Agregar a la estructura existente:

- `plan_json.diagnostico`
- `plan_json.foco_conductual`
- `plan_json.insights` (copia del insights_json)
- `plan_json.attendance_context` (presente, total, pct)

### Logica de continuidad del IDP

- Si ya existe un IDP activo y aun no pasan 90 dias: se actualiza con nueva data pero el plan continua
- Despues de los 90 dias: se cierra el IDP actual y se crea uno nuevo basado en la evaluacion mas reciente
- Esto ya funciona parcialmente en `process-idp` (check de `existingIDP`), se ajusta el calculo de dias

---

## Parte 6: Frontend del IDP mejorado

### IDPCard.tsx

- Agregar seccion "Diagnostico" al inicio (antes del analisis actual)
- Mostrar "Foco Conductual" como card separada si existe en plan_json
- Mostrar contexto de asistencia como badge: "Asistencia: 75% (ultimos 30 dias)"

### Tipos (`src/types/idp.ts`)

- Agregar interfaces para `diagnostico`, `foco_conductual`, `attendance_context` en el plan_json

---

## Archivos a Crear/Modificar


| Archivo                                             | Accion    | Descripcion                                                                                      |
| --------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------ |
| Migracion SQL                                       | Crear     | `age_group` en categories + `insights_json` en evaluations                                       |
| `supabase/functions/generate-insights/index.ts`     | Crear     | Analiza comentario con IA, guarda insights_json                                                  |
| `supabase/functions/process-idp/index.ts`           | Modificar | Nuevos inputs al prompt (insights, asistencia, delta, age_group de categoria). Logica de 90 dias |
| `src/types/categories.ts`                           | Modificar | Agregar `age_group` a Category y CreateCategoryData                                              |
| `src/types/idp.ts`                                  | Modificar | Agregar tipos para diagnostico, foco_conductual, attendance_context                              |
| `src/components/categories/CreateCategoryModal.tsx` | Modificar | Agregar selector de grupo de edad                                                                |
| `src/components/categories/EditCategoryModal.tsx`   | Modificar | Agregar selector de grupo de edad                                                                |
| `src/components/categories/CategoriesTable.tsx`     | Modificar | Mostrar columna age_group                                                                        |
| `src/hooks/useCategories.ts`                        | Modificar | Incluir age_group en create/update                                                               |
| `src/hooks/useEvaluations.ts`                       | Modificar | Usar age_group de la categoria en vez de fecha de nacimiento                                     |
| `src/lib/evaluation-utils.ts`                       | Modificar | Mantener calculateAgeGroup como fallback, pero la fuente de verdad es la categoria               |
| `src/hooks/usePortal/usePlayerEvaluationHistory.ts` | Crear     | Hook para historial completo de evaluaciones                                                     |
| `src/components/portal/LastEvaluationCard.tsx`      | Modificar | Agregar historial de evaluaciones anteriores                                                     |
| `src/components/portal/IDPCard.tsx`                 | Modificar | Diagnostico, foco conductual, contexto asistencia                                                |
| `supabase/config.toml`                              | Modificar | Agregar entry para generate-insights                                                             |


---

## Orden de Ejecucion

```text
1. Migracion SQL (age_group en categories + insights_json en evaluations)
2. Frontend categorias (selector age_group en create/edit)
3. Ajustar useEvaluations para usar age_group de categoria
4. Edge function generate-insights
5. Actualizar process-idp con nuevos inputs
6. Hook usePlayerEvaluationHistory
7. Frontend portal: historial evaluaciones + IDP mejorado
```

---

## Lo que NO se incluye (por decision del usuario)

- No hay ranking entre jugadores
- No hay tabla `category_benchmarks` externa
- No hay percentiles ni comparacion entre jugadores
- El "benchmark" es simplemente la evaluacion anterior del mismo jugador