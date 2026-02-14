

# Plan: Arreglar XP/Radar + Redisenar Portal + Rubrica WLA

## Problemas Identificados

### 1. Evaluacion NO genera XP ni actualiza Radar/OVR
No existe trigger que convierta eventos de `stryk_events` en XP dentro de `player_progress`. El trigger `process_attendance_xp` solo maneja asistencia. Para Carlos Cortez: `player_progress` no tiene fila, todo muestra defaults (OVR=50, XP=0).

### 2. "Nivel Actual" muestra numeros sin sentido (8-14, 0-7)
El badge muestra `band_min-band_max` crudo de la tabla `evaluation_rubrics`. Segun la rubrica oficial de White Lions, los niveles deben ser:

| Rango | Nivel | Etiqueta |
|---|---|---|
| 0-5 | Inicio | Quiere ser |
| 6-10 | En proceso | Quiere ser |
| 11-15 | Consolidado | Sabe ser |
| 16-20 | Maestria | Puede ser |

Se reemplazara el badge numerico por la etiqueta correspondiente (ej. "Sabe ser" en lugar de "8-14").

### 3. Pagina demasiado larga y desordenada en mobile
7+ secciones apiladas verticalmente. Se reorganizara en tabs.

### 4. Plan semanal es un bloque de texto
`ai_weekly_plan` se muestra como texto plano. Se cambiara a formato estructurado por dia.

### 5. Boton "Registrar sesion" se pierde
Esta enterrado entre muchas secciones.

---

## Solucion en 4 Partes

### Parte 1: Migracion SQL - Triggers para XP y Radar

Crear trigger `process_stryk_event_xp` en `stryk_events`:
- Al insertar, UPSERT en `player_progress` sumando `xp_delta` a `xp_total`
- Recalcular `level` como `GREATEST(1, floor(xp_total / 100) + 1)`

Crear funcion `update_player_radar_from_evaluation()` que al cerrar una evaluacion:
- Lea los 6 scores de `evaluation_scores`
- Mapee stats WLA a las 6 dimensiones del radar
- Actualice `player_progress.radar` y `player_progress.ovr` con el overall

Ejecutar SQL retroactivo para Carlos (crear su `player_progress` con datos reales).

### Parte 2: Corregir "Nivel Actual" con terminologia de la rubrica

En `LastEvaluationCard.tsx`, reemplazar el badge `{rubric.band_min}-{rubric.band_max}` por la etiqueta del nivel correspondiente:

```text
-- ANTES (confuso):
Actitud y Esfuerzo          [8-14]  <-- que significa?

-- DESPUES (claro):
Actitud y Esfuerzo          [Sabe ser]
  * Siempre activo en todas las estaciones
  * "No se rinde": busca el balon hasta el final
```

Agregar funcion helper `getLevelLabel(bandMin, bandMax)`:
- 0-5 -> "Quiere ser" (color rojo/naranja)
- 6-10 -> "Quiere ser" (color amarillo)
- 11-15 -> "Sabe ser" (color azul)
- 16-20 -> "Puede ser" (color verde)

### Parte 3: Rediseno de PortalPlayerView - Layout con Tabs

Nueva estructura:

**Header compacto**: Nombre + OVR + Level/XP badge integrado

**4 Tabs principales** (en lugar de todo apilado):

| Tab | Contenido |
|---|---|
| Evaluacion | LastEvaluationCard (scores + radar + rubrics con "Quiere/Sabe/Puede ser" + comentarios) |
| Plan (IDP) | IDPCard con enfoque tecnico + mentalidad + recomendaciones IA |
| Progreso | MembershipHero + Timeline + ProgressCard |
| Actividad | Retos + Logros + Feed de actividad |

**Boton flotante "Registrar Sesion"**: fijo en la parte inferior, solo visible si hay IDP activo y no se ha registrado hoy.

### Parte 4: Plan semanal estructurado

Modificar `process-idp` para que el prompt pida el plan semanal como array:
```text
[
  { "day": "Dia 1", "title": "Pase y control", "exercises": ["Pared 1-2 (5 min)", "Pase largo (10 min)"] },
  { "day": "Dia 2", ... },
  { "day": "Dia 3", ... }
]
```

Renderizar en `IDPCard` como cards individuales por dia en lugar de texto plano.

Para planes existentes con texto, hacer parsing basico.

---

## Archivos a Crear/Modificar

| Archivo | Accion | Descripcion |
|---|---|---|
| Migracion SQL | Crear | Trigger en stryk_events para XP + trigger en evaluations para radar/ovr + datos retroactivos |
| `supabase/functions/process-idp/index.ts` | Modificar | Prompt para weekly_plan como array estructurado |
| `src/pages/portal/PortalPlayerView.tsx` | Modificar | Rediseno con 4 tabs + boton flotante + header compacto |
| `src/components/portal/LastEvaluationCard.tsx` | Modificar | Cambiar badges "8-14" por "Quiere ser / Sabe ser / Puede ser" con colores |
| `src/components/portal/IDPCard.tsx` | Modificar | Weekly plan como cards por dia + boton registrar sesion prominente |
| `src/components/portal/PlayerCard.tsx` | Modificar | Hacer compacto, integrar Level/XP badge |
| `src/types/idp.ts` | Modificar | Agregar tipo `WeeklyPlanDay` |

## Terminologia de la Rubrica (referencia)

La rubrica White Lions define 3 pilares con 6 stats:

**Pilar 1 - Mentalidad y Habitos (Socio-afectiva + Volitiva)**
- Stat 1: Actitud y Esfuerzo (Laboriosidad + Entusiasmo)
- Stat 2: Disciplina y Constancia (Habitos + Respeto)
- Stat 3: Autonomia y Liderazgo (Caracter + Comunicacion)

**Pilar 2 - Tecnica Individual (Coordinativa)**
- Stat 4: Control y Conduccion
- Stat 5: Pase y Recepcion (Relacion Socio-Motriz)

**Pilar 3 - Comprension del Juego (Cognitiva + Creativa)**
- Stat 6: Decision y Juego Colectivo (Percepcion + Inteligencia Tactica)

Cada stat tiene descriptores especificos por grupo de edad (6-7 y 8-11) y por nivel (Inicio/En proceso/Consolidado/Maestria). Los bullets en `evaluation_rubrics` ya contienen estos descriptores.

