
# Fase 2 — Paso 0 (versión final aprobada)

Solo presentación. Sin migraciones SQL ni cambios de schema.

## 1. Stat-card "Jugadores" del Director Deportivo

**Archivo:** `src/pages/dashboard/DirectorDeportivoDashboard.tsx`

- Importar `useAcademyKpis` y llamar `useAcademyKpis(organization?.id)`.
- Sustituir el valor de la tarjeta "Jugadores" (calculado hoy como `players.filter(p => p.is_active).length`) por `kpis.jugadores_activos` del RPC.
- Skeleton mientras `isLoading`.
- **No tocar** Categorías, Sedes, Entrenadores.

## 2. KPIs superiores de `PaymentsDashboard`

**Archivo:** `src/components/payments/PaymentsDashboard.tsx`

Importar `useAcademyKpis(organization?.id)` desde `useAuth`.

Tres tarjetas (sin filtros activos → RPC; con filtros → cálculo local + chip "Filtrado"):

- **Recaudado** → `formatCurrency(kpis.ingresos_mes)` | filtrado: `formatCurrency(filteredStats.totalMonth)`.
- **Cobranza** (antes "Al día") → **siempre** `${kpis.pct_cobranza}%`, título `Cobranza`, subtítulo `del mes`. **No** se mezcla con conteos locales bajo ninguna circunstancia. Si hay filtros activos, la tarjeta sigue mostrando el % canónico (no se sustituye por % filtrado).
- **Pendiente cobrar** → `formatCurrency(kpis.monto_pendiente)` | filtrado: cambia a contador `filteredStats.pendingCount` con sufijo "jugadores" + chip "Filtrado".

Chip "Filtrado" pequeño dentro de la card (texto `Filtrado`) cuando `hasActiveFilters` y la card cambia de fuente.

## 3. `AccountStatementView`

Verificado: este componente **no tiene tarjetas KPI superiores** (solo barra de búsqueda + filtros + lista). No requiere cambios en este paso. Se omite del scope.

## 4. Badge "Expirada" en sesiones (solo UI)

Nuevo helper `src/lib/session-status.ts`:

```ts
import { parseDateOnly, getLocalToday } from './time-utils';

export type DisplaySessionStatus = 'borrador' | 'activa' | 'completada' | 'expirada' | (string & {});

/**
 * Si status === 'activa' y la sesión es más de 7 días en el pasado → 'expirada'.
 * Ejemplo: sesión 2026-04-09 vista el 2026-06-12
 *          diff = (hoy - sesión) en días = ~64 → 'expirada'.
 */
export function getDisplaySessionStatus(s: {
  status: string | null | undefined;
  session_date: string | null | undefined;
}): DisplaySessionStatus {
  if (s.status !== 'activa' || !s.session_date) return (s.status ?? 'borrador') as DisplaySessionStatus;
  const today = parseDateOnly(getLocalToday());
  const sessionDate = parseDateOnly(s.session_date);
  const diff = Math.floor((today.getTime() - sessionDate.getTime()) / 86_400_000); // positivo = pasado
  return diff > 7 ? 'expirada' : 'activa';
}
```

**Archivos a actualizar:**

- `src/components/sessions/SessionHome.tsx` — sección "Sesiones recientes" (líneas ~241-251): aplicar `getDisplaySessionStatus` y agregar variante visual `expirada` (`border-muted-foreground/30 text-muted-foreground`). El botón "Activar partido" de la sesión de HOY (línea 168) no cambia: hoy nunca cae en "expirada".
- `src/components/sessions/HistorialSesiones.tsx` —
  - Extender `STATUS_COLORS` con `expirada: 'border-muted-foreground/30 text-muted-foreground'`.
  - Agregar `'expirada'` a `FilterStatus` y a la pill-row.
  - En el filtro y en el badge usar el status **derivado** (`getDisplaySessionStatus(s)`), no `s.status`, para que filtrar por "Expirada" funcione y para que ninguna fila pintada como `activa` tenga fecha vencida.

## 5. Nomenclatura para Fase 2 propiamente

Confirmado: el perfil de White Lions Academies se llamará **`full`** (no `enterprise`). Toda la Fase 2 usará `feature_profile: 'basic' | 'full'`. Se aplicará cuando entremos a Fase 2 propiamente; no toca este paso 0.

## Fuera de alcance (confirmado)

- `OperationalReports`, `MonthlyReportsPage`, tabla "Jugadores en Riesgo".
- Cambios al RPC `get_academy_kpis` (no se amplía con conteo exacto "al día"; queda para futuro si se requiere).
- Mutaciones de `session_plans.status` en DB.
- `AccountStatementView` (no tiene KPIs superiores).

## Verificación al terminar

Reporto cada punto como PASA/FALLA con el número observado:

1. Director Dashboard → stat-card "Jugadores" == tab Lifecycle "Activos" == Fundador KPI "Activos" (mismo `jugadores_activos`).
2. Finanzas → Pagos (sin filtros) → "Recaudado" == Fundador "Ingresos mes".
3. Finanzas → Pagos (sin filtros) → "Pendiente cobrar" == Fundador "Monto pendiente".
4. Finanzas → Pagos (con filtro de categoría) → tarjetas Recaudado/Pendiente muestran cálculo local + chip "Filtrado"; Cobranza sigue mostrando el % canónico.
5. SessionHome y Historial → ninguna sesión con `session_date` > 7 días en el pasado se pinta como "Activa"; aparece como "Expirada" en gris.
6. Móvil 360 px → todas las tarjetas y badges sin overflow.
