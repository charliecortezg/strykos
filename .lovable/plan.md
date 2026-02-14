

# Plan: Permitir Cierre Parcial de Evaluaciones

## Problema

El boton "Cerrar evaluacion del mes" solo aparece cuando el 100% de los jugadores de la categoria estan evaluados (`allComplete`). En la pantalla se muestra "2/3 evaluados" porque Johan Daniel Rangel Cardenas esta "Pendiente". Mientras este pendiente, el boton no aparece.

## Solucion Propuesta

Cambiar la logica para que el Director pueda cerrar las evaluaciones **completadas** sin esperar al 100%. Esto es mas realista operativamente (un jugador puede estar lesionado, inactivo, etc.).

## Cambio Tecnico

### Archivo: `src/components/evaluations/DirectorEvaluationsView.tsx`

**Condicion actual (linea ~155):**
```text
allComplete && !allClosed
```

**Condicion nueva:**
```text
completedCount > 0 && !allClosed
```

Ademas, actualizar el texto del dialogo de confirmacion para indicar cuantos jugadores se cerraran:
- Titulo: "Cerrar evaluaciones de Feb 2026? (2 de 3 jugadores)"
- Descripcion: mencionar que solo se cerraran los jugadores con evaluacion completa, los pendientes quedaran sin evaluar este mes.

### Archivo: `src/hooks/useEvaluations.ts` (sin cambios)

La funcion `closeEvaluations` ya filtra por `evaluations.filter(e => e.status === 'open')` y salta los incompletos con `if (evalScores.length < 6) continue;`. No requiere modificacion.

## Resultado

- El boton aparecera cuando haya al menos 1 jugador completo
- Al cerrar, solo se procesaran los jugadores con 6 scores completos
- Los pendientes quedaran como "open" y podran evaluarse el siguiente mes
- El IDP y email se generaran solo para los jugadores cerrados

