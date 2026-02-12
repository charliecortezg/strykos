

# Plan: Sistema de Membership Blocks (Ruta B)

## Resumen

Implementar el sistema de permanencia estructurada con 4 bloques (Foundation, Development, Projection, Consolidation), progresion automatica mensual, y UI para Director, Coach y Portal de Padres.

---

## Fase 1: Migraciones SQL

### 1A. Tabla `membership_blocks`

Plantillas de bloques configurables por org, con defaults globales (org_id = NULL).

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| org_id | uuid nullable FK organizations | NULL = default global |
| code | text | FOUNDATION, DEVELOPMENT, PROJECTION, CONSOLIDATION |
| name | text | Nombre visible |
| sequence_order | int | 1-4 |
| duration_months | int | |
| min_evaluations | int | |
| min_attendance_pct | int | |
| min_xp | int nullable | Opcional |
| is_active | boolean default true | |
| created_at | timestamptz default now() | |

Seed de defaults globales:
- FOUNDATION: 3 meses, 3 evals, 60% asistencia
- DEVELOPMENT: 6 meses, 6 evals, 60% asistencia
- PROJECTION: 3 meses, 3 evals, 60% asistencia
- CONSOLIDATION: 6 meses, 6 evals, 60% asistencia

RLS: SELECT para usuarios autenticados (org_id match o org_id IS NULL). INSERT/UPDATE/DELETE solo org_owner/director.

### 1B. Nuevos campos en `players`

- `membership_stage` text default 'none'
- `block_id` uuid nullable FK membership_blocks
- `block_start_date` date nullable
- `block_end_date` date nullable
- `eligible_for_progression` boolean default false
- `last_progression_at` timestamptz nullable

### 1C. Nuevo campo en `evaluations`

- `block_id` uuid nullable FK membership_blocks

### 1D. Tabla `membership_progression_log`

| Campo | Tipo |
|-------|------|
| id | uuid PK |
| org_id | uuid FK organizations |
| player_id | uuid FK players |
| from_block_id | uuid nullable FK membership_blocks |
| to_block_id | uuid nullable FK membership_blocks |
| action | text (ASSIGNED, PROGRESSED, NOT_ELIGIBLE, RESTART_AFTER_INACTIVE) |
| metrics_snapshot | jsonb |
| created_at | timestamptz default now() |

RLS: SELECT para usuarios de la org. INSERT via funciones SECURITY DEFINER.

---

## Fase 2: Funciones SQL

### 2A. `assign_default_membership_block(p_player_id uuid)`

Funcion SECURITY DEFINER que:
1. Obtiene org_id del jugador
2. Busca bloque FOUNDATION: primero override de org, luego default global
3. Actualiza players: membership_stage, block_id, block_start_date, block_end_date
4. Inserta log con action = 'ASSIGNED'

### 2B. Trigger en players INSERT

Al crear un jugador nuevo con `player_type = 'internal'` y `lifecycle_status = 'active'`:
- Ejecutar `assign_default_membership_block`

### 2C. Trigger en evaluations INSERT

Al crear evaluacion:
- Si el jugador tiene block_id, copiar al campo evaluations.block_id automaticamente

### 2D. `evaluate_membership_progression(p_org_id uuid, p_as_of_date date)`

RPC SECURITY DEFINER que para cada jugador activo de la org:
1. Obtener bloque actual
2. Si `p_as_of_date >= block_end_date`:
   - Contar evaluaciones con ese block_id
   - Calcular % asistencia en rango [block_start_date, block_end_date]
   - Sumar XP delta en rango (de stryk_events)
3. Si cumple criterios:
   - Buscar siguiente bloque (sequence_order + 1)
   - Si existe: actualizar player, log PROGRESSED, insertar stryk_event bonus, insertar coach_notification
   - Si no existe (ya esta en CONSOLIDATION): marcar como "completado" sin cambiar
4. Si NO cumple: log NOT_ELIGIBLE, notificar coach

Idempotencia: verificar que no haya un log PROGRESSED o NOT_ELIGIBLE para el mismo jugador + bloque + mes.

### 2E. Trigger lifecycle_status changes

Cuando `lifecycle_status` cambia:
- A 'inactive': no hacer nada (la progresion se salta jugadores inactivos)
- De 'inactive' a 'active': ejecutar `assign_default_membership_block()` + log RESTART_AFTER_INACTIVE

---

## Fase 3: Cron Job

Activar extensiones `pg_cron` y `pg_net` via migracion:

```text
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

Crear job mensual que llama una edge function `run-membership-progression`:
- Dia 1 de cada mes a las 06:00
- La edge function usa service_role para obtener todas las orgs activas y ejecutar el RPC por cada una

Edge function: `supabase/functions/run-membership-progression/index.ts`
- Obtener todas las organizaciones activas
- Para cada org: llamar `evaluate_membership_progression(org_id, current_date)`
- Retornar resumen

---

## Fase 4: UI Director Deportivo

### 4A. Nuevo componente: `MembershipOverview`

Ubicacion: nuevo tab "Bloques" en DirectorDeportivoDashboard, o seccion dentro de tab "Jugadores".

Contenido:
- 4 columnas/cards: Foundation | Development | Projection | Consolidation
- Cada card muestra conteo de jugadores en ese bloque
- Lista de "Elegibles para progresion" (eligible_for_progression = true)
- Lista de "No elegibles" con razon (faltan X evaluaciones, asistencia Y%)

### 4B. Indicador en PlayersTable

Mostrar chip/badge con el bloque actual del jugador (Foundation, Development, etc.) en la tabla de jugadores.

---

## Fase 5: UI Coach

### 5A. Indicador de bloque en vista del coach

En las vistas de asistencia y evaluaciones, mostrar junto al nombre del jugador su bloque actual y progreso:
- "Foundation - 2/3 evaluaciones"
- Barra de progreso del bloque

---

## Fase 6: Portal de Padres

### 6A. Componente `MembershipTimeline`

Timeline visual horizontal/vertical con los 4 bloques:
FOUNDATION --> DEVELOPMENT --> PROJECTION --> CONSOLIDATION

El bloque actual se resalta. Los completados tienen checkmark. Los futuros estan en gris.

### 6B. Progreso del bloque actual

Debajo del timeline:
- Evaluaciones: X / Y completadas
- Asistencia: Z%
- Fecha de corte: DD/MM/YYYY
- Dias restantes en el bloque

Integrar en `PortalPlayerView.tsx` como nueva seccion antes de los tabs de Retos/Logros/Actividad.

---

## Archivos a crear

| Archivo | Descripcion |
|---------|-------------|
| Migracion SQL | membership_blocks + campos players + campos evaluations + membership_progression_log + funciones + triggers + seeds |
| `supabase/functions/run-membership-progression/index.ts` | Edge function para cron mensual |
| `src/hooks/useMembershipBlocks.ts` | Hook para leer bloques y progreso del jugador |
| `src/components/membership/MembershipOverview.tsx` | Vista Director: jugadores por bloque + elegibles |
| `src/components/membership/MembershipTimeline.tsx` | Timeline visual para Portal Padres |
| `src/components/membership/BlockProgressCard.tsx` | Card con progreso del bloque actual |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/dashboard/DirectorDeportivoDashboard.tsx` | Agregar tab o seccion de Bloques |
| `src/components/players/PlayersTable.tsx` | Mostrar badge de bloque actual |
| `src/pages/portal/PortalPlayerView.tsx` | Agregar MembershipTimeline + BlockProgressCard |
| `supabase/config.toml` | Agregar config para run-membership-progression |

## Lo que NO cambia

- Sistema de XP, badges, challenges (se reutiliza)
- Attendance, evaluations core logic
- Billing/lifecycle existente
- AuthContext, RLS existentes
- Coach notifications (se reutiliza)

