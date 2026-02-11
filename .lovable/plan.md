
# Plan: UX Completa de Evaluaciones Externas (Assessment Lab)

## Problema

Despues de activar "Evaluaciones WLA", no hay forma clara de:
1. Agregar jugadores externos para evaluar (el Director no sabe donde hacerlo)
2. Ver jugadores pendientes/evaluados separados
3. El Entrenador no tiene acceso visible al flujo de evaluacion externa

La funcionalidad de Assessment Lab existe en DB y componentes, pero esta desconectada del flujo diario del Director y Entrenador dentro de sus dashboards de academia.

---

## Solucion

Integrar el flujo de evaluacion externa directamente en el tab "Evaluaciones" de cada dashboard, usando tabs internos para separar "Internas (WLA)" vs "Externas (Assessment Lab)". Todo opera contra la org Assessment Lab pero se accede desde el dashboard de academia.

---

## 1. Migracion SQL

### A. Funcion RPC: `get_or_create_monthly_event`

Crea automaticamente un evento de evaluacion del mes actual si no existe, o devuelve el existente.

```text
get_or_create_monthly_event(p_org_id uuid) -> evaluation_events row

Logica:
- month_key = YYYY-MM actual
- Buscar evento con title LIKE 'Evaluacion Externa%' y status != 'closed' para ese mes
- Si existe: devolverlo
- Si no: crear con title = 'Evaluacion Externa - {Mes YYYY}', status = 'active'
- Retornar el evento
```

### B. Tabla `coach_notifications`

```text
id          uuid PK default gen_random_uuid()
organization_id  uuid FK organizations
user_id     uuid FK profiles (el coach que recibe)
type        text ('evaluation_ready')
payload     jsonb (event_id, player_name, etc)
read_at     timestamptz nullable
created_at  timestamptz default now()
```

RLS: cada usuario solo ve sus propias notificaciones (`user_id = auth.uid()`).

---

## 2. Director Deportivo - Tab Evaluaciones Rediseñado

**Archivo:** `src/pages/dashboard/DirectorDeportivoDashboard.tsx` (tab evaluaciones)

Reemplazar `<DirectorEvaluationsView />` con un nuevo componente que tiene 2 sub-tabs:

### Sub-tab "Internas (WLA)"
- El componente `DirectorEvaluationsView` actual (sin cambios)
- Evaluaciones mensuales de jugadores de la academia por categoria

### Sub-tab "Externas (Assessment Lab)"
- Nuevo componente: `DirectorExternalEvaluationsView`
- Boton principal grande: **"+ Agregar jugador (Solo Evaluacion)"**
- Al presionar: abre modal con campos minimos (nombre, age_group, email tutor, telefono opcional)
- Al guardar:
  1. Obtiene la org Assessment Lab del array `allOrganizations`
  2. Si no existe org evaluation_only: muestra mensaje "No tienes acceso a Assessment Lab"
  3. Llama RPC `get_or_create_monthly_event` en la org Assessment Lab
  4. Crea jugador externo (player_type='external') en org Assessment Lab
  5. Lo agrega al evento como `evaluation_event_players` status='pending'
  6. Inserta notificacion para cada coach de la org Assessment Lab
  7. Toast: "Listo para evaluar. Se notifico a los entrenadores."
- Debajo del boton: vista de progreso del evento del mes actual
  - Barra de progreso: X evaluados / Y total
  - Dos secciones colapsables: "Pendientes" y "Evaluados"
  - Cada jugador con chip Pendiente/Evaluado
- Boton "Cerrar Evento" (con confirmacion, incluso si quedan pendientes)

**Archivos nuevos:**
| Archivo | Descripcion |
|---------|-------------|
| `src/components/evaluations/DirectorExternalEvaluationsView.tsx` | Vista completa para Director con boton agregar + progreso |
| `src/components/evaluations/CreateExternalPlayerModal.tsx` | Modal rapido para agregar jugador externo |
| `src/hooks/useAutoEvent.ts` | Hook que llama get_or_create_monthly_event y gestiona el flujo |

---

## 3. Entrenador - Tab Evaluaciones Rediseñado

**Archivo:** `src/pages/dashboard/EntrenadorDashboard.tsx` (tab evaluaciones)

Reemplazar `<EvaluationsModule />` con un componente que tiene 2 sub-tabs:

### Sub-tab "Internas (WLA)"
- El componente `EvaluationsModule` actual (sin cambios)

### Sub-tab "Externas"
- Nuevo componente: `CoachExternalEvaluationsView`
- Muestra jugadores pendientes del evento auto del mes actual de la org Assessment Lab
- CTA grande: **"Iniciar / Continuar Modo Evento"**
  - Abre EventModeScreen full-screen con flujo secuencial
- Lista de pendientes primero, luego evaluados
- Badge "NUEVO" si hay notificaciones no leidas
- Al entrar al evento o iniciar modo evento: marcar notificaciones como leidas
- SIN opciones de agregar jugador (solo el Director lo hace)

**Archivos nuevos:**
| Archivo | Descripcion |
|---------|-------------|
| `src/components/evaluations/CoachExternalEvaluationsView.tsx` | Vista del entrenador con CTA modo evento |
| `src/hooks/useCoachNotifications.ts` | Hook para leer/marcar notificaciones |

---

## 4. Logica de Switch de Org Transparente

El flujo NO requiere que el Director o Entrenador cambien de org manualmente. La UI opera contra la org Assessment Lab de forma transparente:

- `useAutoEvent` recibe el orgId de Assessment Lab (buscado en `allOrganizations` donde `organization_mode === 'evaluation_only'`)
- Las queries de jugadores externos y event_players usan ese orgId directamente
- El `EventModeScreen` ya funciona correctamente con el evento

Para que las queries funcionen contra otra org (Assessment Lab) mientras el usuario esta en su org academy, necesitamos:
- Temporalmente hacer `switchOrganization` al guardar jugador externo (para que RLS permita INSERT en la org Assessment Lab)
- O crear una edge function que opere con service_role para insertar en la org correcta

**Decision:** Usar switch temporal transparente:
1. Al agregar jugador externo: `switchOrganization(assessmentLabOrgId)` -> crear player + event_player -> `switchOrganization(academyOrgId)` de vuelta
2. Para queries de lectura: usar queries directas con filtro `organization_id` (RLS ya permite SELECT si el usuario es miembro)

---

## 5. Notificaciones Simples

### Al crear jugador externo:
- Insertar en `coach_notifications` para cada usuario con rol 'entrenador' en la org Assessment Lab
- Payload: `{ event_id, player_name, month }`

### En UI del Entrenador:
- Badge rojo con numero en el sub-tab "Externas" si hay notificaciones no leidas
- Al abrir el sub-tab: marcar `read_at = now()` para todas las notificaciones del usuario

---

## 6. Resumen de Archivos

### Crear

| Archivo | Descripcion |
|---------|-------------|
| `src/components/evaluations/DirectorExternalEvaluationsView.tsx` | Vista Director: agregar jugadores + progreso evento |
| `src/components/evaluations/CreateExternalPlayerModal.tsx` | Modal rapido para jugador externo |
| `src/components/evaluations/CoachExternalEvaluationsView.tsx` | Vista Entrenador: lista pendientes + CTA modo evento |
| `src/components/evaluations/EvaluationsTabsWrapper.tsx` | Wrapper con sub-tabs Internas/Externas |
| `src/hooks/useAutoEvent.ts` | RPC get_or_create + gestion de evento auto |
| `src/hooks/useCoachNotifications.ts` | Notificaciones para coaches |

### Modificar

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | RPC `get_or_create_monthly_event` + tabla `coach_notifications` + RLS |
| `src/pages/dashboard/DirectorDeportivoDashboard.tsx` | Reemplazar DirectorEvaluationsView por EvaluationsTabsWrapper |
| `src/pages/dashboard/EntrenadorDashboard.tsx` | Reemplazar EvaluationsModule por EvaluationsTabsWrapper |

### NO cambia

- `DirectorEvaluationsView.tsx` (se reutiliza como sub-tab "Internas")
- `EvaluationsModule.tsx` (se reutiliza como sub-tab "Internas")
- `EventModeScreen.tsx` (ya funciona, se reutiliza)
- `EventDetailView.tsx` (ya funciona en AssessmentLabDashboard)
- Motor WLA, rubrics, weights
- RLS existentes
- AuthContext

---

## 7. Flujo Resultante

```text
DIRECTOR DEPORTIVO:
1. Abre tab "Evaluaciones"
2. Ve 2 sub-tabs: "Internas (WLA)" | "Externas"
3. Click "Externas"
4. Presiona "+ Agregar jugador (Solo Evaluacion)"
5. Llena: nombre, grupo edad, email tutor
6. Click "Guardar" -> jugador creado, evento auto creado, coaches notificados
7. Ve progreso: "1 pendiente / 0 evaluados"
8. Repite para mas jugadores
9. Cuando termina el dia: "Cerrar Evento"

ENTRENADOR:
1. Abre tab "Evaluaciones"
2. Ve badge "NUEVO" en sub-tab "Externas"
3. Click "Externas"
4. Ve lista de pendientes del evento del mes
5. Click "Iniciar Modo Evento"
6. Full screen: jugador 1 + 6 sliders + "Guardar y siguiente"
7. Evalua todos -> "Evento completo" -> sale
```
