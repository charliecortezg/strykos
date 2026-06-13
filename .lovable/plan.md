# Fase 2 — Perfiles de features + ocultar UI de planes

## A. Migración SQL (aditiva, una sola)

```sql
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS feature_profile text NOT NULL DEFAULT 'basic',
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.organizations
  ADD CONSTRAINT organizations_feature_profile_check
  CHECK (feature_profile IN ('basic','full'));

-- Cero cambio para orgs existentes: todas quedan en 'full'
UPDATE public.organizations SET feature_profile = 'full';
```

No se toca `feature_stryk_way_enabled` (se conserva como fallback legacy).

## B. Definición de flags

**Nuevo:** `src/lib/feature-profiles.ts` con `FEATURE_KEYS`, `FeatureKey`, y `PROFILE_DEFAULTS` exactamente como especifica el brief (12 flags; en `basic` solo `unified_owner_panel:true`; en `full` todo `true` excepto `unified_owner_panel:false`).

**Resolución (precedencia):**

1. `organizations.features[key]` si está definido (boolean).
2. Solo para `stryk_way`: si no hay override, usar `feature_stryk_way_enabled` cuando no es null.
3. `PROFILE_DEFAULTS[feature_profile][key]`.

## C. Hook `useOrgFeatures()`

**Nuevo:** `src/hooks/useOrgFeatures.ts`. Lee `organization` de `useAuth()` (sin queries adicionales) y deriva flags vía la función de resolución. API: `{ profile, isEnabled(key) }`.

**Cambios en** `AuthContext`**/types:**

- `src/contexts/AuthContext.tsx`: el `select('*')` ya trae las nuevas columnas; no requiere cambios funcionales (verificar que `mapOrgRow` no las descarte).
- `src/types/auth.ts`: añadir `feature_profile: 'basic'|'full'` y `features: Record<string, boolean>` a la interfaz `Organization` (opcionales para no romper).

Reactivo a `switchOrganization` porque depende de `organization` del contexto.

## D. Gating UI (por flag)

Patrón uniforme: **(1) item de nav**, **(2) ruta**, **(3) entradas dispersas**. Rutas apagadas → componente wrapper `<FeatureRoute featureKey="..."/>` que redirige al dashboard del rol activo con `toast.error("Esta función no está disponible")`.

**Nuevos archivos:**

- `src/components/auth/FeatureRoute.tsx` — guard de ruta que usa `useOrgFeatures`.
- `src/components/auth/FeatureGate.tsx` — wrapper inline para botones/tabs/secciones.

**Aplicación por flag (archivos a editar):**


| Flag                  | Puntos a gatear                                                                                                                                                                                                                                                 |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `evaluations`         | DD: tab Evaluaciones en `DirectorDeportivoDashboard.tsx`. Entrenador: tab "Eval" en `EntrenadorDashboard.tsx` + `BottomNavBar.tsx` (filtrar item). Perfil jugador: tab Evaluaciones en `PlayerProfileModal.tsx`. Ruta `/dashboard/assessment-lab` en `App.tsx`. |
| `stryk_way`           | Ruta `/stryk-way`. `useFeatureFlags` ahora delega a `useOrgFeatures` para `feature_stryk_way_enabled` (mantiene compat). Indicadores XP/Rendimiento en vistas de asistencia/entrenador.                                                                         |
| `idp`                 | Módulo IDP en perfil de jugador y portal.                                                                                                                                                                                                                       |
| `membership_blocks`   | `MembershipOverview` (tab DD), `BlockProgressCard`, badges de bloque en jugador.                                                                                                                                                                                |
| `matches`             | DD: tab Partidos (`MatchHistoryModule`). Entrenador: tab Partidos (`TrainerMatchesModule`). Ruta `/partidos/:id`.                                                                                                                                               |
| `uniforms`            | `UniformsModule` y su tab.                                                                                                                                                                                                                                      |
| `cheer`               | `CheerModule` y su tab.                                                                                                                                                                                                                                         |
| `coach_training`      | Ruta `/training/*`. Entradas en dashboards.                                                                                                                                                                                                                     |
| `founder_copilot`     | Botón flotante `<FounderCopilot/>` en `OrgOwnerDashboard.tsx`.                                                                                                                                                                                                  |
| `family_portal`       | En `PortalAuthGuard` / `PortalDashboard`: si org del token tiene flag off, renderizar página "Portal no disponible" (componente nuevo `PortalUnavailable.tsx`), no error. Las rutas siguen montadas.                                                            |
| `session_planner`     | Entrenador: tab "Sesión" (`SessionHome`) + item del `BottomNavBar` + botón "Planificar sesión de hoy". Asistencia y Jugadores quedan siempre visibles.                                                                                                          |
| `unified_owner_panel` | Solo define el flag; sin efecto en Fase 2.                                                                                                                                                                                                                      |


## E. Ocultar UI de planes (one price)

Para usuarios que NO son platform admin:

- Eliminar de la UI: `PlansModule` (página/tab), `UpgradePlanModal`, `PlanLimitBanner`, badges de plan en headers/sidebars.
- Editar `OrgOwnerDashboard.tsx`, `AdministrativoDashboard.tsx`, `DashboardHeader` para quitar entradas a planes.
- Rutas asociadas → redirect a dashboard del rol.
- Auditar `usePlanLimits` y validaciones de límite en frontend (creación de jugadores/categorías/usuarios): comentar/eliminar los avisos y bloqueos en cliente. Sin nuevos warnings para orgs `basic` o `full`.
- `plan_limits` y `upgrade_requests` siguen accesibles **solo** desde rutas `/platform-admin/*`.

## F. Platform Admin — control de perfiles

En `src/components/platform/OrganizationDetailModal.tsx`:

- Selector `feature_profile` (basic/full) → `UPDATE organizations SET feature_profile=...`.
- Lista de los 12 flags. Cada uno con tri-estado: **Heredado** (no key en `features`) / **Forzar ON** / **Forzar OFF**. Persiste vía `UPDATE organizations SET features = features || jsonb_build_object(...)` o `features - 'key'` para limpiar.
- Mostrar el valor efectivo resuelto al lado del control (usando la misma función de resolución del cliente).

## G. Notas de compatibilidad

- White Lions ya está en `full` por el `UPDATE` de la migración → cero cambio visual ni funcional.
- `useFeatureFlags` (legacy) se reescribe internamente para delegar a `useOrgFeatures`, manteniendo su API (`feature_stryk_way_enabled`, `feature_evaluations_enabled`, etc.) para no tocar todos los call-sites.
- No se borran tablas, columnas, ni código de planes — solo se gatean.

## H. Verificación (al terminar, reportar PASA/FALLA)

1. WL login (full): 4 paneles + selector de rol + todos los módulos visibles; entrenador con 5 tabs.
2. Crear "Academia Demo" → nace `basic`; owner sin Evaluaciones/Partidos/Studio/IDP/Bloques/Uniformes/Porra/Capacitación/Copilot; sin rastro de planes/upgrade.
3. Entrenador de Demo: solo Asistencia y Jugadores; sin XP/Rendimiento al pasar lista.
4. URL directa `/partidos/...` en Demo → redirect + toast "Esta función no está disponible".
5. Platform Admin: toggle de un flag override en Demo → tras recargar la UI reacciona.
6. Usuario en dos orgs (full + basic): `switchOrganization` cambia los flags.

## Fuera de alcance

- Efecto de `unified_owner_panel` (Fase 3).
- Cambios en RPC `get_academy_kpis` / `useAcademyKpis`.
- Borrado de `feature_stryk_way_enabled` o de tablas de planes.
- Migración de datos en `features` para orgs 

&nbsp;

Apruebo el plan con una corrección y una verificación adicional:

&nbsp;

1. founder_copilot: el botón flotante aparece en TODAS las vistas

   (fundador, DD, entrenador, asistencia), no solo en

   OrgOwnerDashboard. Localiza dónde está realmente montado

   (probablemente un layout compartido) y aplica el gate en TODOS

   sus puntos de montaje. Agrega a la verificación: en Academia

   Demo el botón flotante no aparece en NINGUNA pantalla de

   ningún rol.

&nbsp;

2. Orden de la migración: ADD COLUMN → UPDATE a 'full' → ADD

   CONSTRAINT al final, para que el constraint nunca evalúe filas

   en transición.

&nbsp;

3. Confirma que register-academy no setea feature_profile

   explícitamente (debe heredar el DEFAULT 'basic' de la columna).

&nbsp;

Todo lo demás aprobado tal cual, incluyendo la delegación de

useFeatureFlags y el tri-estado del Platform Admin.