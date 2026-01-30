
# Plan: IntakeSettingsPanel + Hardening Pass (10 Checks)

## Resumen Ejecutivo

Este plan cubre dos entregas en paralelo:
1. **IntakeSettingsPanel**: UI para que org_owner/director_deportivo configuren tarifas, QR y datos bancarios
2. **Hardening Pass**: 10 validaciones de seguridad y consistencia del modulo de Fichajes

---

## Parte 1: IntakeSettingsPanel

### Archivos a Crear

| Archivo | Descripcion |
|---------|-------------|
| `src/hooks/useIntakeSettingsEditor.ts` | Hook con lectura/escritura + permisos |
| `src/components/fichajes/IntakeSettingsPanel.tsx` | Componente UI del panel |

### Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/dashboard/OrgOwnerDashboard.tsx` | Agregar seccion IntakeSettingsPanel despues de BillingConfigurationPanel |
| `src/pages/dashboard/DirectorDeportivoDashboard.tsx` | Agregar IntakeSettingsPanel al final del tab Fichajes |

### Estructura del Hook

```typescript
// useIntakeSettingsEditor.ts
interface UseIntakeSettingsEditor {
  settings: IntakeSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  canEdit: boolean;  // org_owner || director_deportivo
  saveSettings: (updates: Partial<IntakeSettings>) => Promise<void>;
  error: Error | null;
}
```

### Campos del Panel

**Seccion: Tarifas**
- `default_registration_fee` - Inscripcion (numero, min 0)
- `soccer_fee` - Mensualidad Futbol (numero)
- `basketball_fee` - Mensualidad Basketball (numero)

**Seccion: Promociones**
- `promo_active` - Switch: Activar promo en cancha
- `promo_fee` - Tarifa promocional (habilitado solo si promo_active)

**Seccion: Opciones**
- `enabled` - Switch: Modulo activo
- `require_evidence` - Switch: Requerir foto para efectivo
- `require_guardian_email` - Switch: Email del tutor obligatorio

**Seccion: Transferencia**
- `transfer_qr_url` - URL del QR (con preview en tiempo real)
- `transfer_bank_info` - Textarea multilinea (datos bancarios)

**Seccion: Personalizacion (opcional)**
- `receipt_footer_text` - Texto footer del recibo

---

## Parte 2: Hardening Pass - 10 Checks

### Check 1: profiles.id == auth.uid()

**Estado: VERIFICADO OK**

Consulta ejecutada confirma que `profiles.id` siempre coincide con `auth.users.id`:
```
profile_id == auth_user_id: MATCH (todos los registros)
```

Las policies actuales usan `created_by = auth.uid()` correctamente.

### Check 2: entrenador solo ve sus intake_requests

**Estado: VERIFICADO OK**

RLS policy actual:
```sql
-- SELECT policy para intake_requests:
(has_org_role('org_owner') OR has_org_role('director_deportivo') 
 OR has_org_role('administrativo') 
 OR (has_org_role('entrenador') AND created_by = auth.uid()))
```

El entrenador SOLO ve sus propios fichajes (`created_by = auth.uid()`).

Para `org_intake_settings`, la policy de SELECT permite lectura a todos los usuarios de la org, pero INSERT/UPDATE solo a org_owner/director_deportivo.

Para `guardians`, el entrenador NO tiene INSERT (solo org_owner/director/admin).

### Check 3: RPC SECURITY DEFINER - Validacion cross-org

**Estado: REQUIERE MEJORA**

El RPC `process_intake_and_create_entities` actual NO valida que el `intake_request_id` pertenezca a la organizacion del usuario invocador.

**Solucion propuesta** - Agregar validacion al inicio del RPC:

```sql
-- Validar que el intake_request pertenece a la org del usuario
IF v_req.organization_id != get_current_org_id() THEN
  RETURN jsonb_build_object('success', false, 'error', 'Cross-org access denied');
END IF;
```

### Check 4: Test idempotencia (doble click / retry)

**Estado: VERIFICADO OK**

La tabla `intake_requests` tiene:
- `idempotency_key` columna NOT NULL
- UNIQUE constraint en `idempotency_key`

El codigo frontend genera el key:
```typescript
const idempotencyKey = generateIdempotencyKey(
  organization.id,
  phoneNormalized,
  data.playerBirthDate,
  nameNormalized
);
```

Error code `23505` se captura y muestra mensaje amigable: "Este jugador ya fue registrado previamente"

### Check 5: Caso hermanos (mismo phone, diferente birth_date)

**Estado: VERIFICADO OK**

El `idempotency_key` incluye `birth_date`:
```
{org_id}|{phone_normalized}|{birth_date}|{name_normalized}
```

Dos hermanos con mismo tutor pero diferente fecha de nacimiento generaran keys diferentes, creando:
- 2 players distintos
- 1 guardian (upsert por phone_normalized)
- 2 payments

### Check 6: Validar evidencia path enforcement

**Estado: REQUIERE VERIFICACION**

El codigo actual usa path estandar:
```typescript
const storagePath = `${organization.id}/intake/${intakeRequest.id}/${fileName}`;
```

Pero el bucket `intake-documents` necesita Storage Policies que enforzen este patron.

**Solucion propuesta** - Verificar/crear storage policies:
```sql
-- Policy para INSERT en intake-documents
CREATE POLICY "Users can upload to their org path"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'intake-documents' AND
  (storage.foldername(name))[1] = get_current_org_id()::text
);
```

### Check 7: Manejo error evidencia mayor a 5MB

**Estado: PARCIALMENTE IMPLEMENTADO**

El `CameraCapture` component ya valida:
```typescript
if (file.size > 5 * 1024 * 1024) {
  toast.error('La imagen es demasiado grande. Maximo 5MB.');
  return;
}
```

Pero si el upload falla despues de crear el intake_request, el proceso continua (solo loggea error). Esto es correcto para no bloquear el fichaje, pero podria dejar estado inconsistente.

**Mejora propuesta**: Mostrar warning en UI si evidencia fallo pero fichaje exitoso.

### Check 8: Recibos - estados consistentes

**Estado: VERIFICADO OK**

Estados manejados:
- `pending` - Inicial
- `sent` - Enviado a tutor
- `sent_admin_only` - Enviado solo a admin (tutor sin email)
- `failed` - Error de envio
- `no_email` - Sin emails validos

La logica en `send-intake-receipt` es robusta:
- Si tutor tiene email: envia a tutor + BCC admin
- Si tutor NO tiene email: envia a admin con nota "[COPIA ADMIN]"
- Si ninguno tiene email: marca como `no_email`

### Check 9: Limitar reintentos de receipt

**Estado: REQUIERE MEJORA**

Actualmente NO hay limite de reintentos. El boton "Reenviar" siempre esta disponible si `receipt_status` es `failed`, `pending` o null.

**Solucion propuesta**:

1. Agregar columna `receipt_retry_count` a `intake_requests`
2. Incrementar en cada reintento
3. Bloquear UI si `receipt_retry_count >= 3`
4. O implementar cooldown (ej: no reenviar si `receipt_sent_at` < 5 min)

### Check 10: Logs en processing_error / receipt_error + UI reintento

**Estado: VERIFICADO OK**

- `processing_error` se guarda en el RPC cuando falla
- `receipt_error` se guarda en la Edge Function cuando falla
- La UI (`IntakeDetailDrawer`) muestra ambos errores
- El boton "Reenviar" esta disponible para reintentos

---

## Entregables del Plan

### Fase A: IntakeSettingsPanel (implementacion completa)

1. Crear `useIntakeSettingsEditor.ts`
2. Crear `IntakeSettingsPanel.tsx`
3. Integrar en OrgOwnerDashboard
4. Integrar en DirectorDeportivoDashboard (tab Fichajes)

### Fase B: Hardening Fixes

1. **Check 3**: Migrar RPC con validacion cross-org
2. **Check 6**: Crear storage policies para path enforcement
3. **Check 9**: Migrar DB para `receipt_retry_count` + actualizar UI

---

## Migraciones SQL Requeridas

```sql
-- 1. Agregar columna receipt_retry_count
ALTER TABLE public.intake_requests 
ADD COLUMN receipt_retry_count integer DEFAULT 0;

-- 2. Actualizar RPC con validacion cross-org
CREATE OR REPLACE FUNCTION public.process_intake_and_create_entities(p_intake_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req intake_requests%ROWTYPE;
  v_user_org_id uuid;
  v_guardian_id uuid;
  v_player_id uuid;
  v_payment_id uuid;
  v_payment_month text;
BEGIN
  -- NUEVO: Obtener org del usuario actual
  v_user_org_id := get_current_org_id();
  
  -- Lock and fetch request
  SELECT * INTO v_req FROM intake_requests WHERE id = p_intake_id FOR UPDATE;
  
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Intake request not found');
  END IF;
  
  -- NUEVO: Validar cross-org
  IF v_req.organization_id != v_user_org_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Access denied: cross-organization');
  END IF;
  
  -- ... resto del codigo igual ...
END;
$$;

-- 3. Storage policy (si no existe)
-- Nota: Requiere verificar via Supabase Dashboard o API
```

---

## Resultado Visual

### IntakeSettingsPanel en OrgOwnerDashboard

```text
+----------------------------------------------------------+
|  Configuracion de Fichajes                               |
|  Define tarifas y metodos de pago para inscripciones     |
+----------------------------------------------------------+
|                                                          |
|  TARIFAS                                                 |
|  ┌──────────────────────────────────────────────────────┐|
|  │ Inscripcion              [ $500            ]         │|
|  │ Mensualidad Futbol       [ $450            ]         │|
|  │ Mensualidad Basketball   [ $400            ]         │|
|  └──────────────────────────────────────────────────────┘|
|                                                          |
|  PROMOCIONES                                             |
|  ┌──────────────────────────────────────────────────────┐|
|  │ [x] Activar promocion en cancha                      │|
|  │ Tarifa promocional       [ $400            ]         │|
|  └──────────────────────────────────────────────────────┘|
|                                                          |
|  OPCIONES                                                |
|  ┌──────────────────────────────────────────────────────┐|
|  │ [x] Modulo de fichajes activo                        │|
|  │ [x] Requerir foto de evidencia para efectivo         │|
|  │ [ ] Requerir email del tutor                         │|
|  └──────────────────────────────────────────────────────┘|
|                                                          |
|  DATOS PARA TRANSFERENCIA                                |
|  ┌──────────────────────────────────────────────────────┐|
|  │ URL del QR                                           │|
|  │ [ https://example.com/qr.png                     ]   │|
|  │ ┌──────────┐                                         │|
|  │ │  [QR]    │ <- Preview en tiempo real               │|
|  │ └──────────┘                                         │|
|  │                                                      │|
|  │ Datos bancarios                                      │|
|  │ ┌────────────────────────────────────────────────┐   │|
|  │ │ Banco: BBVA                                    │   │|
|  │ │ CLABE: 012345678901234567                      │   │|
|  │ │ Titular: Academia FC                           │   │|
|  │ └────────────────────────────────────────────────┘   │|
|  └──────────────────────────────────────────────────────┘|
|                                                          |
|  [ Guardar configuracion ]                               |
+----------------------------------------------------------+
```

---

## Lista de Pruebas a Ejecutar

| # | Prueba | Criterio de Exito |
|---|--------|-------------------|
| 1 | Crear fichaje como entrenador | Fichaje creado, player + payment + guardian existen |
| 2 | Entrenador intenta ver fichaje de otro | No visible en historial |
| 3 | Doble click en "Registrar" | Solo 1 intake_request creado (error amigable en 2do click) |
| 4 | Hermanos: mismo tel, diferente fecha | 2 players, 1 guardian, 2 payments |
| 5 | Subir evidencia >5MB | Error mostrado, formulario no se envia |
| 6 | Fichaje sin email tutor | Recibo enviado a admin (sent_admin_only) |
| 7 | Reintento recibo 3+ veces | Boton bloqueado o cooldown activo |
| 8 | Settings: cambiar tarifa como org_owner | Guardado exitoso, nuevo fichaje usa tarifa actualizada |
| 9 | Settings: intento de edicion como entrenador | Panel en modo solo lectura |
| 10 | Cross-org RPC call | Error "Access denied: cross-organization" |

---

## Flujo de Implementacion

```text
Paso 1: Crear useIntakeSettingsEditor.ts
    |
    v
Paso 2: Crear IntakeSettingsPanel.tsx
    |
    v
Paso 3: Integrar en OrgOwnerDashboard + DirectorDeportivoDashboard
    |
    v
Paso 4: Migrar DB (receipt_retry_count)
    |
    v
Paso 5: Actualizar RPC con validacion cross-org
    |
    v
Paso 6: Actualizar UI para limite de reintentos
    |
    v
Paso 7: Pruebas end-to-end (10 checks)
    |
    v
Paso 8: Documentar evidencia (screenshots/logs)
    |
    v
Entregable: "Ready for field use"
```
