

# Plan: Feature Flag para Evaluaciones WLA en Panel del Fundador

## Resumen

Agregar un feature flag `feature_evaluations_enabled` a nivel de organizacion, con un card de activacion en el panel del fundador (similar a STRYK Way), y condicionar la visibilidad del tab "Evaluaciones" en los dashboards de Entrenador y Director Deportivo a este flag.

---

## 1. Migracion SQL

Agregar columna a la tabla `organizations`:

| Columna | Tipo | Default |
|---------|------|---------|
| feature_evaluations_enabled | boolean | false |

---

## 2. Feature Flag en useFeatureFlags

Agregar `feature_evaluations_enabled` al hook existente `src/hooks/useStrykWay/useFeatureFlags.ts` y al tipo `StrykFeatureFlags` en `src/types/stryk-way.ts`.

---

## 3. Card de Activacion en OrgOwnerDashboard

Agregar una nueva seccion "Evaluaciones WLA" debajo (o junto a) la seccion "STRYK Way" en `src/pages/dashboard/OrgOwnerDashboard.tsx`.

El card tendra el mismo patron visual que STRYK Way:
- Icono ClipboardCheck
- Titulo: "Evaluaciones WLA"
- Descripcion: "Evaluaciones mensuales con 6 stats universales (0-20) por jugador"
- Si no activado: boton "Activar Evaluaciones" que hace UPDATE a `organizations.feature_evaluations_enabled = true`
- Si activado: badge verde "Activo"

La activacion es simple (solo un UPDATE al flag), no requiere crear packs ni seed data como STRYK Way.

---

## 4. Condicionar Tabs de Evaluaciones

### EntrenadorDashboard.tsx

- Leer `feature_evaluations_enabled` del hook
- Si false: ocultar el TabsTrigger "Evaluaciones" y su TabsContent

### DirectorDeportivoDashboard.tsx

- Misma logica: ocultar tab "Evaluaciones" si el flag esta en false

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Agregar columna `feature_evaluations_enabled` |
| `src/types/stryk-way.ts` | Agregar `feature_evaluations_enabled` al tipo |
| `src/hooks/useStrykWay/useFeatureFlags.ts` | Leer el nuevo flag |
| `src/pages/dashboard/OrgOwnerDashboard.tsx` | Agregar seccion "Evaluaciones WLA" con card activador |
| `src/pages/dashboard/EntrenadorDashboard.tsx` | Condicionar tab Evaluaciones al flag |
| `src/pages/dashboard/DirectorDeportivoDashboard.tsx` | Condicionar tab Evaluaciones al flag |

## Archivos que NO cambian

- Componentes de evaluaciones (EvaluationsModule, DirectorEvaluationsView, etc.)
- Motor WLA, rubrics, weights
- Assessment Lab (separado, no depende de este flag)
- STRYK Way

