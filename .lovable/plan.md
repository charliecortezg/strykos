
# Plan: Modulo de Evaluaciones WLA

## Resumen

Construir el sistema completo de evaluaciones mensuales para entrenadores, con 6 stats universales WLA (0-20), pesos por grupo de edad, integracion con la economia de XP/badges, y reporte web por jugador. Todo como adicion limpia sin refactor destructivo.

---

## 1. Migracion SQL: 6 tablas nuevas

### evaluation_weights
Pesos por grupo de edad configurables por organizacion. Se insertan valores WLA por defecto.

| Columna | Tipo |
|---------|------|
| id | uuid PK |
| organization_id | uuid FK |
| age_group | text ('6-7', '8-9', '10-11') |
| weights | jsonb |
| created_at | timestamptz |

Valores WLA por defecto insertados automaticamente:
- 6-7: mentalidad 50%, tecnica 30%, juego 20%
- 8-9: mentalidad 40%, tecnica 35%, juego 25%
- 10-11: mentalidad 30%, tecnica 40%, juego 30%

Donde:
- Mentalidad = stats 1-3 (Actitud, Disciplina, Autonomia)
- Tecnica = stats 4-5 (Control, Pase)
- Juego = stat 6 (Decision)

### evaluations
Una evaluacion por jugador/mes/categoria.

| Columna | Tipo |
|---------|------|
| id | uuid PK |
| organization_id | uuid |
| category_id | uuid |
| player_id | uuid |
| period | text ('2026-02') |
| age_group | text (snapshot al crear) |
| status | text ('open' / 'closed') |
| overall_score | numeric (calculado al cerrar) |
| previous_overall | numeric (snapshot mes anterior) |
| recorded_by | uuid |
| closed_by | uuid |
| closed_at | timestamptz |
| created_at | timestamptz |

UNIQUE constraint: (organization_id, player_id, period)

### evaluation_scores
6 scores por evaluacion.

| Columna | Tipo |
|---------|------|
| id | uuid PK |
| evaluation_id | uuid FK |
| stat_key | text |
| score | smallint (0-20) |
| created_at | timestamptz |

UNIQUE constraint: (evaluation_id, stat_key)

### evaluation_achievements
Logros detectados al cerrar.

| Columna | Tipo |
|---------|------|
| id | uuid PK |
| evaluation_id | uuid FK |
| achievement_key | text |
| xp_bonus | integer |
| created_at | timestamptz |

### evaluation_comments
Comentarios post-cierre.

| Columna | Tipo |
|---------|------|
| id | uuid PK |
| evaluation_id | uuid FK |
| comment | text |
| created_by | uuid |
| created_at | timestamptz |

### evaluation_rubrics
Tooltips estaticos por edad y stat. Seed data incluido.

| Columna | Tipo |
|---------|------|
| id | uuid PK |
| age_group | text |
| stat_key | text |
| band_min | smallint |
| band_max | smallint |
| bullets | jsonb (array de 3 strings) |

UNIQUE constraint: (age_group, stat_key, band_min)

---

## 2. RLS (Row Level Security)

**evaluations, evaluation_scores, evaluation_achievements:**
- SELECT: org_owner, director_deportivo, entrenador (sus categorias)
- INSERT: entrenador (sus categorias), org_owner, director_deportivo
- UPDATE: solo si status='open' + mismos roles de INSERT
- No UPDATE cuando status='closed'

**evaluation_comments:**
- SELECT: org_owner, director_deportivo, entrenador (sus categorias)
- INSERT: todos los roles de la org (post-cierre tambien)

**evaluation_weights:**
- SELECT: toda la org
- INSERT/UPDATE: org_owner, director_deportivo

**evaluation_rubrics:**
- SELECT: toda la org (datos de referencia)

---

## 3. Stat Keys y Mapeo WLA

Los 6 stats universales:

| Key | Label | Grupo |
|-----|-------|-------|
| actitud_esfuerzo | Actitud y Esfuerzo | Mentalidad |
| disciplina_constancia | Disciplina y Constancia | Mentalidad |
| autonomia_liderazgo | Autonomia y Liderazgo | Mentalidad |
| control_conduccion | Control y Conduccion | Tecnica |
| pase_recepcion | Pase y Recepcion | Tecnica |
| decision_juego | Decision y Juego Colectivo | Juego |

---

## 4. Calculo del Overall Ponderado

Al cerrar una evaluacion:

```text
score_mentalidad = promedio(stat1, stat2, stat3)
score_tecnica = promedio(stat4, stat5)
score_juego = stat6

overall = (score_mentalidad * peso_mentalidad + score_tecnica * peso_tecnica + score_juego * peso_juego)

Normalizado 0-100 = overall * (100/20)
```

El age_group se calcula del `date_of_birth` del jugador al momento de crear la evaluacion y se guarda como snapshot.

---

## 5. Integracion con Economia (stryk_events + badges)

Al cerrar evaluacion (batch por categoria):

1. Por cada jugador evaluado, insertar en `stryk_events`:
   - source_type: 'evaluation'
   - source_id: evaluation.id
   - xp_delta: overall_score (redondeado)

2. Comparar con mes anterior: si algun stat sube +3 puntos:
   - Insertar en `evaluation_achievements` con key='superacion'
   - XP bonus adicional (configurable, default 25)

3. Achievement "Genio Creativo": si stat6 (decision_juego) >= 16:
   - Insertar achievement key='genio_creativo'
   - XP bonus adicional (default 50)

---

## 6. UI: Entrenador Dashboard - Tab "Evaluaciones"

### Nuevo tab en EntrenadorDashboard.tsx

Agregar un 5to tab "Evaluaciones" con icono ClipboardCheck.

### Componente: EvaluationsModule

Vista principal del entrenador:
- Selector de categoria (de sus categorias asignadas)
- Selector de periodo (mes/anio, default mes actual)
- Lista de jugadores de esa categoria con estado:
  - "Pendiente" (sin evaluacion o scores incompletos)
  - "Completado" (6 scores guardados)
- Boton para abrir el sheet de evaluacion por jugador

### Componente: PlayerEvaluationSheet

Drawer/Sheet que se abre al tocar un jugador:
- Nombre del jugador + edad + age_group
- 6 sliders verticales (0-20) con labels WLA
- Debajo de cada slider: tooltip con rubrica por edad (bullets)
- Toggle de achievements opcionales
- Boton "Guardar y siguiente" (guarda scores + avanza al siguiente pendiente)
- Guardado individual por jugador (upsert en evaluation + evaluation_scores)

### Componente: WLARadarChart

Nuevo radar chart SVG (basado en el existente RadarChart.tsx) pero con:
- 6 ejes WLA en lugar de los 6 legacy
- Escala 0-20 en lugar de 0-100
- Labels WLA
- Overlay opcional del mes anterior (linea punteada)

---

## 7. UI: Director Deportivo - Cierre y Reporte

### Nuevo tab en DirectorDeportivoDashboard.tsx

Agregar tab "Evaluaciones" con icono ClipboardCheck.

### Componente: DirectorEvaluationsView

- Selector de categoria + periodo
- Tabla resumen: jugador, overall, delta vs mes anterior, status
- Indicador de progreso: "12/15 evaluados"
- Boton "Cerrar evaluacion del mes" (solo si todos evaluados)
  - Al cerrar: calcular overalls, deltas, achievements, insertar stryk_events, cambiar status a 'closed'

### Componente: PlayerEvaluationReport

Vista web del reporte por jugador (click en fila de la tabla):
- WLARadarChart con overlay mes anterior
- Tabla de 6 stats: score actual, score anterior, delta (+/- con color)
- Overall ponderado con badge del age_group
- Lista de achievements ganados
- Seccion de comentarios (input para agregar)

---

## 8. Archivos a crear

| Archivo | Descripcion |
|---------|-------------|
| `src/types/evaluations.ts` | Tipos TypeScript para todo el modulo |
| `src/hooks/useEvaluations.ts` | Hook principal: CRUD evaluaciones + scores |
| `src/hooks/useEvaluationWeights.ts` | Hook para pesos por edad |
| `src/hooks/useEvaluationRubrics.ts` | Hook para tooltips de rubrica |
| `src/components/evaluations/EvaluationsModule.tsx` | Vista principal entrenador |
| `src/components/evaluations/PlayerEvaluationSheet.tsx` | Sheet con 6 sliders |
| `src/components/evaluations/WLARadarChart.tsx` | Radar chart WLA 0-20 |
| `src/components/evaluations/DirectorEvaluationsView.tsx` | Vista cierre director |
| `src/components/evaluations/PlayerEvaluationReport.tsx` | Reporte web jugador |
| `src/lib/evaluation-utils.ts` | Calculo de overall, age_group, deltas |

## 9. Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/dashboard/EntrenadorDashboard.tsx` | Agregar 5to tab "Evaluaciones" con EvaluationsModule |
| `src/pages/dashboard/DirectorDeportivoDashboard.tsx` | Agregar tab "Evaluaciones" con DirectorEvaluationsView |
| Migracion SQL | 6 tablas + RLS + seed data rubrics + seed data weights |

---

## 10. Flujo completo

```text
1. Entrenador abre tab Evaluaciones
2. Selecciona categoria y mes
3. Ve lista de jugadores con estado pendiente/completado
4. Abre sheet de jugador
5. Mueve 6 sliders (0-20), ve tooltips por edad
6. Guarda y avanza al siguiente
7. Cuando todos estan completados, notifica al director

8. Director abre tab Evaluaciones
9. Ve resumen con overalls y progreso
10. Click "Cerrar evaluacion del mes"
11. Sistema calcula overalls, deltas, achievements, XP
12. Evaluaciones se bloquean (status=closed)
13. Director puede ver reporte por jugador con radar + deltas
14. Puede agregar comentarios post-cierre
```

---

## Lo que NO cambia

- Tablas existentes (players, attendance, matches, player_progress, stryk_events)
- RadarChart.tsx existente (se crea WLARadarChart nuevo)
- Economia existente de stryk_rulesets (se extiende source_type, no se modifica)
- Roles existentes (no se crea head_coach)
- Ninguna ruta existente
