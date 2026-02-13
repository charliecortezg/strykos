

# Plan: Agregar Asistencia al "Cargar Resultado"

## Problema

Ahora que los partidos se crean sin jugadores (`players: []`), cuando el entrenador abre "Cargar Resultado", el tab Stats esta vacio porque no existen registros en `match_players`. Necesitamos un paso de asistencia integrado directamente en el modal.

## Solucion

Agregar un nuevo tab "Asistencia" como primer tab en el `LoadResultsModal`, con el mismo patron visual que ya existe en `AttendanceRegistration` (botones grandes Presente/Ausente, semaforo de rendimiento). Cuando el entrenador marca asistencia y pasa al tab Stats, los jugadores presentes aparecen con sus controles de goles/asistencias, MVP y semaforo.

## Flujo visual

```text
Cargar Resultado
  [Asistencia]  [Marcador]  [Stats]  [Notas]
        ^
  Tab activo por defecto si no hay jugadores registrados

  Asistencia:
  ┌──────────────────────────────────────────────┐
  │ [Total: 15] [Presentes: 0] [Ausentes: 0]    │
  │                                              │
  │ [Todos presente]                             │
  │                                              │
  │ Jugador A   [✓ Presente] [✗ Ausente]         │
  │ Jugador B   [✓ Presente] [✗ Ausente]         │
  │ Jugador C   [✓ Presente] [✗ Ausente]         │
  └──────────────────────────────────────────────┘

  Stats (solo jugadores marcados como presentes):
  [Corona] [Semaforo] Jugador A  [-] 2 G [+] [-] 1 A [+]
  [Corona] [Semaforo] Jugador B  [-] 0 G [+] [-] 0 A [+]
```

## Cambios

### Archivo: `src/components/matches/LoadResultsModal.tsx`

1. **Agregar tab "Asistencia"** como primer tab (4 tabs total: Asistencia, Marcador, Stats, Notas)
2. **Cargar jugadores de la categoria** cuando `matchPlayers` esta vacio, usando query a `players` filtrado por `match.category_id`
3. **Estado local de asistencia**: `localAttendance` con `player_id`, `attended`, `performance` para cada jugador de la categoria
4. **UI de asistencia**: Reutilizar el patron visual de `AttendanceRegistration`:
   - Barra sticky con contadores (Total, Presentes, Ausentes)
   - Boton "Todos presente" con touch target grande
   - Cards por jugador con botones grandes Presente/Ausente (h-14)
   - Semaforo de rendimiento integrado en boton Presente (ciclo por tap)
   - Ausentes muestran selector de razon (Justificada/Injustificada/Enfermedad)
5. **Tab activo por defecto**: Si no hay `matchPlayers` registrados, el tab activo es "asistencia"; si ya hay registros, es "result" (marcador)
6. **Sincronizar con Stats**: `playerStats` se deriva de `localAttendance` -- solo jugadores con `attended: true` aparecen en el tab Stats con sus controles de goles/asistencias y MVP/semaforo
7. **handleSave actualizado**: Al guardar, primero insertar los `match_players` en la base de datos (si no existian) y luego actualizar el match con resultado y MVP

### Archivo: `src/hooks/useMatches.ts`

8. **Agregar mutation `createMatchPlayers`** en `useMatchPlayers` para insertar registros de `match_players` cuando se guardan por primera vez desde el modal de resultados

### Sin cambios en otros archivos

- `PerformanceIndicator` se reutiliza tal cual
- `MatchCard`, `MatchDetailModal`, `MatchDetailDrawer` ya soportan MVP y semaforo del plan anterior
- No se necesitan migraciones de base de datos

## Seccion tecnica

### Query de jugadores de categoria

Cuando `matchPlayers.length === 0` y el modal se abre, hacer query:

```text
supabase.from('players')
  .select('id, full_name, position, payment_status')
  .eq('organization_id', org.id)
  .eq('category_id', match.category_id)  -- Usar el category_id del partido, no del selector
  .eq('is_active', true)
  .order('full_name')
```

### Estado de asistencia local

```text
interface LocalPlayerAttendance {
  player_id: string;
  full_name: string;
  position: string | null;
  payment_status: string;
  attended: boolean;         // default: false (sin marcar)
  performance: MatchPerformance | null;  // 'excellent' cuando presente, null cuando ausente
  goals: number;
  assists: number;
  points: number;
}
```

### Logica de guardado

Al hacer "Guardar Resultado":
1. Si no existen `match_players` para este partido, INSERT batch de todos los jugadores (presentes y ausentes) en `match_players`
2. Si ya existen, UPDATE cada registro con stats actualizados
3. UPDATE match con `goals_for`, `goals_against`, `mvp_player_id`, `status: 'terminado'`

### Tab por defecto inteligente

```text
const hasExistingPlayers = matchPlayers.length > 0;
const defaultTab = hasExistingPlayers ? 'result' : 'attendance';
```

Esto asegura que si el entrenador vuelve a abrir un partido ya cargado, va directo al marcador (no le pide asistencia de nuevo).

