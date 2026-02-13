

# Plan: MVP del Partido + Semaforo de Rendimiento en Partidos

## Resumen

Agregar dos funcionalidades integradas al flujo de "Cargar Resultado" sin friccion adicional para el entrenador:

1. **Semaforo de Rendimiento por jugador** -- identico al patron de asistencias, pero aplicado al contexto de partido.
2. **Seleccion de MVP** -- un tap en una corona dorada para marcar al mejor jugador.

Ambos se integran directamente en el tab "Stats" del LoadResultsModal, donde el entrenador ya esta viendo a cada jugador.

---

## Flujo visual para el entrenador (tab Stats)

```text
Toca la corona para MVP | Semaforo: rendimiento del partido

[Corona gris] [Circulo azul] Jugador A    [-] 2 G [+]  [-] 1 A [+]
[Corona gris] [Circulo verde] Jugador B   [-] 0 G [+]  [-] 0 A [+]
[CORONA ORO]  [Circulo verde] Jugador C   [-] 1 G [+]  [-] 2 A [+]

Jugadores ausentes (colapsados abajo):
              [Circulo rojo]  Jugador D   -- Ausente (automatico)
```

**Cero pasos extra.** El entrenador ya esta en esta pantalla poniendo goles y asistencias. Solo agrega un tap opcional por jugador.

---

## Semaforo de Rendimiento -- Reglas

| Color | Estado | XP Multiplicador | Descripcion |
|-------|--------|-------------------|-------------|
| Azul | Sobresaliente | 1.5x | Rendimiento excepcional en el partido |
| Verde | Bueno (default) | 1.0x | Rendimiento solido, sin novedades |
| Amarillo | Regular | 0.75x | Bajo rendimiento, necesita atencion |
| Rojo | Ausente | 0x | No participo (automatico si attended=false) |

- Al marcar un jugador como "presente", su rendimiento inicia en **Verde** (default).
- Al marcar como "ausente", su rendimiento se fuerza a **Rojo** automaticamente (sin XP).
- El entrenador puede cambiar entre Azul/Verde/Amarillo con un tap (ciclo), exactamente como en asistencias.
- El MVP recibe un bonus adicional de XP (50 XP) independiente del semaforo.

---

## Cambios en base de datos

### Tabla `match_players` -- agregar columna
- `performance` (text, nullable, default 'excellent') -- valores: 'outstanding', 'excellent', 'focus', null (absent)

### Tabla `matches` -- agregar columna
- `mvp_player_id` (uuid, nullable, FK a players, ON DELETE SET NULL)

### Trigger SQL: `process_match_performance_xp`

Al hacer UPDATE en `matches` con `status = 'terminado'`:

1. Para cada `match_player` con `attended = true`:
   - Calcular XP base del partido (ej: 30 XP) multiplicado por el multiplicador de rendimiento (1.5x, 1.0x, 0.75x)
   - Multiplicar por el `xp_multiplier` del partido (importancia: regular, importante, eliminacion, final)
   - Insertar en `stryk_events` con `source_type = 'match_performance'`, dedup por `(org_id, source_type, source_id, player_id)`

2. Si `mvp_player_id IS NOT NULL`:
   - Insertar evento adicional en `stryk_events` con `source_type = 'match_mvp'`, XP bonus = 50
   - Dedup por `(org_id, 'match_mvp', match_id, player_id)`

3. Jugadores con `attended = false` no reciben XP (rendimiento rojo automatico).

---

## Cambios en frontend

### 1. `LoadResultsModal.tsx` -- Tab Stats

**Agregar al estado:**
- `mvpPlayerId: string | null` -- jugador seleccionado como MVP
- `playerPerformance: Record<string, PerformanceStatus>` -- semaforo por jugador

**En cada fila de jugador presente:**
- A la izquierda: icono Corona (Crown de lucide-react) -- tap para seleccionar/deseleccionar MVP (toggle exclusivo, solo 1)
- Seguido: circulo de semaforo (reutilizar `PerformanceIndicator` existente con size="sm")
- Resto: stats de goles/asistencias/puntos como estan

**Jugadores ausentes:**
- Mostrar en seccion separada colapsada al fondo con circulo rojo y texto "Ausente"

**Al guardar (handleSave):**
- Enviar `mvp_player_id` al update del match
- Enviar `performance` en cada match_player update

### 2. `MatchCard.tsx` -- Indicadores visuales

- Si el match tiene `mvp_player_id`: mostrar icono de corona pequeno junto al score
- Resumen de semaforo (conteos azul/verde/amarillo/rojo) visible en variante "full"

### 3. `MatchDetailModal.tsx` / `MatchDetailDrawer.tsx`

- Mostrar badge dorada con nombre del MVP
- Mostrar semaforo de rendimiento por jugador en lista de participantes

### 4. `src/types/matches.ts`

- Agregar `mvp_player_id` y `mvp_player` al tipo Match
- Agregar `performance` al tipo MatchPlayer

### 5. `src/hooks/useMatches.ts`

- Incluir join de `mvp_player:players!matches_mvp_player_id_fkey(id, full_name)` en query de matches

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migracion SQL | Agregar columnas, trigger XP |
| `src/components/matches/LoadResultsModal.tsx` | Agregar corona MVP + semaforo rendimiento en tab Stats |
| `src/components/matches/MatchCard.tsx` | Mostrar icono corona si hay MVP |
| `src/components/matches/MatchDetailModal.tsx` | Mostrar MVP y semaforo en detalle |
| `src/types/matches.ts` | Agregar campos mvp_player_id, performance |
| `src/hooks/useMatches.ts` | Agregar join MVP player en query |

## Lo que se reutiliza (sin duplicar)

- `PerformanceIndicator` de `src/components/attendance/PerformanceIndicator.tsx` -- mismo componente, mismo patron visual
- Logica de semaforo identica a asistencias (azul/verde/amarillo/rojo con ciclo por tap)

## Lo que NO cambia

- CreateMatchFlow (MVP y rendimiento se definen al cargar resultado, no al crear)
- Attendance module (sistema independiente)
- STRYK Way Studio (configuracion manual no necesaria, todo via triggers)

