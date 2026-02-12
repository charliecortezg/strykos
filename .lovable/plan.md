

# Plan: Rediseno del Portal del Jugador - Sistema de Trayectoria

## Resumen

Transformar el dashboard del jugador de un "panel de datos" a un "sistema de trayectoria formativa", colocando el Camino White Lions como elemento principal y reorganizando los modulos existentes sin eliminar funcionalidades.

---

## Nuevo orden de la pantalla

```text
+----------------------------------+
| Header (sin cambios)             |
+----------------------------------+
| 1. MembershipHeroCard (NUEVO)    |
|    - Bloque actual destacado     |
|    - Estado del jugador          |
|    - Progreso visual             |
|    - Microcopy emocional         |
+----------------------------------+
| 2. MembershipTimeline (MEJORADO) |
|    - Horizontal desktop          |
|    - Con tooltips por bloque     |
+----------------------------------+
| 3. ProgressCard (existente)      |
|    - Nivel, XP, Racha            |
+----------------------------------+
| 4. PlayerCard (existente)        |
|    - Radar + OVR + Badges        |
+----------------------------------+
| 5. Tabs: Retos | Logros | Act.  |
|    - Con contexto de bloque      |
+----------------------------------+
```

---

## Cambios por componente

### 1. Nuevo: `MembershipHeroCard`

Archivo: `src/components/membership/MembershipHeroCard.tsx`

Card destacada con fondo diferenciado (gradiente suave azul/primario). Contenido:

- Icono de etapa + nombre del bloque (ej: "Fundacion")
- "Mes 2 de 3" calculado desde block_start_date
- Fechas inicio y fin
- Barra de progreso prominente (porcentaje temporal del bloque)
- Evaluaciones completadas: "2/3"
- Asistencia: "72% (min. 60%)"
- Estado con indicador de color:
  - Verde: "En progreso" (dentro de rango, requisitos yendo bien)
  - Amarillo: "En revision" (block_end_date se acerca y faltan requisitos)
  - Rojo: "No elegible" (block_end_date paso y no cumplio)
  - Morado: "Elegible para progresion" (eligible_for_progression = true)
- Microcopy emocional: "Esta avanzando hacia Desarrollo." o "Completa 1 evaluacion mas para avanzar."

Fallback: si `membership_stage === 'none'` o no hay bloques, mostrar card minimalista: "El camino formativo aun no ha sido activado."

### 2. Mejorar: `MembershipTimeline`

Archivo: `src/components/membership/MembershipTimeline.tsx`

Cambios:
- Agregar `Tooltip` (Radix) en cada circulo de bloque mostrando: nombre, duracion, requisitos
- Responsive: en movil (< 768px) cambiar a layout vertical con linea conectora

### 3. Eliminar: `BlockProgressCard` de la pagina

El contenido de `BlockProgressCard` (evaluaciones, asistencia, fecha de corte) se integra dentro de `MembershipHeroCard`. Ya no se renderiza por separado en `PortalPlayerView`.

### 4. Mejorar: Tabs con contexto de bloque

En `PortalPlayerView.tsx`:

**Tab Retos:**
- Agregar subtitulo: "Retos activos del bloque {blockName}" cuando hay bloque activo
- Sin filtrado real por bloque (los retos ya son globales), solo contexto visual

**Tab Logros:**
- Separar en dos secciones: "Logros del bloque actual" y "Todos los logros"
- Pasar `currentBlockId` a `BadgesGrid` para que marque visualmente cuales se ganaron en el bloque actual (comparando `earned_at` dentro del rango de fechas del bloque)

**Tab Actividad:**
- Agregar toggle/filtro simple: "Este bloque" | "Todo el historial"
- Filtrar events por `created_at` dentro del rango [block_start_date, block_end_date]

---

## Archivos a crear

| Archivo | Descripcion |
|---------|-------------|
| `src/components/membership/MembershipHeroCard.tsx` | Card principal del camino formativo con estado, progreso y microcopy |

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/membership/MembershipTimeline.tsx` | Agregar tooltips con Radix Tooltip, layout vertical en movil |
| `src/pages/portal/PortalPlayerView.tsx` | Reordenar: HeroCard > Timeline > ProgressCard > PlayerCard > Tabs. Eliminar BlockProgressCard separado. Agregar contexto de bloque a tabs. Agregar filtro actividad por bloque. |
| `src/components/portal/BadgesGrid.tsx` | Aceptar prop opcional `blockDateRange` para separar badges del bloque actual vs historicos |
| `src/components/portal/ActivityFeed.tsx` | Aceptar prop opcional `filterDateRange` para filtrar eventos |
| `src/components/portal/ChallengesActive.tsx` | Aceptar prop opcional `blockLabel` para mostrar subtitulo contextual |

## Lo que NO cambia

- `ProgressCard` (solo se mueve de posicion)
- `PlayerCard` (solo se mueve de posicion)
- `useMembershipBlocks.ts` / `usePlayerMembershipProgress` (ya tiene todos los datos necesarios)
- Hooks del portal (`usePlayerProgress`, `usePlayerBadges`, etc.)
- Backend, RLS, edge functions

## Seccion tecnica

### Calculo de estado del jugador

```text
if eligible_for_progression = true:
  estado = "elegible" (morado)
else if block_end_date < hoy AND (evals < min OR attendance < min):
  estado = "no_elegible" (rojo)
else if days_remaining <= 14 AND (evals < min OR attendance < min):
  estado = "en_revision" (amarillo)
else:
  estado = "en_progreso" (verde)
```

### Calculo de "Mes X de Y"

```text
monthsElapsed = differenceInMonths(today, block_start_date) + 1
totalMonths = block.duration_months
display = "Mes {min(monthsElapsed, totalMonths)} de {totalMonths}"
```

### Responsive (MembershipTimeline)

- Desktop (>= 768px): horizontal con flechas (como esta ahora)
- Movil (< 768px): vertical con linea conectora izquierda, cada bloque como fila

### Tooltips de bloques

Usar `@radix-ui/react-tooltip` (ya instalado). Contenido:
- Nombre del bloque
- Duracion: "3 meses"
- Evaluaciones minimas: 3
- Asistencia minima: 60%

