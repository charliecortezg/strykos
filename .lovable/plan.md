

# Plan: Evaluaciones Externas dentro de la misma organización

## Problema

Los componentes `DirectorExternalEvaluationsView` y `CoachExternalEvaluationsView` buscan una organización separada de tipo `evaluation_only` en `allOrganizations`. Como esa org no existe, muestran "Sin acceso a Assessment Lab". El usuario quiere que todo funcione dentro de su organización actual.

## Solución

Eliminar la dependencia de una org `evaluation_only`. Usar `organization.id` (la org actual) directamente para crear jugadores externos, eventos y notificaciones. Todo vive dentro de la misma academia.

---

## Cambios

### 1. `DirectorExternalEvaluationsView.tsx`

- Eliminar la búsqueda de `assessmentLabOrg` en `allOrganizations`
- Usar `organization.id` del AuthContext como `orgId` para `useAutoEvent`
- Eliminar toda la lógica de `switchOrganization` (ya no es necesaria, estamos en la org correcta)
- Eliminar el mensaje "Sin acceso a Assessment Lab"
- Simplificar `handleAddPlayer`: insertar player + agregar al evento + notificar, todo directo sin switch

### 2. `CoachExternalEvaluationsView.tsx`

- Eliminar la búsqueda de `assessmentLabOrg`
- Usar `organization.id` directamente para `useAutoEvent` y `useCoachNotifications`
- Eliminar el bloque "Sin acceso a Assessment Lab"

### 3. `EvaluationsTabsWrapper.tsx`

- Eliminar la búsqueda de `assessmentLabOrg` para el badge
- Usar `organization.id` directamente para `useCoachNotifications`

### 4. `useAutoEvent.ts`

- Sin cambios funcionales (ya recibe un orgId como parametro, funciona igual)

### 5. `useCoachNotifications.ts`

- Sin cambios funcionales (ya recibe un orgId como parametro)

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/evaluations/DirectorExternalEvaluationsView.tsx` | Usar `organization.id`, eliminar switch de org y check de Assessment Lab |
| `src/components/evaluations/CoachExternalEvaluationsView.tsx` | Usar `organization.id`, eliminar check de Assessment Lab |
| `src/components/evaluations/EvaluationsTabsWrapper.tsx` | Usar `organization.id` para notifications |

## Lo que NO cambia

- `useAutoEvent.ts` (ya es generico)
- `useCoachNotifications.ts` (ya es generico)
- RPC `get_or_create_monthly_event` (ya funciona con cualquier org)
- Tabla `coach_notifications` y su RLS
- Modelo de datos de `players`, `evaluation_events`, `evaluation_event_players`
- Dashboards (DirectorDeportivoDashboard, EntrenadorDashboard) - ya integran los componentes correctamente

## Resultado

El Director Deportivo abre "Evaluaciones > Externas" y ve el boton "Agregar jugador (Solo Evaluacion)" funcionando inmediatamente, sin necesidad de crear ninguna org adicional. Todo se guarda en la org actual con `player_type = 'external'`. Los entrenadores ven los pendientes en su tab "Externas" con el badge y el modo evento.
