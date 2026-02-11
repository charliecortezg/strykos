
# Plan: White Lions Assessment Lab

## Resumen Ejecutivo

Implementar "Assessment Lab" como organizacion separada dentro de STRYK, con eventos de evaluacion externa, modo evento full-screen, y selector de organizacion restringido a Coach Mode. Reutiliza el motor de evaluaciones WLA existente sin XP/badges para externos.

---

## Desafio Arquitectonico Critico

El sistema actual de RLS depende de `get_current_org_id()` que retorna `profiles.organization_id` (valor fijo por usuario). Para soportar multi-org, necesitamos hacer esta funcion dinamica.

**Solucion elegida:** Agregar `active_organization_id` a `profiles` (nullable). Modificar `get_current_org_id()` para usar `COALESCE(active_organization_id, organization_id)`. Cuando el usuario cambia de org en el UI, se actualiza este campo via RPC. Todas las RLS policies existentes siguen funcionando sin cambios.

---

## 1. Migracion SQL

### A. Modificar tabla `profiles`

| Columna nueva | Tipo | Default |
|---------------|------|---------|
| active_organization_id | uuid nullable | NULL |

FK a organizations(id). Cuando es NULL, se usa organization_id (comportamiento actual).

### B. Modificar tabla `organizations`

| Columna nueva | Tipo | Default |
|---------------|------|---------|
| organization_type | text | 'academy' |

Valores: 'academy', 'evaluation_only'

### C. Modificar tabla `players`

| Columna nueva | Tipo | Default |
|---------------|------|---------|
| player_type | text | 'internal' |
| parent_email | text nullable | NULL |
| parent_phone | text nullable | NULL |

Valores player_type: 'internal', 'external'

### D. Nueva tabla: `evaluation_events`

| Columna | Tipo |
|---------|------|
| id | uuid PK |
| organization_id | uuid FK |
| title | text |
| event_date | date nullable |
| status | text ('draft', 'active', 'closed') |
| created_by | uuid FK profiles |
| closed_by | uuid nullable |
| closed_at | timestamptz nullable |
| created_at | timestamptz |

### E. Nueva tabla: `evaluation_event_players`

| Columna | Tipo |
|---------|------|
| id | uuid PK |
| event_id | uuid FK |
| player_id | uuid FK |
| organization_id | uuid FK |
| status | text ('pending', 'completed') |
| evaluated_by | uuid nullable |
| evaluated_at | timestamptz nullable |
| created_at | timestamptz |

UNIQUE: (event_id, player_id)

### F. Modificar tabla `evaluations`

| Columna nueva | Tipo | Default |
|---------------|------|---------|
| event_id | uuid nullable | NULL |

FK a evaluation_events(id). NULL para evaluaciones internas (academias).

### G. Nueva tabla: `evaluation_delivery`

| Columna | Tipo |
|---------|------|
| id | uuid PK |
| evaluation_id | uuid FK |
| organization_id | uuid FK |
| delivery_status | text ('pending', 'sent', 'failed') |
| recipient_email | text nullable |
| last_attempt_at | timestamptz nullable |
| error_message | text nullable |
| created_at | timestamptz |

### H. Actualizar funcion `get_current_org_id()`

```text
Antes:
  SELECT organization_id FROM profiles WHERE id = auth.uid()

Despues:
  SELECT COALESCE(active_organization_id, organization_id)
  FROM profiles WHERE id = auth.uid()
```

Esto hace que todas las RLS policies existentes funcionen automaticamente con la org activa.

### I. Funcion RPC: `switch_organization(target_org_id uuid)`

- Valida que el usuario tenga al menos 1 rol en target_org via user_org_roles
- Actualiza profiles.active_organization_id
- Retorna la org actualizada

### J. Validacion RLS adicional

La politica de UPDATE en profiles debe permitir que el usuario actualice su propio `active_organization_id` (ya existe "Users can update their own profile").

Se necesitan nuevas RLS policies para:
- `evaluation_events`: SELECT/INSERT/UPDATE por org roles
- `evaluation_event_players`: SELECT/INSERT/UPDATE por org roles
- `evaluation_delivery`: SELECT por org roles

---

## 2. Cambios en AuthContext

### Nuevos campos en contexto

```text
allOrganizations: Organization[]     // orgs donde el usuario tiene roles
switchOrganization: (orgId) => void  // cambia org activa
isSwitchingOrg: boolean
```

### Flujo de inicializacion modificado

1. Fetch profile (como hoy)
2. Fetch user_org_roles para TODAS las orgs del usuario (no solo la primaria)
3. Fetch organizations para esas org_ids
4. Guardar en `allOrganizations`
5. La org activa = la que retorna get_current_org_id() (respeta active_organization_id)

### switchOrganization()

1. Llama RPC `switch_organization(target_org_id)`
2. Actualiza estado local (organization, roles para esa org)
3. Navega al dashboard apropiado

---

## 3. Selector de Organizacion (OrgSwitcher)

### Ubicacion

Dentro del `DashboardHeader`, junto al `RoleSwitch` existente.

### Reglas de visibilidad

- Solo visible si `activeRole` es `entrenador` o `director_deportivo`
- Solo visible si `allOrganizations.length > 1`
- Para otros roles (org_owner, administrativo): NO mostrar

### Diseno

Dropdown similar al RoleSwitch:
```text
[Org icon] White Lions Academies ▼
            > White Lions Academies    ✓
            > WL Assessment Lab
```

Al cambiar: llama switchOrganization, recarga dashboard.

---

## 4. Assessment Lab Dashboard

### Nueva ruta

`/dashboard/assessment-lab` (accesible cuando organization.organization_type === 'evaluation_only')

### Redireccion automatica

Cuando el usuario cambia a una org tipo `evaluation_only`:
- Si activeRole es `entrenador`: ir a `/dashboard/assessment-lab`
- Si activeRole es `director_deportivo`: ir a `/dashboard/assessment-lab`
- El dashboard de assessment lab es DIFERENTE al de academia: solo muestra Evaluaciones

### Componente: AssessmentLabDashboard

- Header con DashboardHeader (incluye OrgSwitcher)
- Sin tabs de Jugadores, Partidos, Fichajes, etc.
- Solo: lista de Eventos de evaluacion

### Vistas por rol:

**Director Deportivo:**
- Lista de eventos (draft/active/closed)
- Boton "Crear evento"
- Detalle de evento: roster + gestion de jugadores externos + cerrar evento

**Entrenador:**
- Lista de eventos activos
- Detalle de evento: roster + "Iniciar Modo Evento"

---

## 5. Gestion de Eventos (Director)

### CreateEventModal

- Titulo del evento
- Fecha (opcional)
- Status inicial: 'draft'

### EventDetailView (Director)

- Header: titulo, fecha, contadores (total/evaluados/pendientes)
- Seccion "Roster":
  - Lista de jugadores externos con chip (Pendiente/Evaluado)
  - Boton "Agregar jugador" (formulario inline)
  - Campos: full_name, age_group (select 6-7/8-9/10-11), parent_email, parent_phone
- Boton "Activar evento" (draft -> active)
- Boton "Cerrar evento" (active -> closed, con confirmacion)
  - Al cerrar: evaluation_event_players y evaluations quedan read-only
  - NO genera XP, NO genera badges, NO inserta stryk_events
- Boton "Iniciar Modo Evento" (disponible cuando status=active)

---

## 6. Modo Evento (Full Screen)

### Componente: EventModeScreen

- Full screen (via document.fullscreenAPI o CSS full viewport)
- Header minimo: titulo del evento + boton "Salir del modo"
- Navegacion del browser bloqueada (solo el boton de salir)

### Flujo secuencial

1. Carga primer jugador pendiente del roster
2. Muestra: nombre + age_group + 6 sliders WLA (0-20) con rubrics
3. Boton sticky grande: "Guardar y siguiente"
4. Al guardar:
   - Upsert evaluacion (con event_id)
   - Upsert 6 scores
   - Marcar evaluation_event_players.status = 'completed'
   - Cargar automaticamente el siguiente pendiente
5. Si no hay pendientes: pantalla "Evento completo" + boton "Salir"

### Reutilizacion

Los sliders y rubrics se reutilizan del PlayerEvaluationSheet existente, pero en layout full-screen con botones mas grandes.

---

## 7. Evaluaciones para Externos (sin economia)

### Al guardar evaluacion de externo

- Se crea evaluacion con event_id (no null)
- Se guardan 6 scores
- NO se insertan stryk_events
- NO se detectan achievements/badges
- NO se calcula XP

### Al cerrar evento

- Todas las evaluaciones del evento cambian status a 'closed'
- Se crean registros en evaluation_delivery con delivery_status='pending'
- Boton "Enviar por email" queda como placeholder (no envia aun)

---

## 8. Archivos a crear

| Archivo | Descripcion |
|---------|-------------|
| `src/components/dashboard/OrgSwitcher.tsx` | Selector de organizacion |
| `src/hooks/useUserOrganizations.ts` | Hook para orgs del usuario |
| `src/pages/dashboard/AssessmentLabDashboard.tsx` | Dashboard assessment lab |
| `src/components/assessment/EventsList.tsx` | Lista de eventos |
| `src/components/assessment/CreateEventModal.tsx` | Crear evento |
| `src/components/assessment/EventDetailView.tsx` | Detalle de evento (director) |
| `src/components/assessment/AddExternalPlayerForm.tsx` | Form jugador externo |
| `src/components/assessment/EventModeScreen.tsx` | Modo evento full screen |
| `src/components/assessment/EventModeEvaluation.tsx` | Sliders en modo evento |
| `src/components/assessment/EventCompleteScreen.tsx` | Pantalla evento completo |
| `src/hooks/useEvaluationEvents.ts` | CRUD eventos |
| `src/hooks/useExternalPlayers.ts` | CRUD jugadores externos |

## 9. Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/contexts/AuthContext.tsx` | Agregar allOrganizations, switchOrganization |
| `src/types/auth.ts` | Agregar OrganizationType 'evaluation_only', ampliar Organization |
| `src/components/dashboard/DashboardHeader.tsx` | Agregar OrgSwitcher |
| `src/App.tsx` | Agregar ruta /dashboard/assessment-lab |
| `src/lib/auth-routing.ts` | Manejar redirect a assessment-lab si org es evaluation_only |
| `src/hooks/useEvaluations.ts` | Agregar soporte para event_id |
| `src/types/categories.ts` | Agregar player_type, parent_email, parent_phone a Player |

---

## 10. Flujo completo

```text
SETUP (una vez, por platform admin o seed):
1. Crear org "WL Assessment Lab" con organization_type='evaluation_only'
2. Agregar user_org_roles para coaches/directors en la nueva org

OPERACION:
1. Director abre dashboard academy
2. Ve OrgSwitcher, cambia a "WL Assessment Lab"
3. Dashboard cambia a Assessment Lab (solo eventos)
4. Director crea evento "Lion Assessment Day - Mar 2026"
5. Director agrega jugadores externos (nombre, age_group, email padre)
6. Director activa evento (draft -> active)

7. Entrenador abre dashboard, cambia a Assessment Lab via OrgSwitcher
8. Ve evento activo, click "Iniciar Modo Evento"
9. Pantalla full screen: jugador 1 + 6 sliders
10. Evalua, "Guardar y siguiente" -> jugador 2 automaticamente
11. Al terminar todos: "Evento completo", sale del modo

12. Director cierra evento -> todo read-only
13. Boton "Enviar por email" queda en pending (placeholder v1)
```

---

## Lo que NO cambia

- Motor de evaluaciones WLA (mismos 6 stats, mismos sliders, mismas rubrics)
- Dashboard de academias (no se modifica la experiencia actual)
- RLS policies existentes (get_current_org_id se extiende, no se reemplaza)
- Economia XP/badges para jugadores internos (no se toca)
- Rutas existentes
- Tabla profiles base (solo se agrega 1 columna)

## Riesgos y mitigaciones

| Riesgo | Mitigacion |
|--------|-----------|
| Cambio a get_current_org_id afecta queries existentes | COALESCE garantiza backward compatibility: si active_organization_id es NULL, usa el valor original |
| Race condition al switchear org | El switch es un UPDATE atomico + refetch local |
| Usuario queda en org incorrecta | Al cerrar sesion, active_organization_id se resetea a NULL |
