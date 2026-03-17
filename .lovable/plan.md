
# Plan: Usar age_group de la categoria como fuente de verdad en evaluaciones

## Problema

Actualmente, el modulo de evaluaciones usa `calculateAgeGroup(player.date_of_birth)` para determinar el grupo de edad de cada jugador. Esto causa que jugadores de la categoria "Escuelita Futbol" (grupo 6-7) aparezcan como "8-9" si su fecha de nacimiento los ubica en ese rango, o peor, aparezcan como "8-9" por default cuando no tienen fecha de nacimiento registrada.

Segun la gobernanza del producto, **la categoria es la fuente de verdad** para el grupo de edad, no la fecha de nacimiento del jugador.

## Causa raiz

En 4 puntos del codigo se usa `calculateAgeGroup(player.date_of_birth)` en lugar de `category.age_group`:

1. **EvaluationsModule.tsx** (linea 43): al construir `playerStatuses`, calcula `age_group` desde `date_of_birth`
2. **EvaluationsModule.tsx** (linea 63-67): al llamar `saveEvaluation`, no pasa `categoryAgeGroup`
3. **DirectorEvaluationsView.tsx** (linea ~55): al construir `summaryRows`, usa `calculateAgeGroup(player.date_of_birth)` para `ageGroup`
4. El campo `age_group` guardado en la tabla `evaluations` puede estar incorrecto en registros existentes

## Solucion

### 1. EvaluationsModule.tsx

- En `playerStatuses`, cambiar `age_group: calculateAgeGroup(p.date_of_birth)` por el `age_group` de la categoria seleccionada
- En `handleSave`, pasar `categoryAgeGroup` al llamar `saveEvaluation.mutateAsync()`

### 2. DirectorEvaluationsView.tsx

- En `summaryRows`, reemplazar `calculateAgeGroup(player.date_of_birth)` por el `age_group` de la categoria seleccionada (obtenido de `activeCategories`)

### 3. Migracion SQL (backfill)

- Actualizar los registros existentes en `evaluations` donde `age_group` no coincida con el `age_group` de su categoria:

```sql
UPDATE evaluations e
SET age_group = c.age_group
FROM categories c
WHERE e.category_id = c.id
  AND e.age_group != c.age_group;
```

## Archivos a modificar

| Archivo | Cambio |
|---|---|
| src/components/evaluations/EvaluationsModule.tsx | Usar `category.age_group` en `playerStatuses` y pasar `categoryAgeGroup` en `handleSave` |
| src/components/evaluations/DirectorEvaluationsView.tsx | Usar `category.age_group` de la categoria seleccionada en `summaryRows` |
| Migracion SQL | Backfill de `evaluations.age_group` desde `categories.age_group` |

No se requieren cambios en `useEvaluations.ts` ya que el parametro `categoryAgeGroup` ya existe y tiene prioridad cuando se proporciona.
