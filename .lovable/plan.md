# Agregar grupo de edad "4-5 años" en categorías

## Situación actual (verificada)

- El selector de grupo de edad en los modales de Crear/Editar Categoría (panel del Director Deportivo) se llena desde la lista `AGE_GROUPS` en `src/types/categories.ts`, que hoy contiene solo cuatro opciones: 6-7, 8-9, 10-11, 12-13. No existe ninguna opción 4-5 en el código.
- La base de datos no restringe el valor: la columna `age_group` de `categories` es texto libre (no hay constraint), y ya convive con valores como `sub-5`, `sub-8` y `sub-10`. Agregar la opción no requiere migración.
- La lógica White Lions ya sabe traducir un rango cuyo tope sea 5 o menos a la categoría `sub-5`, por lo que una categoría marcada como 4-5 quedará correctamente mapeada a Sub-5 en el módulo de evaluación mensual.

## Cambio a realizar

1. Agregar `{ value: '4-5', label: '4-5 años' }` como primera opción de la lista de grupos de edad, para que aparezca en el selector de Crear Categoría y de Editar Categoría.
2. Ajustar el cálculo automático de grupo de edad por fecha de nacimiento para que edades de 5 años o menos devuelvan "4-5" en lugar de caer en "6-7".

Sin cambios de base de datos y sin tocar los valores ya guardados en las categorías existentes.

## Detalles técnicos

- `src/types/categories.ts`: agregar la entrada `4-5` al arreglo `AGE_GROUPS` (consumido por `CreateCategoryModal.tsx` y `EditCategoryModal.tsx`).
- `src/lib/evaluation-utils.ts` → `calculateAgeGroup`: agregar la rama `if (age <= 5) return '4-5'` antes de la de `<= 7`.
- Los pesos de evaluación por grupo de edad (`useEvaluationWeights`) ya usan pesos por defecto cuando no existe una fila para el grupo, así que "4-5" funciona sin sembrar datos.

## Verificación

Abrir el modal de Crear Categoría y el de Editar Categoría en el panel del Director Deportivo y confirmar que "4-5 años" aparece en el selector y se guarda correctamente.
