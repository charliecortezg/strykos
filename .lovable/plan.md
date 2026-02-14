
# Plan: Completar Flujo de Evaluacion + IDP en Portal Padres

## Diagnostico

Se identificaron **5 problemas** que impiden que el portal muestre la evaluacion y el IDP:

### 1. La evaluacion NO esta cerrada
Las evaluaciones del periodo 2026-02 tienen `status = 'open'`. Los scores existen (fueron ingresados por el entrenador), pero el Director Deportivo NO ha ejecutado "Cerrar evaluacion del mes" desde su panel. Sin esto:
- No se calcula el overall ponderado
- No se dispara el IDP
- No se envia email
- El portal no muestra nada (filtra por `status = 'closed'`)

### 2. Politicas RLS faltantes para Portal
Las tablas `evaluations`, `evaluation_scores`, `idp_cycles`, `idp_focus_areas` e `idp_sessions` **no tienen politicas para el Portal Familiar**. Usan `get_current_org_id()` que solo funciona con Supabase Auth, pero el Portal usa autenticacion por localStorage (guardian). Las tablas `player_progress` y `stryk_events` SI tienen politicas portal funcionales.

**Resultado**: Incluso si la evaluacion estuviera cerrada, el portal no podria leer los datos.

### 3. Recomendaciones estaticas en el IDP
El `process-idp` usa un mapa fijo de acciones por stat (`MENTALIDAD_ACTION_MAP`). No genera recomendaciones personalizadas por jugador. El usuario quiere que se use IA para generar reportes con comentarios y recomendaciones contextuales.

### 4. Sin rubrics en el reporte del Portal
La tabla `evaluation_rubrics` tiene 54 registros disponibles, pero ni `LastEvaluationCard` ni `IDPCard` los usan para mostrar descripciones contextuales del nivel del jugador.

### 5. Comentarios no visibles en Portal
Los comentarios del entrenador (`evaluation_comments`) no se muestran en el Portal Padres. Solo se ven en el panel del Director.

---

## Solucion (5 cambios)

### Cambio 1: Migracion SQL - RLS Portal para 5 tablas

Agregar politicas SELECT tipo "Portal can view..." a:

- **evaluations**: Portal puede ver evaluaciones cerradas de sus jugadores
- **evaluation_scores**: Portal puede ver scores de evaluaciones cerradas de sus jugadores
- **evaluation_comments**: Portal puede ver comentarios de evaluaciones de sus jugadores
- **idp_cycles**: Portal puede ver ciclos IDP de sus jugadores
- **idp_focus_areas**: Portal puede ver focus areas de ciclos IDP de sus jugadores
- **idp_sessions**: Portal puede ver y crear sesiones IDP de sus jugadores

Patron (identico al existente en `player_progress`):
```text
EXISTS (
  SELECT 1
  FROM player_guardians pg
  JOIN guardians g ON g.id = pg.guardian_id
  JOIN organizations o ON o.id = g.organization_id
  WHERE pg.player_id = [tabla].player_id
  AND o.feature_portal_familiar_enabled = true
)
```

Para `evaluation_scores` y `evaluation_comments` (que no tienen `player_id` directo), el JOIN pasa por `evaluations`.

Tambien agregar politica INSERT portal en `idp_sessions` para que el padre pueda registrar sesiones.
Y politica UPDATE portal en `idp_cycles` para que el padre pueda aceptar el plan.

### Cambio 2: Edge Function `process-idp` - Recomendaciones con IA

Modificar `process-idp` para usar Lovable AI (Gemini Flash) y generar:

1. **Comentario general del jugador** basado en sus 6 scores y grupo de edad
2. **Recomendaciones especificas** (3 items) para las areas de enfoque
3. **Plan semanal personalizado** con rutinas concretas

La IA recibira:
- Nombre del jugador, grupo de edad
- Los 6 scores con labels
- Focus areas seleccionadas (2 potenciar + 1 mejorar)
- Mentalidad areas bajas (si aplica)
- Rubrics del grupo de edad (desde evaluation_rubrics)

El resultado se guardara en `plan_json` con campos adicionales:
- `ai_comment`: string (comentario general)
- `ai_recommendations`: string[] (3 recomendaciones)

La respuesta de IA se estructura con tool calling para obtener JSON consistente.

### Cambio 3: `LastEvaluationCard` - Agregar comentarios y rubrics

Modificar el hook `usePlayerLastEvaluation` para:
- Traer tambien `evaluation_comments` del evaluation
- Traer `evaluation_rubrics` del age_group

Modificar `LastEvaluationCard` para mostrar:
- Seccion "Comentarios del Entrenador" (si hay)
- Descripcion del nivel por stat usando rubrics (bullets)
- Seccion "Nivel Actual vs Estandar WLA" (score actual / 20 como %)

Esto replica la vision de referencia que compartioel usuario (imagen 3).

### Cambio 4: `IDPCard` - Mostrar recomendaciones IA

Agregar al IDPCard:
- Seccion "Comentario General" (desde plan_json.ai_comment)
- Seccion "Recomendaciones" con lista de acciones (desde plan_json.ai_recommendations)
- Mejorar visualizacion del plan semanal

### Cambio 5: `usePlayerLastEvaluation` - Traer datos adicionales

Extender el hook para fetch de:
- `evaluation_comments` para el evaluation_id
- Opcionalmente los rubrics del age_group para mostrar descripciones

---

## Archivos a crear/modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| Migracion SQL | Crear | 8 politicas RLS portal (SELECT x5, INSERT x1 idp_sessions, UPDATE x1 idp_cycles) |
| `supabase/functions/process-idp/index.ts` | Modificar | Agregar llamada a Lovable AI para generar comentario + recomendaciones + plan personalizado |
| `src/hooks/usePortal/usePlayerLastEvaluation.ts` | Modificar | Agregar fetch de evaluation_comments |
| `src/components/portal/LastEvaluationCard.tsx` | Modificar | Agregar seccion de comentarios, barras de progreso por stat, nivel vs estandar |
| `src/components/portal/IDPCard.tsx` | Modificar | Agregar secciones de comentario IA y recomendaciones |
| `src/types/idp.ts` | Modificar | Agregar campos `ai_comment` y `ai_recommendations` a `IDPPlanJSON` |

## Flujo completo esperado

1. Entrenador ingresa scores (ya funciona)
2. Director cierra evaluaciones (ya funciona, pero el usuario debe ejecutar "Cerrar evaluacion del mes")
3. `closeEvaluations` -> cambia status a 'closed' + llama `process-idp`
4. `process-idp` -> calcula focus areas + llama Lovable AI + genera plan + crea IDP + llama `send-idp-report`
5. `send-idp-report` -> envia email via Resend con link al portal
6. Portal Padres -> muestra LastEvaluationCard (scores + radar + comentarios) + IDPCard (focus areas + recomendaciones IA + registrar sesiones)

## Nota importante

El Director Deportivo necesita ir al panel de Evaluaciones, seleccionar la categoria "Juvenil A" y el periodo "2026-02", y presionar **"Cerrar evaluacion del mes"**. Sin este paso, nada del pipeline se activa. Esto es by design (el Director controla cuando se publican los resultados).
