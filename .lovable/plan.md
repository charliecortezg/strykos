

# Plan: Arreglar Radar Chart + Limpiar Plan Semanal

## Problema 1: Radar Chart distorsionado

Los angulos de los 6 vertices NO estan en orden secuencial alrededor del circulo. El array actual es:

```text
CTRL: -90, DEC: -30, PAS: 30, ACT: 150, AUT: 210, DIS: 90
```

Cuando el poligono SVG conecta los puntos en orden del array, va de 30 grados a 150 grados (saltandose 90), y luego de 210 vuelve a 90. Esto crea una forma cruzada en lugar de un hexagono limpio.

**Solucion**: Reordenar los angulos para que sean equidistantes (60 grados) y en secuencia horaria empezando desde arriba (-90):

```text
CTRL: -90 (arriba)
DEC: -30 (arriba-derecha)  
PAS: 30 (abajo-derecha)
DIS: 90 (abajo)
ACT: 150 (abajo-izquierda)
AUT: 210 (arriba-izquierda)
```

Tambien se usara un grid hexagonal en lugar de circulos para que sea visualmente mas profesional.

## Problema 2: "Bullet con /" en el Plan Semanal

El parser `parseWeeklyPlan` divide el texto por `.` y `;`, lo que genera fragmentos residuales como `/` que aparecen como bullets vacios. 

**Solucion**: Filtrar ejercicios que sean solo caracteres especiales o muy cortos (menos de 3 caracteres) en la funcion `parseWeeklyPlan`.

## Archivos a Modificar

| Archivo | Cambio |
|---|---|
| `src/components/portal/RadarChart.tsx` | Reordenar angulos en secuencia, cambiar grid de circulos a hexagonos, aumentar padding de labels |
| `src/types/idp.ts` | Filtrar ejercicios residuales en `parseWeeklyPlan` |

