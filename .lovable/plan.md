

# Plan: Desactivar paywall del Banco de Ejercicios

## Cambio

Un solo archivo: `src/hooks/usePortal/useExerciseLibrary.ts`

- Remove the subscription query entirely (no need to query `exercise_addon_subscriptions`)
- Hardcode `hasActiveSubscription: true` so the portal always shows the full exercise library
- This skips the paywall screen in `ExercisesTab.tsx` without touching any other file

The RLS on `exercise_library` already allows `anon` SELECT for active exercises, so no database changes needed.

## Archivos

| Archivo | Cambio |
|---|---|
| `src/hooks/usePortal/useExerciseLibrary.ts` | Remove subscription query, return `hasActiveSubscription: true` always |

