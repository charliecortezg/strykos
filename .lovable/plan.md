

# Plan: Reparar y Completar Terminal de Fichaje

## Problemas Encontrados

### Bug Critico #1: `payment_month` tipo incorrecto
La funcion de base de datos `process_intake_and_create_entities` envia `to_char(now(), 'YYYY-MM')` (texto) a la columna `payment_month` que es tipo `date`. Esto causa el error visible en las capturas de pantalla.

**Solucion:** Modificar la funcion SQL para usar `date_trunc('month', now())::date` en lugar de texto.

### Bug #2: Registros huerfanos en estado 'failed'
Hay 3 registros de prueba atascados en estado `failed` que bloquean nuevos intentos con los mismos datos (idempotency key). Se deben limpiar.

---

## Funcionalidades Faltantes (Cross-reference con Spec)

| Feature del Spec | Estado Actual | Accion |
|-----------------|---------------|--------|
| Toggle "Fichaje en Cancha" | Hardcoded a `true` | Agregar switch visible |
| Seleccion de Sede (venue) | No existe en formulario | Agregar selector |
| Ocupacion del tutor | No existe en formulario | Agregar campo |
| Seleccion de Plan | No existe en formulario | Agregar selector opcional |
| Precios $400/$450/$400/$300 | Usa defaults $500/$450/$400 | Actualizar defaults y crear settings si no existen |
| Evidencia obligatoria en efectivo | Ya funciona | OK |
| QR de transferencia | Ya funciona | OK |

---

## Cambios a Realizar

### Fase 1: Fix de la Base de Datos

**1.1 Corregir funcion `process_intake_and_create_entities`**
- Cambiar `v_payment_month` de `to_char(now(), 'YYYY-MM')` a `date_trunc('month', now())::date`
- Cambiar el tipo de la variable a `date`

**1.2 Limpiar registros fallidos de prueba**
- Eliminar los 3 `intake_requests` con status='failed' y processing_error de `payment_month`

**1.3 Crear configuracion de intake si no existe**
- Insertar registro en `org_intake_settings` para White Lions con los precios del spec:
  - `registration_fee`: $400
  - `soccer_fee`: $450
  - `basketball_fee`: $400
  - `promo_fee`: $300
  - `promo_active`: true

### Fase 2: Completar el Formulario del IntakeTerminal

**2.1 Agregar campos faltantes al formulario (`IntakeTerminal.tsx`)**

Seccion 1 - Datos del Jugador (sin cambios)

Seccion 2 - Datos del Tutor:
- Agregar campo "Ocupacion" (opcional)

Seccion 3 - Deporte y Categoria:
- Agregar selector de Sede (venues del org)
- Agregar toggle "Fichaje en Cancha" (solo visible para Futbol, controla promo)
- Agregar selector de Plan (opcional, filtrado por deporte)

Seccion 4 - Pago (sin cambios estructurales, ya funciona bien)

**2.2 Actualizar calculo de fees**
- Conectar el toggle "Fichaje en Cancha" con la logica de `calculateIntakeFees` (actualmente hardcoded a `true`)
- La promo solo aplica cuando: deporte=Futbol AND isPitchSigning=true AND promo_active=true

**2.3 Pasar datos adicionales al hook `useCreateIntake`**
- Enviar `venueId`, `planId`, `guardianOccupation` que ya existen en la interfaz de `CreateIntakeData` pero no se pasan desde el formulario

### Fase 3: Mejoras UX segun Spec

**3.1 Altura de inputs touch-friendly**
- Asegurar que todos los inputs tengan minimo h-12 (48px) para uso en campo

**3.2 Formato del boton CTA**
- Mantener el boton fijo "Registrar Fichaje - $TOTAL" (ya existe)

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| DB Migration | Fix `process_intake_and_create_entities`, limpiar datos, crear settings |
| `src/components/fichajes/IntakeTerminal.tsx` | Agregar campos: ocupacion, sede, plan, toggle cancha |
| `src/hooks/useIntake.ts` | Actualizar defaults de precios a $400/$450/$400/$300 |

## Archivos Sin Cambios

| Archivo | Razon |
|---------|-------|
| `DateInput.tsx` | Ya funciona correctamente con formato DD/MM/AAAA |
| `CameraCapture.tsx` | Ya funciona con compresion y preview |
| `TransferQRDisplay.tsx` | Ya funciona con QR y datos bancarios |
| `useVenues.ts` | Ya existe, solo necesitamos importarlo |

---

## Resultado Esperado

Despues de estos cambios:
1. El error `payment_month` desaparece completamente
2. El formulario incluye todos los campos del spec: jugador, tutor (con ocupacion), deporte, sede, plan, toggle cancha, pago
3. La logica de precios respeta las reglas de negocio: promo solo en futbol + cancha
4. Un fichaje completo crea automaticamente: guardian, jugador, pago, vinculacion guardian-jugador
5. Los precios default se alinean con el spec ($400 inscripcion, $450 futbol, $400 basket, $300 promo)

