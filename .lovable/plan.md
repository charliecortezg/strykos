

# Plan: Lifecycle, Billing y Semaforo Azul

Este plan cubre 3 bloques: (1) onboarding/offboarding con lifecycle tracking, (2) billing status separado con auto-desactivacion por morosidad, (3) agregar el nivel "azul sobresaliente" al semaforo de rendimiento en asistencia.

---

## Bloque 1: Schema de Base de Datos

### 1.1 Nuevas columnas en `players`

```sql
ALTER TABLE players ADD COLUMN lifecycle_status text NOT NULL DEFAULT 'prospect';
ALTER TABLE players ADD COLUMN billing_status text NOT NULL DEFAULT 'paid_current';
ALTER TABLE players ADD COLUMN last_paid_month text; -- formato YYYY-MM
ALTER TABLE players ADD COLUMN onboarded_at timestamptz;
ALTER TABLE players ADD COLUMN offboarded_at timestamptz;
```

- `lifecycle_status`: prospect | active | inactive
- `billing_status`: paid_current | overdue_1 | overdue_2 | suspended (campo separado, no mezclado con lifecycle)

### 1.2 Nueva tabla `player_lifecycle_log`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| organization_id | uuid NOT NULL | |
| player_id | uuid NOT NULL | FK -> players |
| from_status | text | |
| to_status | text | |
| reason | text (nullable) | |
| event_type | text | onboard, manual_change, auto_deactivate, offboarding_started |
| created_at | timestamptz | default now() |

RLS: SELECT para org_owner + director_deportivo. INSERT para todos los roles de la org.

### 1.3 Nueva tabla `billing_events_log`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| organization_id | uuid NOT NULL | |
| player_id | uuid NOT NULL | |
| event_type | text | payment_recorded, set_paid_current, set_overdue_1, set_overdue_2, auto_suspended |
| meta | jsonb | default '{}' |
| created_at | timestamptz | default now() |

RLS: SELECT para org_owner + director_deportivo + administrativo. INSERT para los mismos roles.

### 1.4 Nueva tabla `player_offboarding`

| Campo | Tipo | Notas |
|-------|------|-------|
| id | uuid PK | |
| organization_id | uuid NOT NULL | |
| player_id | uuid NOT NULL | |
| started_at | timestamptz | default now() |
| completed_at | timestamptz (nullable) | |
| churn_reason | text (nullable) | price, schedule, moved, lost_interest, other |
| churn_detail | text (nullable) | |
| nps_score | int (nullable) | 0-10 |
| would_return | boolean (nullable) | |
| created_at | timestamptz | default now() |

RLS: SELECT/INSERT/UPDATE para org_owner + director_deportivo.

### 1.5 Agregar valor "outstanding" al enum `attendance_performance_status`

```sql
ALTER TYPE attendance_performance_status ADD VALUE 'outstanding';
```

Esto agrega el semaforo azul (sobresaliente) como cuarto nivel del sistema de rendimiento existente.

---

## Bloque 2: Automatizaciones

### 2.1 Trigger: Onboarding al completar fichaje

Se creara un trigger en la tabla `intake_requests` que, cuando el `status` cambia a `completed`:
- Busca el `player_id` asociado
- Actualiza `players.lifecycle_status = 'active'` y `onboarded_at = now()`
- Inserta registro en `player_lifecycle_log` con event_type = 'onboard'

### 2.2 Trigger: Payment recorded -> actualizar billing_status

Al insertar un pago en `payments`:
- Extrae el mes del pago (`payment_month` ya existe en formato date)
- Actualiza `players.last_paid_month` y `billing_status = 'paid_current'`
- Inserta en `billing_events_log` con event_type = 'payment_recorded' + 'set_paid_current'

### 2.3 Edge Function: `reset-monthly-payments` (ya existe, se extiende)

La funcion `reset-monthly-payments` ya existe y se ejecuta mensualmente. Se extendera para incluir la logica de morosidad:

Para cada jugador activo (is_active = true, lifecycle_status = 'active'):
- Si `last_paid_month` = mes actual -> billing_status = 'paid_current'
- Si `last_paid_month` = mes anterior -> billing_status = 'overdue_1'
- Si `last_paid_month` <= 2 meses atras o NULL:
  - billing_status = 'overdue_2'
  - lifecycle_status = 'inactive'
  - offboarded_at = now()
  - Insertar en billing_events_log (auto_suspended)
  - Insertar en player_lifecycle_log (auto_deactivate)
  - Crear registro en player_offboarding (started_at)

Se creara una funcion SQL `check_billing_overdue()` que sera llamada por la edge function existente.

---

## Bloque 3: Semaforo Azul (Sobresaliente)

### 3.1 Cambios en el enum de DB

Agregar `outstanding` al enum `attendance_performance_status`.

### 3.2 Cambios en frontend

**Archivos a modificar:**

1. **`src/components/attendance/PerformanceIndicator.tsx`**:
   - Agregar `outstanding` al type `PerformanceStatus`
   - Agregar configuracion: label "Sobresaliente", description "Rendimiento excepcional - MVP del dia", color azul (`bg-blue-500`)
   - Actualizar `CYCLE_ORDER` a: outstanding -> excellent -> focus -> challenge
   - Agregar contador azul en `PerformanceStats`
   - Actualizar tooltip de ayuda con la descripcion del azul

2. **`src/hooks/useTrainingAttendance.ts`**:
   - Agregar `outstanding` al type `PerformanceStatus`
   - Actualizar el default performance cuando se marca presente: mantener `excellent` como default
   - Agregar conteo de `outstanding` en performanceStats

3. **`src/components/attendance/AttendanceRegistration.tsx`**:
   - Agregar contador de `outstanding` en las stats
   - Agregar filtro rapido para "Sobresaliente" (boton azul similar al de "Reto")

---

## Bloque 4: Dashboard Lifecycle & Billing

### 4.1 Nuevo componente `LifecycleBillingSection`

Se creara un componente que muestre cards con:
- **Onboarding este mes**: Conteo de jugadores con `onboarded_at` en el mes actual
- **Churn este mes**: Conteo de jugadores con `offboarded_at` en el mes actual
- **Activos**: Conteo de `lifecycle_status = 'active'`
- **Inactivos**: Conteo de `lifecycle_status = 'inactive'`
- **Overdue 1**: Conteo de `billing_status = 'overdue_1'`
- **Overdue 2**: Conteo de `billing_status = 'overdue_2'`

### 4.2 Tabla "Players at Risk"

Lista de jugadores con `billing_status` in ('overdue_1', 'overdue_2') mostrando:
- Nombre, categoria, ultimo mes pagado, billing_status, lifecycle_status
- Accion: link al perfil del jugador

### 4.3 Integracion en dashboards

- **OrgOwnerDashboard**: Agregar `LifecycleBillingSection` despues de `FounderKPISection`
- **DirectorDeportivoDashboard**: Agregar tab "Lifecycle" con el mismo componente

### 4.4 Nuevo hook `useLifecycleKPIs`

Hook que obtiene los conteos y la lista de jugadores en riesgo desde la base de datos.

---

## Bloque 5: Timeline en perfil del jugador

En `PlayerProfileModal`, agregar una seccion "Timeline" que muestre:
- Eventos de `player_lifecycle_log` (cambios de estado)
- Eventos de `billing_events_log` (cambios de billing)
- Estado de offboarding si existe

Ordenados cronologicamente, con iconos y colores por tipo de evento.

---

## Resumen de archivos

| Archivo | Accion |
|---------|--------|
| Migration SQL | Crear tablas + columnas + triggers + enum |
| `supabase/functions/reset-monthly-payments/index.ts` | Extender con logica de morosidad |
| `src/components/attendance/PerformanceIndicator.tsx` | Agregar nivel "outstanding" (azul) |
| `src/hooks/useTrainingAttendance.ts` | Agregar "outstanding" al tipo y stats |
| `src/components/attendance/AttendanceRegistration.tsx` | Agregar contador y filtro azul |
| `src/components/dashboard/LifecycleBillingSection.tsx` | Nuevo componente de KPIs |
| `src/hooks/useLifecycleKPIs.ts` | Nuevo hook |
| `src/pages/dashboard/OrgOwnerDashboard.tsx` | Integrar LifecycleBillingSection |
| `src/pages/dashboard/DirectorDeportivoDashboard.tsx` | Agregar tab Lifecycle |
| `src/components/players/PlayerProfileModal.tsx` | Agregar timeline de eventos |
| `src/types/categories.ts` | Agregar tipos de billing/lifecycle |

## Orden de implementacion

1. Migration SQL (schema + triggers)
2. Extender reset-monthly-payments
3. Semaforo azul (PerformanceIndicator + hooks)
4. Hook useLifecycleKPIs
5. Componente LifecycleBillingSection + tabla Players at Risk
6. Integrar en dashboards
7. Timeline en perfil del jugador

