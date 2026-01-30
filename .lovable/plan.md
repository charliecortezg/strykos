
# Plan: Core Feature Completion (Cerrar lo que ya prometimos)

## Objetivo
Nada "a medias" en features visibles. Completar todas las funcionalidades parcialmente implementadas.

---

## Analisis del Estado Actual

### 2.1 Perfil de Jugador - Tab Pagos

**Estado Actual:**
```tsx
// PlayerProfileModal.tsx linea 334-343
<TabsContent value="pagos">
  <div className="p-8 text-center text-muted-foreground">
    <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-50" />
    <p>Historial de pagos próximamente.</p>
    {player.monthly_fee && (
      <p className="mt-2 text-sm">
        Cuota mensual: <span className="font-semibold">${player.monthly_fee}</span>
      </p>
    )}
  </div>
</TabsContent>
```

**Problema:** Tab de pagos muestra placeholder, no datos reales.

**Hook existente:** `usePayments` ya tiene `getPlayerPayments(playerId)` que retorna historial completo.

---

### 2.2 Estados Consistentes en Partidos

**Estado Actual:**
- Tabla `matches` usa campo `status TEXT` con valores: `programado`, `terminado`, `cancelado`
- NO hay enum, son valores de texto con default `'programado'`
- NO existe estado `draft`, `in_progress` ni `locked`
- NO hay validacion de datos incompletos antes de marcar como `terminado`

**Flujo actual:**
```text
programado --> terminado (al cargar resultado)
           --> cancelado (manual)
```

**Problema:** No hay bloqueo post-cierre ni validacion de datos minimos.

---

### 2.3 Semaforo de Rendimiento

**Estado Actual:**
- Enum en DB: `attendance_performance_status: "excellent" | "focus" | "challenge"`
- Logica implementada en `AttendanceRegistration.tsx`:
  - Marcar "Presente" automaticamente asigna `excellent`
  - Marcar "Ausente" limpia `performance_status` a null
  - Tap en semaforo cicla: `excellent -> focus -> challenge -> excellent`
- Componente `PerformanceIndicator` tiene tooltip con label pero NO explica criterio

**Problema:** El usuario no sabe que significa cada estado. Es una "caja negra".

---

## Solucion Propuesta

### 2.1 Perfil de Jugador - Tab Pagos Completo

**Implementacion:**

Crear nuevo hook `usePlayerPaymentHistory` que extienda la funcionalidad existente:

```typescript
// Hook que ya existe parcialmente en usePayments.ts
getPlayerPayments(playerId) // Retorna Payment[]

// Datos a mostrar:
- Lista de pagos realizados (ordenados por fecha)
- Total pagado historico
- Ultimo pago (monto, fecha, metodo)
- Estado actual (al_dia / pendiente / atrasado)
- Meses sin pago (para adeudo)
```

**UI del Tab Pagos:**

```text
+----------------------------------------------------------+
| ESTADO DE CUENTA                                          |
+----------------------------------------------------------+
| ┌────────────────┐  ┌────────────────┐  ┌────────────────┐|
| │    $1,500      │  │      5         │  │   Al día       │|
| │  Total pagado  │  │    Pagos       │  │    Estado      │|
| └────────────────┘  └────────────────┘  └────────────────┘|
|                                                          |
| ULTIMO PAGO                                              |
| ┌──────────────────────────────────────────────────────┐ |
| │ $300 - Mensualidad Enero 2026                        │ |
| │ 14 Ene 2026 • Transferencia                          │ |
| └──────────────────────────────────────────────────────┘ |
|                                                          |
| HISTORIAL                                                |
| ┌──────────────────────────────────────────────────────┐ |
| │ 💳 $300 - Mensualidad Enero         14 Ene 2026     │ |
| │ 💵 $300 - Mensualidad Diciembre     15 Dic 2025     │ |
| │ 💳 $300 - Mensualidad Noviembre     12 Nov 2025     │ |
| │ ...                                                  │ |
| └──────────────────────────────────────────────────────┘ |
|                                                          |
| Cuota mensual: $300                                      |
+----------------------------------------------------------+
```

**Archivos a modificar:**
- `src/components/players/PlayerProfileModal.tsx` - Implementar tab pagos completo
- Usar `usePayments` hook existente (metodo `getPlayerPayments`)

---

### 2.2 Estados Consistentes en Partidos

**Flujo de estados propuesto:**

```text
            ┌──────────────────────────────────────┐
            │        CICLO DE VIDA DEL PARTIDO     │
            └──────────────────────────────────────┘

programado ──────────────────────────────────────────┐
    │ (partido futuro, sin resultado)                │
    │                                                │
    ▼                                                │
terminado ◄─────────────────────────────────────────┤
    │ (resultado cargado, editable por Director)     │
    │                                                │
    │ [Opcional futuro: locked]                      │
    ▼                                                │
cancelado ◄─────────────────────────────────────────┘
    (partido no se jugo)
```

**Validaciones requeridas antes de `terminado`:**
1. `rival_name` no vacio
2. `goals_for` y `goals_against` definidos (>= 0)
3. Al menos 1 jugador presente en `match_players` con `attended = true`

**Bloqueo de edicion (post-cierre):**
- Partidos `terminado` editables solo por `org_owner` y `director_deportivo`
- Entrenador NO puede editar partidos ya terminados
- RLS ya maneja esto via `UPDATE` policies

**Cambios propuestos:**

1. **Validacion en LoadResultsModal** antes de guardar como `terminado`:
```typescript
// Validar antes de handleSave()
if (attendingPlayers.length === 0) {
  toast.error('Marca al menos un jugador como presente');
  return;
}
```

2. **UI clara de estados** en MatchCard y MatchDetailModal:
```text
| Estado     | Badge Color      | Icono   | Editable por        |
|------------|------------------|---------|---------------------|
| programado | Primary/Blue     | Clock   | Entrenador, Director|
| terminado  | Success/Green    | Check   | Solo Director       |
| cancelado  | Destructive/Red  | X       | Director (re-abrir) |
```

3. **Mensaje cuando entrenador intenta editar partido terminado:**
```text
"Este partido ya fue cerrado. Contacta al Director Deportivo para correcciones."
```

**Archivos a modificar:**
- `src/components/matches/LoadResultsModal.tsx` - Agregar validacion minima
- `src/components/matches/MatchDetailModal.tsx` - Mensaje si `canEdit=false` y `terminado`
- `src/components/matches/MatchCard.tsx` - Indicador visual de estado editable

---

### 2.3 Consistencia Semaforo de Rendimiento

**Problema actual:** Usuario no sabe que significa cada color.

**Solucion:** Agregar explicacion contextual accesible.

**Definicion clara de estados:**

```text
┌─────────────────────────────────────────────────────────┐
│ SEMAFORO DE RENDIMIENTO - Evaluacion del Entrenador    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ 🟢 EXCELENTE                                            │
│    El jugador mostro actitud ejemplar, esfuerzo        │
│    constante y buen desempeño en el entrenamiento.     │
│    (Default al marcar presente)                        │
│                                                         │
│ 🟡 ENFOQUE                                              │
│    El jugador necesita mejorar su concentracion        │
│    o actitud. Requiere seguimiento esta semana.        │
│                                                         │
│ 🔴 RETO                                                 │
│    El jugador presenta problemas de actitud,           │
│    disciplina o rendimiento que requieren atencion     │
│    inmediata del cuerpo tecnico.                       │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Implementacion UI:**

1. **Tooltip mejorado en PerformanceIndicator:**
```typescript
// Agregar descripcion a PERFORMANCE_CONFIG
const PERFORMANCE_CONFIG = {
  excellent: {
    label: 'Excelente',
    description: 'Actitud y desempeño ejemplar',
    bgColor: 'bg-success',
    ringColor: 'ring-success/30',
  },
  focus: {
    label: 'Enfoque',
    description: 'Requiere mejorar concentracion',
    bgColor: 'bg-warning',
    ringColor: 'ring-warning/30',
  },
  challenge: {
    label: 'Reto',
    description: 'Atencion inmediata requerida',
    bgColor: 'bg-destructive',
    ringColor: 'ring-destructive/30',
  },
};
```

2. **Icono de ayuda en header de AttendanceRegistration:**
```text
Rendimiento: 🟢 5  🟡 2  🔴 1  [?]
                               │
                               └── Info tooltip/popover con explicacion
```

3. **Leyenda colapsable** al pie del modulo de asistencia (primera vez que se usa):
```tsx
<Collapsible>
  <CollapsibleTrigger>
    <Info className="w-4 h-4" /> ¿Que significa cada color?
  </CollapsibleTrigger>
  <CollapsibleContent>
    // Explicacion de los 3 estados
  </CollapsibleContent>
</Collapsible>
```

**Archivos a modificar:**
- `src/components/attendance/PerformanceIndicator.tsx` - Mejorar tooltip con descripcion
- `src/components/attendance/AttendanceRegistration.tsx` - Agregar ayuda contextual

---

## Resumen de Cambios

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `PlayerProfileModal.tsx` | Implementar tab Pagos completo con historial real |
| `LoadResultsModal.tsx` | Validacion minima antes de cerrar partido |
| `MatchDetailModal.tsx` | Mensaje para entrenador si partido bloqueado |
| `MatchCard.tsx` | Indicador visual de editabilidad por estado |
| `PerformanceIndicator.tsx` | Tooltip mejorado con descripcion |
| `AttendanceRegistration.tsx` | Icono de ayuda y leyenda explicativa |

### Sin cambios de base de datos

No se requieren migraciones SQL. Los estados de partido existentes (`programado`, `terminado`, `cancelado`) son suficientes para el flujo actual.

---

## Criterios de Exito

| Feature | Criterio |
|---------|----------|
| Tab Pagos | Muestra historial real, total pagado, ultimo pago, estado |
| Estados Partidos | Validacion minima antes de cerrar, mensaje si bloqueado |
| Semaforo | Usuario entiende que significa cada color (no es caja negra) |

---

## Orden de Implementacion

```text
1. Tab Pagos en PlayerProfileModal (mas visible, mas valor)
   │
   ▼
2. Validaciones y mensajes en Partidos
   │
   ▼
3. Explicaciones del Semaforo de Rendimiento
   │
   ▼
4. Test end-to-end de los 3 features
```

---

## Notas Tecnicas

**Hook usePayments ya tiene todo:**
- `getPlayerPayments(playerId)` - Retorna array de Payment[]
- Cada Payment tiene: amount, payment_method, payment_month, concept, created_at

**Datos reales en DB:**
- Pagos existentes con montos $300-$400
- Conceptos: "Mensualidad", "Mensualidad Enero 2025"
- Metodos: efectivo, transferencia

**RLS de partidos:**
- Entrenadores solo pueden UPDATE matches de sus categorias
- Director/Owner pueden UPDATE cualquier match
- Ya funciona correctamente para bloqueo de edicion
