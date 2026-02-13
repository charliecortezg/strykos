
# Plan: Corregir ciclo del semaforo en Stats de partidos

## Problema

En el tab Stats del modal "Cargar Resultado", al tocar el semaforo de rendimiento solo salta entre verde y amarillo. Esto pasa porque el `PerformanceIndicator` cicla entre 4 estados (azul, verde, amarillo, rojo), pero el tipo `MatchPerformance` solo soporta 3 (`outstanding`, `excellent`, `focus`). Cuando llega a `challenge` (rojo), el codigo lo mapea automaticamente a `focus` (amarillo), rompiendo el ciclo visual.

## Causa raiz

En `LoadResultsModal.tsx`, linea 419:
```text
const matchPerf: MatchPerformance = status === 'challenge' ? 'focus' : status;
```

Esto hace que el ciclo sea: azul -> verde -> amarillo -> (rojo se convierte en amarillo) -> azul nunca llega de nuevo correctamente.

## Solucion

En el contexto de partidos, los jugadores **presentes** no deberian tener estado "Reto" (rojo) -- ese color es para ausentes. El semaforo en Stats solo debe ciclar entre 3 estados: **Sobresaliente (azul) -> Excelente (verde) -> Enfoque (amarillo)**.

### Cambio en `src/components/attendance/PerformanceIndicator.tsx`

Agregar una prop opcional `excludeStatuses` (o `allowedStatuses`) que permita restringir los estados del ciclo. En el Stats tab, pasar solo `['outstanding', 'excellent', 'focus']` para que el ciclo de 3 funcione correctamente.

Alternativa mas simple: agregar prop `cycleOrder?: PerformanceStatus[]` que sobreescriba el `CYCLE_ORDER` por defecto.

### Cambio en `src/components/matches/LoadResultsModal.tsx`

Pasar la prop al `PerformanceIndicator` en el tab Stats para restringir el ciclo a 3 estados.

## Seccion tecnica

### PerformanceIndicator.tsx

Agregar prop opcional:
```text
cycleOrder?: PerformanceStatus[]
```

Usar `cycleOrder || CYCLE_ORDER` en la funcion `handleCycle`.

### LoadResultsModal.tsx

En el tab Stats, pasar:
```text
<PerformanceIndicator
  status={perf as PerformanceStatus}
  onChange={(status) => handlePerformanceChange(playerId, status)}
  size="sm"
  cycleOrder={['outstanding', 'excellent', 'focus']}
/>
```

### Archivos modificados
- `src/components/attendance/PerformanceIndicator.tsx` -- agregar prop `cycleOrder`
- `src/components/matches/LoadResultsModal.tsx` -- pasar `cycleOrder` al indicador en Stats
