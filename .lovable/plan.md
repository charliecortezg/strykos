
# Plan: Product Stability & UX Hardening

## Objetivo
Cero friccion en campo. Cero bugs visibles. Cero dudas.
El Entrenador confia en STRYK sin pensar.

---

## Resumen Ejecutivo

Este plan aborda dos areas criticas:
1. **Mobile UX Corrections** - Problemas de scroll, overflow, teclado y botones
2. **Estados y Feedback de Usuario** - Loading, success, error y confirmaciones

---

## Parte 1: Mobile UX Corrections

### 1.1 Fix Scroll en Modales Largos

**Estado Actual:**
- `Dialog` component ya tiene `max-h-[90vh]` y `overflow-y-auto`
- `onOpenAutoFocus` ya previene auto-focus (evita salto de viewport)
- `PlayerProfileModal` usa estructura correcta con header fijo y contenido scrollable

**Problemas Detectados:**
- `AlertDialogContent` NO tiene `max-h-[90vh]` ni scroll
- `Drawer` no tiene manejo de altura maxima consistente
- Algunos modales como `CreateMatchModal` no usan estructura de scroll optimizada

**Cambios Propuestos:**

```text
Archivo: src/components/ui/alert-dialog.tsx
- Agregar max-h-[90vh] max-h-[90dvh] a AlertDialogContent
- Agregar overflow-y-auto overflow-x-hidden
- Agregar onOpenAutoFocus={(e) => e.preventDefault()}
```

```text
Archivo: src/components/ui/drawer.tsx
- Agregar max-h-[90dvh] a DrawerContent
- Asegurar overflow-hidden en base y overflow-y-auto interno
```

```text
Archivo: src/components/matches/CreateMatchModal.tsx
- Reestructurar para usar header fijo + body scrollable
- Aplicar patron de PlayerProfileModal
```

---

### 1.2 Fix Overflow en Asistencia / Partidos

**Estado Actual:**
- `AttendanceRegistration` usa `sticky top-0` para stats bar (correcto)
- `CreateMatchFlow` tiene `max-h-[45vh]` en lista de jugadores
- Potencial overflow horizontal en cards con texto largo

**Cambios Propuestos:**

```text
Archivo: src/components/attendance/AttendanceRegistration.tsx
- Agregar overflow-x-hidden al contenedor principal
- Verificar que sticky bar no cause layout shift
```

```text
Archivo: src/components/matches/CreateMatchFlow.tsx
Linea 200: DrawerContent className="max-h-[95vh]"
- Agregar overflow-hidden y structure con flex column
- Body scrollable separado de footer fijo
```

```text
Global: Agregar a todos los Drawer bodies
- overflow-x-hidden para prevenir scroll horizontal
```

---

### 1.3 Fix Teclado Mobile (Android) que Tapa Navegacion

**Estado Actual:**
- No hay manejo especifico de keyboard visibility
- Inputs pueden quedar tapados cuando el teclado aparece

**Cambios Propuestos:**

```text
Crear: src/hooks/useKeyboardVisibility.ts
- Hook para detectar cuando keyboard esta visible
- Ajustar scroll position automaticamente

Alternativa mas simple:
- Usar visualViewport API en componentes criticos
- Agregar padding-bottom dinamico cuando keyboard aparece
```

```text
Archivo: src/index.css
- Agregar meta viewport con interactive-widget=resizes-content
- O usar env(keyboard-inset-height) si disponible
```

```text
Archivo: index.html (meta viewport)
- Agregar: interactive-widget=resizes-content
```

---

### 1.4 Ajustar Spacing y Botones "Fat Finger"

**Estado Actual:**
- `AttendanceRegistration` ya usa botones h-14 (56px) - BIEN
- `TrainerMatchesModule` usa h-12 (48px) - ACEPTABLE
- Algunos botones son h-10 (40px) - MUY PEQUENO para campo

**Estandar Mobile STRYK:**
| Contexto | Altura Minima | Touch Target |
|----------|---------------|--------------|
| Accion primaria en campo | h-14 (56px) | 48x48px min |
| Accion secundaria | h-12 (48px) | 44x44px min |
| Iconos en toolbar | h-10 w-10 | 40x40px min |

**Cambios Propuestos:**

```text
Archivos a revisar y ajustar:
- IntakeTerminal.tsx - Botones de submit
- CreateMatchFlow.tsx - Botones de navegacion
- TrialClassModal.tsx - Formulario completo
```

```text
Patron a aplicar:
- Botones de accion principal: className="h-14 text-base"
- Espaciado entre elementos tactiles: gap-3 minimo
- Inputs en formularios: className="h-12 text-base"
```

---

### 1.5 Validar Landscape/Portrait Locks

**Estado Actual:**
- No hay locks implementados
- UI funciona en ambas orientaciones pero puede ser suboptima

**Recomendacion:**
- NO bloquear orientacion (frustra usuarios)
- En lugar de eso, optimizar layouts para ambas

```text
Archivo: src/components/attendance/AttendanceRegistration.tsx
- En landscape: mostrar mas columnas en stats grid
- Ajustar max-height de listas para viewport horizontal
```

---

## Parte 2: Estados y Feedback de Usuario

### 2.1 Loading States Claros

**Estado Actual:**
- Spinner basico: `animate-spin rounded-full border-b-2`
- Skeleton component existe pero poco usado
- Algunos componentes no muestran loading (IntakeSettingsPanel)

**Problemas:**
- Loading spinner generico no indica que esta cargando
- Falta feedback durante operaciones largas
- Usuario no sabe si click funciono

**Cambios Propuestos:**

```text
Crear: src/components/ui/loading-spinner.tsx
- Componente estandar con opcional label
- Variantes: inline, fullscreen, overlay
- Mensajes contextuales: "Cargando jugadores...", "Guardando..."
```

```text
Patron de Loading States:
| Estado | Componente | Mensaje |
|--------|------------|---------|
| Lista inicial | Skeleton rows | (visual) |
| Guardando | Button disabled + spinner | "Guardando..." |
| Procesando | Overlay spinner | "Procesando fichaje..." |
| Cargando datos | Center spinner + text | "Cargando..." |
```

```text
Archivos a actualizar:
- PlayersTable.tsx - Usar skeleton en lugar de spinner
- IntakeHistory.tsx - Ya usa Loader2 (correcto)
- IntakeSettingsPanel.tsx - Agregar loading inicial
- AttendanceRegistration.tsx - Ya tiene loading (correcto)
```

---

### 2.2 Success States Visibles

**Estado Actual:**
- `toast.success()` usado consistentemente
- IntakeTerminal tiene pantalla de exito dedicada (patron ideal)
- Algunos toasts desaparecen muy rapido

**Patron Ideal (IntakeTerminal):**
```
1. Accion completada
2. Transicion a pantalla de exito
3. Iconografia clara (Check verde)
4. Mensaje de confirmacion
5. Siguiente accion clara ("Nuevo Fichaje")
```

**Cambios Propuestos:**

```text
Archivo: src/components/attendance/AttendanceRegistration.tsx
- Despues de guardar, mostrar feedback visual inmediato
- Badge temporal: "Asistencia guardada"
- Animacion sutil en boton de guardar
```

```text
Patron para acciones criticas:
1. Button cambia a estado "success" brevemente
2. Toast confirma la accion
3. UI se actualiza inmediatamente (optimistic)
```

```text
Crear: Componente ActionButton con estados
- idle: texto normal
- loading: spinner + "Guardando..."
- success: check + "Guardado" (2 segundos)
- error: x + "Error" (click para reintentar)
```

---

### 2.3 Error States Entendibles (No Tecnicos)

**Estado Actual:**
- Mensajes de error en espanol (bien)
- Algunos errores muestran detalles tecnicos
- IntakeTerminal tiene pantalla de error dedicada (patron ideal)

**Mapa de Errores a Humanizar:**

| Error Tecnico | Mensaje Usuario |
|---------------|-----------------|
| Network error | "Sin conexion. Verifica tu internet." |
| 23505 unique violation | "Este jugador ya fue registrado." |
| RLS policy violation | "No tienes permiso para esta accion." |
| 500 server error | "Algo salio mal. Intenta de nuevo." |
| Timeout | "La operacion tardo demasiado. Intenta de nuevo." |

**Cambios Propuestos:**

```text
Crear: src/lib/error-messages.ts
- Funcion getHumanErrorMessage(error)
- Mapeo de codigos a mensajes amigables
- Fallback generico para errores desconocidos
```

```text
Actualizar hooks para usar mensajes humanizados:
- useTrainingAttendance.ts (onError)
- usePayments.ts (onError)
- useIntake.ts (ya humaniza algunos)
```

---

### 2.4 Confirmaciones Antes de Acciones Criticas

**Estado Actual:**
- `AlertDialog` usado para desactivar usuarios
- `AlertDialog` usado para eliminar partidos
- PlayersTable tiene confirmacion de desactivacion

**Acciones que REQUIEREN confirmacion:**

| Accion | Implementado? | Componente |
|--------|---------------|------------|
| Desactivar jugador | SI | PlayersTable |
| Desactivar usuario | SI | ConfirmDeactivateDialog |
| Eliminar partido | SI | MatchHistoryModule |
| Cambiar plan de usuario | NO | - |
| Eliminar pago | NO | - |
| Cancelar fichaje en progreso | NO | IntakeTerminal |

**Cambios Propuestos:**

```text
Archivo: src/components/fichajes/IntakeTerminal.tsx
- Agregar confirmacion si usuario intenta cerrar con datos ingresados
- "Tienes datos sin guardar. Seguro que quieres salir?"
```

```text
Crear: src/components/ui/confirm-dialog.tsx
- Wrapper reutilizable sobre AlertDialog
- Props: title, description, confirmText, variant (default/destructive)
- Uso: <ConfirmDialog onConfirm={action} />
```

---

## Archivos a Modificar

| Archivo | Cambios |
|---------|---------|
| `src/components/ui/alert-dialog.tsx` | Agregar scroll, max-height, auto-focus prevention |
| `src/components/ui/drawer.tsx` | Agregar max-height, overflow control |
| `src/components/matches/CreateMatchModal.tsx` | Estructura scroll optimizada |
| `src/components/attendance/AttendanceRegistration.tsx` | Success feedback, overflow-x-hidden |
| `src/components/fichajes/IntakeTerminal.tsx` | Confirmacion al cerrar |
| `index.html` | Meta viewport interactive-widget |

## Archivos a Crear

| Archivo | Proposito |
|---------|-----------|
| `src/lib/error-messages.ts` | Mapeo de errores a mensajes humanos |
| `src/components/ui/confirm-dialog.tsx` | Wrapper reutilizable para confirmaciones |
| `src/components/ui/action-button.tsx` | Boton con estados loading/success/error |

---

## Metricas de Exito

| Criterio | Validacion |
|----------|------------|
| Modales no se cortan en mobile | Test en viewport 375x667 |
| Teclado no tapa inputs | Test en Android Chrome |
| Botones son tocables con dedo gordo | Touch target >= 44px |
| Usuario sabe que accion funciono | Toast + feedback visual |
| Errores son entendibles | Sin codigos ni stack traces |
| Acciones destructivas protegidas | Confirmacion requerida |

---

## Orden de Implementacion

```text
1. AlertDialog + Drawer scroll fixes (base components)
2. Confirmaciones en acciones criticas
3. Error messages humanizados
4. Success feedback mejorado
5. Mobile keyboard handling
6. Touch target audit y fixes
```

---

## Notas Tecnicas

**iOS Safari:**
- Usar `dvh` en lugar de `vh` para viewport dinamico
- `overscroll-contain` previene bounce effect

**Android Chrome:**
- `interactive-widget=resizes-content` ajusta viewport con keyboard
- Usar `visualViewport` API para deteccion precisa

**Skeleton vs Spinner:**
- Skeleton: listas y contenido estructurado
- Spinner: acciones individuales y cargas cortas
