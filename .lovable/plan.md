

# Plan: A3 (Partidos Importantes), A6 (Asistencia Director), A7 (Reporte Mensual)

---

## A3 - Clasificacion de Partidos Importantes con XP Extra

### Base de datos
- Agregar 2 columnas a `matches`:
  - `importance` text NOT NULL DEFAULT 'regular' (valores: regular, importante, eliminacion, final)
  - `xp_multiplier` numeric NOT NULL DEFAULT 1.0

### Frontend

**CreateMatchFlow.tsx**
- Agregar selector de "Importancia" que aparece cuando `matchType` es `liga` o `torneo`
- Opciones: Regular (1.0x), Importante (1.5x), Eliminacion (2.0x), Final (2.5x)
- El `xp_multiplier` se calcula automaticamente segun la combinacion de `match_type` + `importance`
- Pasar `importance` y `xp_multiplier` al hook `useCreateMatch`

**useCreateMatch.ts**
- Agregar `importance` y `xp_multiplier` a `CreateMatchData` y al INSERT

**MatchCard.tsx**
- Mostrar badge de importancia (estrella/fuego/corona) cuando no es "regular"

**LoadResultsModal.tsx**
- Mostrar badge de importancia del partido en el header

**Tipos (matches.ts)**
- Agregar `importance` y `xp_multiplier` a la interfaz `Match`

### Tabla de multiplicadores

| match_type | importance | xp_multiplier |
|-----------|-----------|---------------|
| amistoso | regular | 1.0 |
| liga | regular | 1.5 |
| liga | importante | 2.0 |
| torneo | regular | 1.5 |
| torneo | eliminacion | 2.0 |
| cualquiera | final | 2.5 |

---

## A6 - Vista de Asistencia para Director

### Nuevo componente: `DirectorAttendanceView.tsx`
Vista de solo lectura que permite al director ver la asistencia de cualquier categoria en cualquier fecha:
- Selector de categoria (todas las categorias de la org)
- Selector de fecha (libre, no bloqueado como el del entrenador)
- Lista de jugadores con su status de asistencia y semaforo de rendimiento
- KPIs: % asistencia del dia, total presentes/ausentes
- Alerta si algun jugador tiene < 50% asistencia en las ultimas 4 semanas

### Nuevo hook: `useDirectorAttendance.ts`
- Recibe `categoryId` y `date`
- Obtiene asistencia de la tabla `attendance` (solo lectura)
- Calcula stats del dia
- Query adicional para obtener tasa de asistencia de las ultimas 4 semanas por jugador (para alertas)

### Integracion en DirectorDeportivoDashboard
- Agregar nueva tab "Asistencia" con icono CheckCircle
- El componente usa las categorias del hook `useCategories` (no limitadas al trainer)

---

## A7 - Reporte Mensual de Nuevos Alumnos

### Base de datos
- Crear tabla `monthly_reports`:
  - id uuid PK
  - organization_id uuid NOT NULL
  - report_month date NOT NULL
  - new_players_count integer
  - churned_count integer
  - snapshot jsonb (datos completos del reporte)
  - generated_by uuid
  - created_at timestamptz
  - UNIQUE(organization_id, report_month)
- RLS: SELECT para org_owner + director_deportivo + administrativo

### Edge Function: `monthly-report/index.ts`
- Recibe `organizationId` y `month` (YYYY-MM)
- Calcula:
  - Nuevos jugadores (onboarded_at en el mes)
  - Bajas (offboarded_at en el mes)
  - Crecimiento neto
  - Desglose por categoria
  - Total activos al cierre del mes
- Guarda en `monthly_reports`
- Opcionalmente envia email via Resend a org_owner y director_deportivo

### Frontend

**Nuevo componente: `MonthlyReportSection.tsx`**
- Boton "Generar Reporte" con selector de mes
- Muestra el ultimo reporte generado con cards de KPIs:
  - Nuevos alumnos
  - Bajas
  - Crecimiento neto
  - Desglose por categoria (tabla simple)
- Si ya existe reporte para ese mes, lo muestra directamente

**Nuevo hook: `useMonthlyReports.ts`**
- Lista reportes existentes
- Mutation para generar nuevo reporte (llama al edge function)

**Integracion**
- Agregar en OrgOwnerDashboard despues de LifecycleBillingSection
- Agregar tab "Reportes" en DirectorDeportivoDashboard (o dentro del tab existente de Reportes)

---

## Orden de implementacion

1. Migration SQL: columnas en `matches` + tabla `monthly_reports` + RLS
2. Tipos TypeScript: actualizar `Match` interface
3. A3: CreateMatchFlow + useCreateMatch + MatchCard + LoadResultsModal
4. A6: useDirectorAttendance + DirectorAttendanceView + tab en DirectorDashboard
5. A7: Edge function monthly-report + useMonthlyReports + MonthlyReportSection + integracion dashboards

## Archivos a crear/modificar

| Archivo | Accion |
|---------|--------|
| Migration SQL | Columnas matches + tabla monthly_reports + RLS |
| `src/types/matches.ts` | Agregar importance y xp_multiplier a Match |
| `src/hooks/useCreateMatch.ts` | Agregar importance y xp_multiplier |
| `src/components/matches/CreateMatchFlow.tsx` | Selector de importancia |
| `src/components/matches/MatchCard.tsx` | Badge de importancia |
| `src/components/matches/LoadResultsModal.tsx` | Badge de importancia |
| `src/hooks/useDirectorAttendance.ts` | Nuevo hook |
| `src/components/attendance/DirectorAttendanceView.tsx` | Nuevo componente |
| `src/pages/dashboard/DirectorDeportivoDashboard.tsx` | Tab Asistencia |
| `supabase/functions/monthly-report/index.ts` | Nueva edge function |
| `src/hooks/useMonthlyReports.ts` | Nuevo hook |
| `src/components/reports/MonthlyReportSection.tsx` | Nuevo componente |
| `src/pages/dashboard/OrgOwnerDashboard.tsx` | Integrar MonthlyReportSection |

