
# Plan: Sincronizar Radar del Perfil con Evaluaciones

## Problema

El radar del perfil del jugador (parte superior) muestra valores default (todos en 10/20) porque no hay un trigger que sincronice automaticamente los scores de la evaluacion cerrada con la tabla `player_progress`. La `LastEvaluationCard` lee directamente de `evaluation_scores` y muestra los datos reales (14, 11, 13, 7, 13, 4). Estan desconectados.

## Solucion

Crear un trigger SQL que, cuando una evaluacion se cierra (`status` cambia a `'closed'`), automaticamente:
1. Mapee los 6 stats de evaluacion (escala 0-20) a los 6 atributos del radar en `player_progress` (escala 0-100)
2. Actualice el OVR en `player_progress` con el `overall_score` de la evaluacion
3. Cree el registro de `player_progress` si no existe (upsert)

## Mapeo de Stats

```text
evaluation_scores (0-20)    ->  player_progress.radar (0-100)
actitud_esfuerzo            ->  mental
disciplina_constancia       ->  disciplina
autonomia_liderazgo         ->  social
control_conduccion          ->  tecnica
pase_recepcion              ->  fisica
decision_juego              ->  tactica
```

Formula: `valor_radar = (score / 20) * 100`

## Implementacion Tecnica

### 1. Migracion SQL

Crear un trigger `trg_sync_evaluation_to_progress` en la tabla `evaluations` que se ejecute en UPDATE cuando `status` cambia a `'closed'`:

- Leer los 6 scores de `evaluation_scores` para esa evaluacion
- Convertir cada score a escala 0-100
- Hacer UPSERT en `player_progress` con el nuevo radar y OVR
- Solo actuar cuando `NEW.status = 'closed'` y `OLD.status != 'closed'`

### 2. Backfill de datos existentes

Ejecutar un update inmediato para el jugador que ya tiene evaluacion cerrada pero no tiene `player_progress` (el caso actual visible en las screenshots).

## Archivos a Crear/Modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| Migracion SQL | Crear | Trigger `trg_sync_evaluation_to_progress` + backfill de evaluaciones cerradas existentes |

No hay cambios de frontend necesarios. El `RadarChart` del perfil ya lee de `player_progress.radar` correctamente, solo falta que los datos se sincronicen.
