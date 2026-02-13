

# Plan Actualizado: Logica de Focus Areas del IDP

## Cambio de Enfoque

El IDP NO busca los 3 stats mas bajos. En su lugar, aplica una logica de **crecimiento de fortalezas + regulacion de debilidades**:

### Pilares

| Pilar | Stats | Naturaleza |
|---|---|---|
| Pilar 1: Mentalidad | 1. Actitud y Esfuerzo, 2. Disciplina y Constancia, 3. Autonomia y Liderazgo | Comportamental |
| Pilar 2: Tecnica + Juego | 4. Control y Conduccion, 5. Pase y Recepcion, 6. Decision y Juego Colectivo | Entrenable |

### Logica de seleccion (3 focus areas)

1. De los stats 4, 5, 6: tomar los **2 mas altos** (fortalezas a potenciar)
2. De los stats 4, 5, 6: tomar el **1 mas bajo** (debilidad a regular)
3. Resultado: 3 focus areas siempre del pilar tecnico/juego

### Pilar 1 (Mentalidad): tratamiento separado

- Si algun stat de 1, 2, 3 esta por debajo de un umbral (ej. < 12), se generan **indicaciones comportamentales** en `plan_json`
- NO se registran como focus areas entrenables
- NO generan sesiones de entrenamiento
- Se presentan como "Acciones en casa" con tareas especificas para los proximos 30 dias
- Ejemplo: "Practicar puntualidad: llegar 10 min antes", "Elegir 1 ejercicio y liderarlo en grupo"

### Combinaciones ejemplo

Si un jugador tiene scores: Actitud=8, Control=15, Pase=17, Decision=12

- Focus areas (entrenables): **Pase (17, potenciar)**, **Control (15, potenciar)**, **Decision (12, regular)**
- Indicaciones mentalidad: Actitud=8 (bajo) -> tareas comportamentales en plan_json

## Cambios al Plan Original

### En Edge Function `process-idp`

La logica de seleccion cambia de:

```text
-- ANTES: 3 stats mas bajos de los 6
ORDER BY score ASC LIMIT 3
```

A:

```text
-- DESPUES: Solo stats 4,5,6
-- 2 mas altos (fortalezas) + 1 mas bajo (debilidad)
1. Filtrar scores donde stat_key IN ('control_conduccion', 'pase_recepcion', 'decision_juego')
2. Ordenar DESC: tomar top 2 como "potenciar"
3. El restante es "regular"
```

### En tabla `idp_focus_areas`

Agregar campo `focus_type`:

```text
focus_type text NOT NULL default 'strengthen'  -- 'strengthen' | 'improve'
```

- `strengthen`: los 2 stats mas altos (potenciar fortaleza)
- `improve`: el 1 stat mas bajo (regular debilidad)

### En `plan_json` (estructura)

```text
{
  "focus_areas": [
    { "stat_key": "pase_recepcion", "type": "strengthen", "initial": 17, "target": 19 },
    { "stat_key": "control_conduccion", "type": "strengthen", "initial": 15, "target": 17 },
    { "stat_key": "decision_juego", "type": "improve", "initial": 12, "target": 15 }
  ],
  "mentalidad_actions": [
    {
      "stat_key": "actitud_esfuerzo",
      "score": 8,
      "actions": [
        "Llegar 10 minutos antes al entrenamiento",
        "Dar 3 palabras de animo a companeros por sesion",
        "Completar todos los ejercicios sin quejarse"
      ],
      "duration_days": 30
    }
  ],
  "weekly_plan": { ... }
}
```

### En Portal Padres (`IDPCard`)

La card mostrara dos secciones:

**1. Enfoque Tecnico (sesiones registrables)**
- 2 stats con badge "Potenciar" (verde)
- 1 stat con badge "Mejorar" (amarillo)
- Barra de progreso de initial a target
- Boton "Registrar sesion" (solo aplica a estos)

**2. Indicaciones de Mentalidad (si aplica)**
- Solo aparece si algun stat 1-3 esta bajo
- Lista de acciones concretas para casa
- Sin boton de sesion, sin XP directo
- Texto: "Acciones recomendadas para los proximos 30 dias"
- Checkbox opcional "Estoy trabajando en esto" (soft tracking, no bloquea nada)

### En Gating de Progresion

Sin cambio: el gating sigue pidiendo IDP activo + sesiones minimas. Las sesiones solo cuentan sobre el pilar tecnico (4,5,6), no sobre mentalidad.

## Archivos afectados (vs plan original)

| Archivo | Cambio |
|---|---|
| Migracion SQL | Agregar `focus_type` a `idp_focus_areas` |
| `supabase/functions/process-idp/index.ts` | Nueva logica de seleccion (2 altos + 1 bajo de stats 4-6) + generacion de mentalidad_actions |
| `src/types/idp.ts` | Agregar `focus_type` al tipo, agregar tipo `MentalidadAction` |
| `src/components/portal/IDPCard.tsx` | Dos secciones: Enfoque Tecnico + Indicaciones Mentalidad |

Todo lo demas del plan original se mantiene igual (tablas, RLS, sesiones, streak, gating, cron, email).

