# Fase 3 — Panel del Dueño

Producto unificado para academias nuevas (perfil ≠ 'full'). White Lions (full) NO se toca: sigue con sus 4 paneles y selector de rol.

## 1. Nuevo flag y diccionario de lenguaje

`src/lib/feature-profiles.ts`

- Agregar `'venues'` a `FEATURE_KEYS`. `basic.venues = false`, `full.venues = true`.
- (Ya existe `unified_owner_panel`: basic=true, full=false → se usa como discriminador del Panel del Dueño.)

**Nuevo** `src/lib/owner-language.ts` (constantes de copy para reutilizar):

```
ESTADO_ACADEMIA, NUEVOS_INGRESOS, BAJAS, DEBEN_1, DEBEN_2,
JUGADORES_POR_RECUPERAR, INGRESOS_MES, GASTOS_MES, UTILIDAD,
COBRANZA_PCT, ASISTENCIA_PCT, ACTIVOS, ENTRENAMIENTOS_SEMANA
```

Esto evita que cada componente reinvente el texto.

## 2. Ruteo y header

`src/App.tsx`

- Nueva ruta `/dashboard/owner` → `OwnerDashboard` (protegida, `org_owner`, gateada con `unified_owner_panel`).
- En `auth-routing.ts` (`getDashboardPath`): si org tiene `unified_owner_panel` activo y el rol activo es `org_owner` → devolver `/dashboard/owner` en vez de `/dashboard/org-owner`.
- Las rutas existentes `/dashboard/org-owner`, `/dashboard/director-deportivo`, `/dashboard/administrativo` se conservan (White Lions las usa) pero quedan inalcanzables para academias no-full porque el routing las redirige.

`src/components/dashboard/DashboardHeader.tsx`

- Ocultar `<RoleSwitch />` cuando `unified_owner_panel` está activo.
- Quitar el badge de plan ("Freemium") en perfil no-full — no se vende plan.
- Mostrar `organization.name` (ya lo hace).

`src/components/dashboard/RoleSwitch.tsx`: añadir guarda interna `if (isEnabled('unified_owner_panel')) return null;` por defensa en profundidad.

## 3. `OwnerDashboard.tsx` (nuevo, 5 secciones)

`src/pages/dashboard/OwnerDashboard.tsx` con bottom nav móvil + sidebar desktop. Tab activo en state local.

```text
[Inicio] [Jugadores] [Dinero] [Asistencia] [Equipo]
```

### Sección 1 — Inicio

Reutiliza tal cual:

- `FounderKPISection` (6 KPIs desde `useAcademyKpis`)
- `LifecycleBillingSection` envuelto en un wrapper `EstadoAcademiaSection` que **pasa los labels traducidos** vía props o usa el diccionario `owner-language.ts`. Si el componente actual hardcodea los textos, hago un fork ligero `EstadoAcademiaSection.tsx` que llama a los mismos hooks (`useLifecycleKPIs`) pero renderiza con copy nuevo.
- Lista "Jugadores por recuperar" (deriva de overdue 1/2): reutiliza el listado dentro de `LifecycleBillingSection`; agrego botón WhatsApp `https://wa.me/<phone>?text=<mensaje>` con mensaje pre-llenado.
- Botón "Descargar Reporte Mensual" → llama al pipeline existente (`MonthlyReportSection` o `report-orchestrator`).

### Sección 2 — Jugadores

Tabs internos: **Jugadores** | **Categorías**.

- **Jugadores**: `PlayersTable` + búsqueda + filtro categoría + botones "+ Fichar" (link a `/fichajes/terminal`) e "Importar Excel" (`ExcelImportModal`). Ficha individual: `PlayerProfileModal` (ya existe).
- **Categorías**: `CategoriesTable` + `CreateCategoryModal` / `EditCategoryModal`. **Importante**: dentro de los modales de categoría, ocultar el campo "Sede" cuando `!isEnabled('venues')`. Edito los dos modales para gatear ese campo (no removerlo del schema).

### Sección 3 — Dinero

Tabs: **Pagos** | **Gastos** | **Configuración de cobranza**.

- Header con tres tarjetas: `ingresos_mes`, `gastos_mes`, `utilidad = ingresos - gastos`, más `% cobranza`.
- Pagos: `PaymentsDashboard` (registrar + tabla del mes).
- Gastos: `ExpensesModule`.
- Configuración: `BillingConfigurationPanel`.

Las cifras vienen del mismo RPC `get_academy_kpis` (ingresos, cobranza) + suma de `expenses` del mes. Un pequeño hook `useMonthlyFinanceSummary` (o cálculo inline en el header) que retorna `{ingresos, gastos, utilidad}`.

### Sección 4 — Asistencia

- Reutiliza `DirectorAttendanceView` (resumen por categoría + ranking de faltas).
- Botón "Pasar lista hoy" abre `AttendanceRegistration` (selector de categoría → lista).
- En `AttendanceRegistration`: ya gateado el bloque de Performance/XP por `feature_evaluations_enabled` / STRYK Way — verifico que en perfil basic no se muestre.

### Sección 5 — Equipo

Tabs: **Equipo** | **Configuración de la academia**.

- **Equipo**: `TrainersModule` (tabla + acciones). Botón "+ Crear Entrenador" abre `CreateUserModal` **forzando el rol a** `entrenador` vía prop nueva `lockedRole?: OrgRole` (oculta el selector y envía siempre `entrenador`).
- **Configuración de la academia**: nuevo componente simple `AcademyConfigPanel` que muestra/edita `organization.name`, `primary_sport`, métodos de pago/bancarios (de `org_intake_settings` — `IntakeSettingsPanel`) y prefijo de folio (read-only). Logo: si no hay infra, dejo placeholder "Próximamente" — confirmo con el usuario antes de inventar storage.

## 4. Backend: gate de roles en `create-org-user`

`supabase/functions/create-org-user/index.ts`:

- Obtener `feature_profile` de la org del caller.
- Si `feature_profile != 'full'` y `role != 'entrenador'` → 403 `{"error":"En esta academia solo puedes crear entrenadores"}`.
- Mismo gate en `manage-org-user` para edición de rol.

## 5. Limpieza de lenguaje (sweep)

Greppear y reemplazar dentro de los componentes que renderiza el Panel del Dueño (NO en White Lions):

- "Lifecycle", "Onboarding", "Churn", "Mora", "Plan", "Premium", "Básico", "Upgrade" → labels del diccionario.
- En `DashboardHeader`: quitar badge de plan cuando unified panel.

White Lions usa los componentes originales sin el wrapper, así que su copy no cambia. Los wrappers `EstadoAcademiaSection`, etc., solo se usan en `OwnerDashboard`.

## 6. Verificación (navegar de verdad, no "por construcción")

Login con `demo-owner@stryk-test.com / DemoStryk1234!` (Academia Demo, basic) y reportar PASA/FALLA en los 9 puntos del brief. Para White Lions (caso 7), pido al usuario que valide con su sesión (igual que en Fase 2).

## Archivos a tocar

**Nuevos**

- `src/pages/dashboard/OwnerDashboard.tsx`
- `src/components/dashboard/owner/EstadoAcademiaSection.tsx`
- `src/components/dashboard/owner/JugadoresPorRecuperar.tsx`
- `src/components/dashboard/owner/AcademyConfigPanel.tsx`
- `src/components/dashboard/owner/OwnerBottomNav.tsx` (móvil) / sidebar inline
- `src/lib/owner-language.ts`

**Editados**

- `src/lib/feature-profiles.ts` (+ flag `venues`)
- `src/App.tsx` (ruta `/dashboard/owner`)
- `src/lib/auth-routing.ts` (redirect a `/dashboard/owner` cuando aplica)
- `src/components/dashboard/DashboardHeader.tsx` (ocultar RoleSwitch + badge plan)
- `src/components/dashboard/RoleSwitch.tsx` (guarda)
- `src/components/dashboard/CreateUserModal.tsx` (prop `lockedRole`)
- `src/components/categories/CreateCategoryModal.tsx` + `EditCategoryModal.tsx` (gate Sede)
- `supabase/functions/create-org-user/index.ts` y `manage-org-user/index.ts` (gate de rol)

## Riesgo / preguntas abiertas

1. **Logo de academia**: no veo infra de storage para logos en `organizations`. Propongo dejar el campo como "Próximamente" en esta fase para no inventar bucket/columna sin tu visto bueno.
2. **Sección Dinero — utilidad**: si no existe RPC que sume gastos del mes, lo resuelvo con un `useQuery` simple sobre `expenses`. Sin nuevo backend.
3. **WhatsApp pre-llenado**: uso `wa.me` con texto plantilla "Hola {tutor}, te recuerdo el pago pendiente de {jugador} por ${monto}…". Si quieres otro copy, dímelo.

¿Apruebo y avanzo, o ajustas algo (sobre todo logo y el copy del WhatsApp)?

&nbsp;

&nbsp;

Apruebo el plan con estos ajustes:

&nbsp;

1. LOGO (sí implementar, no "Próximamente"):

   - Permitir que el dueño suba el logo de su academia en formato

     PNG, JPG o SVG (NO PDF — no es renderizable como imagen).

     Límite de tamaño razonable (ej. 2MB), validar tipo de archivo.

   - Crea la infra mínima: bucket de storage para logos + columna

     logo_url en organizations (migración aditiva).

   - El logo se muestra en el header del Panel del Dueño junto al

     nombre de la academia, y queda disponible para recibos/reportes.

   - Si no hay logo subido, fallback al ícono/nombre actual.

&nbsp;

2. SECCIÓN DINERO — separar cifras, no inventar "utilidad neta":

   - Mostrar DOS tarjetas separadas y claras: "Ingresos del mes" y

     "Gastos del mes". Son datos distintos, se presentan distintos.

   - Si se incluye un tercer número, NO se llama "Utilidad" a secas

     (sería engañoso: el dueño no registra todos sus gastos, y bruta

     ≠ neta). Etiquétalo literal: "Ingresos − Gastos registrados"

     con una nota pequeña: "Solo considera los gastos que registraste

     en STRYK".

   - Fuente única: hook useMonthlyFinanceSummary(orgId) que devuelve

     {ingresos, gastos}. ingresos del RPC get_academy_kpis (no

     recalcular); gastos = suma de expenses del mes usando la MISMA

     ventana de fecha que define el RPC para su mes, sin desfases de

     corte. Documenta esto en comentario del hook. Cualquier otra

     vista que muestre gastos usa este mismo hook.

&nbsp;

3. Copy WhatsApp (tono humano, no cobranza fría):

   "Hola {tutor}, ¿cómo está? Le recuerdo que {jugador} tiene

   pendiente la mensualidad de ${monto}. Cualquier cosa me dice

   para apoyarle. ¡Gracias!"

&nbsp;

4. Confirma que reutilizar ExpensesModule en el Panel del Dueño NO

   cambia su comportamiento para White Lions (que lo usa hoy en

   Finanzas del DD).

&nbsp;

Todo lo demás aprobado tal cual: wrapper EstadoAcademiaSection para

no contaminar el copy de WL, lockedRole=entrenador, gate doble de

roles en create-org-user y manage-org-user, gate del campo Sede en

modales de categoría, diccionario owner-language.ts, redirect de

routing a /dashboard/owner.

&nbsp;

IMPORTANTE para la verificación: Academia Demo está vacía. Antes de

reportar PASA/FALLA en la sección Dinero, carga datos de prueba en

Demo (2-3 jugadores, 1-2 pagos, 1-2 gastos) para verificar que

Ingresos y Gastos muestran cifras reales y cuadran con el resto.

Una pantalla en ceros no prueba nada.