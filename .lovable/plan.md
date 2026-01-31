

# Plan: Fase 3 — Demo-Ready Product Hardening

## Objetivo
Convertir STRYK en un producto demo-ready donde cualquier fundador/director:
- Confía en los datos (trazabilidad visible)
- Entiende lo que ve sin explicación (microcopy claro)
- Percibe orden, control y seriedad institucional
- Puede verlo 2 minutos y decir: "esto es justo lo que necesito"

---

## Estado Actual (Análisis)

### Trazabilidad (Trust Layer)

| Entidad | Campo `recorded_by`/`created_by` | Visible en UI? |
|---------|----------------------------------|----------------|
| Asistencias | `recorded_by` en DB | NO visible |
| Partidos | `created_by` + `last_edited_by` | SI visible (MatchDetailModal ya muestra) |
| Pagos | `recorded_by` en DB | NO visible |

### Empty States Actuales

| Componente | Estado Actual | Tono STRYK? |
|------------|---------------|-------------|
| AttendanceRegistration | "Sin jugadores" / "No hay jugadores activos" | Parcial |
| TrainerMatchesModule | "Sin partidos" / "Registra tu primer partido" | SI |
| PaymentsDashboard | "No hay pagos registrados" | Genérico |
| OperationalReports | "Sin datos de asistencia" | Genérico |
| PlayersTable | No tiene empty state | FALTA |
| PlayerProfileModal Pagos | "Historial de pagos próximamente" | INCORRECTO (ya implementado) |

### Microcopy Actual

| Componente | Texto Actual | Problema |
|------------|--------------|----------|
| AttendanceRegistration | "Guardar" | Genérico |
| CreatePaymentModal | "Crear pago" / "Registrar" | OK |
| LoadResultsModal | "Guardar y cerrar partido" | OK |
| Botones generales | Mezcla de "Guardar" / "Confirmar" | Inconsistente |

---

## Bloque 1: Trazabilidad Visible (Trust Layer)

### 1.1 Asistencias — Agregar info de registro

**Problema**: Después de guardar asistencia, el usuario no sabe quién la registró ni cuándo.

**Solución**: Mostrar footer de trazabilidad cuando existe registro guardado.

```text
Archivo: src/components/attendance/AttendanceRegistration.tsx

Cambio:
- Agregar query para obtener info de `recorded_by` de la tabla attendance
- Mostrar footer cuando `hasExistingAttendance = true`:

┌────────────────────────────────────────────────────────┐
│ ✓ Registro guardado                                    │
│ 🕒 Hoy 14:32 • Por: Coach Martínez                    │
└────────────────────────────────────────────────────────┘
```

**Hook adicional**: Modificar `useTrainingAttendance.ts` para incluir `recorded_by` con join a `profiles`.

### 1.2 Partidos — Estado ya implementado

**Estado actual**: MatchDetailModal ya muestra trazabilidad completa:
- "Registrado por: [nombre]"
- "Última edición: [nombre] — [fecha/hora]"
- Badge de estado (Terminado/Programado/Cancelado)

**Mejora mínima**: Agregar badge "Registro oficial" cuando `status = 'terminado'`.

### 1.3 Pagos — Agregar info de registro

**Problema**: La tabla de pagos no muestra quién registró cada pago.

**Solución**: 
1. Modificar query de `usePayments` para incluir join a `profiles` via `recorded_by`
2. Mostrar en tooltip o columna adicional

```text
Archivo: src/components/payments/PaymentsDashboard.tsx
Archivo: src/hooks/usePayments.ts

Cambio en hook:
- Agregar al SELECT: `recorded_by_profile:profiles!recorded_by(full_name)`

Cambio en UI:
- En mobile cards: agregar línea "Registrado por: [nombre] • [fecha hora]"
- En desktop table: agregar columna o tooltip con esta info
```

---

## Bloque 2: Demo Flows (Verificación + Optimización)

### 2.1 Demo Flow: Asistencia (10 segundos)

**Estado actual**: Funciona bien, pero el mensaje de éxito es solo un toast.

**Mejora**: 
- El botón "Guardar" ya cambia a "Guardando..." 
- Después de guardar, mostrar transición visible de éxito en el botón
- Toast ya funciona con "Asistencia registrada correctamente"

**Verificar**: No hay textos técnicos visibles.

### 2.2 Demo Flow: Partido completo

**Estado actual**: 
- Crear partido funciona
- Pasar lista funciona
- Registrar marcador funciona
- Cerrar partido funciona

**Mejora al cerrar**:
```text
Archivo: src/components/matches/LoadResultsModal.tsx

Después de handleSave exitoso:
- Toast: "Partido cerrado correctamente" (ya existe similar)
- El partido cambia a estado "Terminado" (ya funciona)
```

**Agregar**: Badge visual prominente "Registro oficial" en partidos terminados.

### 2.3 Demo Flow: Estado de Cuenta

**Estado actual**: PlayerProfileModal tab "Pagos" YA ESTÁ IMPLEMENTADO con:
- Total pagado
- Número de pagos
- Estado (Al día / Adeudo)
- Último pago destacado
- Historial completo

**Problema detectado**: El código en PlayerProfileModal líneas 334-343 todavía tiene el placeholder viejo.

**Corrección necesaria**: El tab de pagos YA FUE implementado en sesión anterior (Core Feature Completion). Verificar que el código actual muestra datos reales, no placeholder.

### 2.4 Demo Flow: Reporte Ejecutivo

**Estado actual**: OperationalReports ya muestra:
- Asistencia Global %
- Recaudado (mes)
- Pagos Pendientes
- Jugadores Activos
- Gráficas de tendencia

**Mejora**: Agregar texto guía en header:
```text
"Resumen operativo del periodo seleccionado"
```

---

## Bloque 3: Empty States + Microcopy STRYK

### 3.1 Empty States a Implementar/Mejorar

| Componente | Estado Actual | Nuevo Empty State (Tono STRYK) |
|------------|---------------|--------------------------------|
| AttendanceRegistration | "No hay jugadores activos" | "Aún no hay jugadores en esta categoría. Agrega jugadores desde el módulo de Plantilla." |
| PaymentsDashboard | "No hay pagos registrados" | "Aún no hay pagos registrados. Registra el primer pago para comenzar el control financiero." |
| TrainerMatchesModule | "Registra tu primer partido" | OK - mantener |
| OperationalReports (sin datos) | "Sin datos de asistencia" | "Aún no hay datos de asistencia. Los reportes se generarán automáticamente al registrar entrenamientos." |
| PlayersTable (vacío) | No existe | "Aún no hay jugadores registrados. Agrega tu primer jugador para comenzar." |

### 3.2 Microcopy Institucional

**Patrón de botones de acción:**

| Contexto | Texto Actual | Texto STRYK |
|----------|--------------|-------------|
| Guardar asistencia | "Guardar" | "Guardar asistencia" |
| Crear partido | "Registrar" | "Registrar partido" |
| Cerrar partido | "Guardar y cerrar" | "Cerrar partido" |
| Crear pago | "Registrar Pago" | OK - mantener |
| Crear jugador | "Crear Jugador" | "Registrar jugador" |

**Agregar donde aplique (footer de sección):**
```text
"Si no está en STRYK, no sucedió."
```

Ubicaciones sugeridas:
- Footer del módulo de asistencia (después de guardar exitosamente)
- Footer del historial de partidos
- NO en cada acción (sería invasivo)

---

## Bloque 4: Consistencia Visual y Estados

### Checklist de Estados

| Estado | Implementado? | Componente |
|--------|---------------|------------|
| Loading spinner | SI | LoadingSpinner.tsx |
| Loading skeleton | SI | loading-spinner.tsx (SettingsPanelSkeleton, CardSkeleton) |
| Success feedback | PARCIAL | ActionButton.tsx (nuevo) |
| Disabled states | SI | Buttons con disabled prop |
| Error states | SI | error-messages.ts |

### Badges Consistentes

**Partidos:**
- `programado` → Badge azul "Programado"
- `terminado` → Badge verde "Terminado" + opcional "Registro oficial"
- `cancelado` → Badge rojo "Cancelado"

**Pagos:**
- Estado de recibo con iconos (ya implementado)

**Jugadores:**
- `al_dia` → Badge verde
- `pendiente` → Badge amarillo
- `atrasado` → Badge rojo

---

## Resumen de Archivos a Modificar

### Bloque 1 (Trazabilidad)

| Archivo | Cambio |
|---------|--------|
| `src/hooks/useTrainingAttendance.ts` | Agregar query de `recorded_by` con join a profiles |
| `src/components/attendance/AttendanceRegistration.tsx` | Mostrar footer de trazabilidad |
| `src/hooks/usePayments.ts` | Agregar join a profiles via `recorded_by` |
| `src/components/payments/PaymentsDashboard.tsx` | Mostrar info de quién registró |
| `src/components/matches/MatchCard.tsx` | Agregar badge "Registro oficial" si terminado |

### Bloque 2 (Demo Flows)

| Archivo | Cambio |
|---------|--------|
| `src/components/matches/LoadResultsModal.tsx` | Verificar mensaje de éxito claro |
| `src/components/reports/OperationalReports.tsx` | Agregar texto guía en header |

### Bloque 3 (Empty States + Microcopy)

| Archivo | Cambio |
|---------|--------|
| `src/components/attendance/AttendanceRegistration.tsx` | Mejorar empty state |
| `src/components/payments/PaymentsDashboard.tsx` | Mejorar empty state |
| `src/components/players/PlayersTable.tsx` | Agregar empty state |
| `src/components/reports/OperationalReports.tsx` | Mejorar empty states de gráficas |
| Varios | Actualizar microcopy de botones |

### Bloque 4 (Consistencia Visual)

| Archivo | Cambio |
|---------|--------|
| `src/components/matches/MatchCard.tsx` | Estandarizar badges de estado |
| `src/components/matches/MatchDetailDrawer.tsx` | Agregar badge "Registro oficial" |

---

## Orden de Implementación

```text
Paso 1: Trazabilidad en Asistencias
    │   - Modificar hook
    │   - Agregar footer visual
    ▼
Paso 2: Trazabilidad en Pagos
    │   - Modificar hook
    │   - Agregar info en UI
    ▼
Paso 3: Badge "Registro oficial" en Partidos
    │
    ▼
Paso 4: Empty States mejorados
    │   - Todos los componentes listados
    ▼
Paso 5: Microcopy institucional
    │   - Botones de acción
    │   - Texto guía en reportes
    ▼
Paso 6: Consistencia de badges
    │
    ▼
Test: Verificar demo flows completos
```

---

## Criterios de Aceptación

| Criterio | Validación |
|----------|------------|
| Demo completo en móvil | Probar los 4 flows en viewport 375px |
| Usuario entiende qué pasó | Cada acción tiene feedback visible |
| Usuario sabe quién lo hizo | Trazabilidad visible en asistencias, partidos, pagos |
| Usuario sabe cuándo pasó | Timestamps visibles |
| No hay textos técnicos | Auditoría de console.log y mensajes de error |
| No hay pantallas vacías sin explicación | Todos los empty states con mensaje claro |
| STRYK se percibe como sistema oficial | Badges, microcopy, trazabilidad |

---

## Notas Técnicas

**Queries de trazabilidad:**

Para asistencias (en useTrainingAttendance):
```sql
SELECT recorded_by, profiles!attendance_recorded_by_fkey(full_name)
FROM attendance
WHERE category_id = X AND date = Y
LIMIT 1
```

Para pagos (en usePayments):
```sql
SELECT ..., recorded_by, recorded_by_profile:profiles!recorded_by(full_name)
FROM payments
```

**No se requieren migraciones SQL** - todos los campos de trazabilidad ya existen en la base de datos.

