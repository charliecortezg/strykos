
# Plan: Módulo "Terminal de Fichajes" para STRYK

## Resumen Ejecutivo

Este plan implementa un sistema completo de fichajes (onboarding de jugadores) con dos vistas:
1. **Terminal de Fichaje** — Formulario optimizado para capturar nuevos jugadores en <2 minutos
2. **Historial de Fichajes** — Lista filtrable con detalle, evidencia y reintento de recibos

El sistema reutiliza las tablas existentes (`intake_requests`, `intake_documents`, `org_intake_settings`) y las integra con el core de STRYK (`players`, `payments`, `guardians`).

---

## Arquitectura Existente (Reutilizable)

El análisis del código revela que ya existen:

| Tabla | Estado | Uso |
|-------|--------|-----|
| `intake_requests` | Existe | Snapshot del fichaje (auditable) |
| `intake_documents` | Existe | Evidencias de pago |
| `org_intake_settings` | Existe | Configuración de precios/promo |
| `guardians` | Existe | Tutores independientes |
| `player_guardians` | Existe | Relación N:M jugador-tutor |
| Bucket `intake-documents` | Existe | Storage para evidencias |

**Conclusión**: NO se requieren nuevas tablas principales. Solo ajustes a RLS y nuevas funciones.

---

## Fase 1: Base de Datos

### 1.1 Nuevas Columnas en `org_intake_settings`

```sql
ALTER TABLE org_intake_settings 
  ADD COLUMN IF NOT EXISTS soccer_fee numeric DEFAULT 450,
  ADD COLUMN IF NOT EXISTS basketball_fee numeric DEFAULT 400,
  ADD COLUMN IF NOT EXISTS transfer_qr_url text,
  ADD COLUMN IF NOT EXISTS transfer_bank_info text;
```

### 1.2 Función RPC: `process_intake_and_create_entities`

Función SECURITY DEFINER que:
1. Valida el intake_request existe y está en status 'pending'
2. Crea o encuentra `guardian` (upsert por phone_normalized)
3. Crea `player` con datos del intake
4. Crea `payment` (concepto: 'Inscripción')
5. Vincula `player_guardians`
6. Actualiza `intake_requests` con IDs generados y status = 'completed'

```sql
CREATE OR REPLACE FUNCTION process_intake_and_create_entities(p_intake_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_req intake_requests%ROWTYPE;
  v_guardian_id uuid;
  v_player_id uuid;
  v_payment_id uuid;
BEGIN
  -- Lock and fetch request
  SELECT * INTO v_req FROM intake_requests WHERE id = p_intake_id FOR UPDATE;
  
  IF v_req.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Already processed');
  END IF;
  
  -- Upsert guardian
  INSERT INTO guardians (organization_id, full_name, phone, phone_normalized, email, occupation)
  VALUES (v_req.organization_id, v_req.guardian_name, v_req.guardian_phone, 
          v_req.guardian_phone_normalized, v_req.guardian_email, v_req.guardian_occupation)
  ON CONFLICT (organization_id, phone_normalized) 
  DO UPDATE SET full_name = EXCLUDED.full_name, email = COALESCE(EXCLUDED.email, guardians.email)
  RETURNING id INTO v_guardian_id;
  
  -- Create player
  INSERT INTO players (organization_id, full_name, date_of_birth, category_id, sport_id, 
                       plan_id, monthly_fee, tutor_name, phone, email, is_trial, payment_status)
  VALUES (v_req.organization_id, v_req.player_name, v_req.player_birth_date,
          v_req.category_id, v_req.sport_id, v_req.plan_id, v_req.monthly_fee,
          v_req.guardian_name, v_req.guardian_phone, v_req.guardian_email, 
          false, 'al_dia')
  RETURNING id INTO v_player_id;
  
  -- Create payment
  INSERT INTO payments (organization_id, player_id, amount, payment_method, 
                        payment_month, concept, recorded_by)
  VALUES (v_req.organization_id, v_player_id, v_req.total_amount, 
          v_req.payment_method::payment_method, date_trunc('month', now())::date, 
          'Inscripción', v_req.created_by)
  RETURNING id INTO v_payment_id;
  
  -- Link player to guardian
  INSERT INTO player_guardians (player_id, guardian_id, is_primary)
  VALUES (v_player_id, v_guardian_id, true);
  
  -- Update intake request
  UPDATE intake_requests SET
    status = 'completed',
    player_id = v_player_id,
    guardian_id = v_guardian_id,
    payment_id = v_payment_id,
    processed_at = now(),
    processed_by = auth.uid()
  WHERE id = p_intake_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'player_id', v_player_id,
    'guardian_id', v_guardian_id,
    'payment_id', v_payment_id
  );
EXCEPTION WHEN OTHERS THEN
  -- Update with error
  UPDATE intake_requests SET status = 'failed', processing_error = SQLERRM WHERE id = p_intake_id;
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
```

### 1.3 Índice para `guardians` (Upsert)

```sql
CREATE UNIQUE INDEX IF NOT EXISTS guardians_org_phone_unique 
  ON guardians (organization_id, phone_normalized);
```

### 1.4 Ajuste RLS para Entrenadores

El RLS actual ya permite a entrenadores crear `intake_requests`. Solo necesitamos verificar que el entrenador pueda ver sus propios fichajes en el historial (ya está cubierto).

---

## Fase 2: Edge Function para Recibos

### 2.1 `send-intake-receipt`

Nueva Edge Function basada en `send-payment-receipt`:

```typescript
// supabase/functions/send-intake-receipt/index.ts
// Payload: { intakeId: string }
// 1. Fetch intake_request + org data
// 2. Build receipt HTML (Inscripción template)
// 3. Send via Resend
// 4. Update intake_requests.receipt_status/receipt_error
// 5. Return { ok, status, message }
```

Timeout lógico: Si el envío falla, el registro sigue intacto y se puede reintentar.

---

## Fase 3: Frontend — Estructura de Archivos

```
src/
├── pages/
│   └── fichajes/
│       ├── TerminalPage.tsx        # /fichajes/terminal
│       └── HistorialPage.tsx       # /fichajes/historial
├── components/
│   └── fichajes/
│       ├── IntakeTerminal.tsx      # Formulario principal
│       ├── IntakeSteps/
│       │   ├── PlayerDataStep.tsx  # Nombre + fecha nacimiento
│       │   ├── GuardianDataStep.tsx # Tutor
│       │   ├── SportCategoryStep.tsx # Deporte + categoría
│       │   ├── PaymentStep.tsx     # Método + monto + evidencia
│       │   └── ConfirmationStep.tsx # Resumen + submit
│       ├── IntakeHistory.tsx       # Lista con filtros
│       ├── IntakeDetailDrawer.tsx  # Detalle del fichaje
│       ├── RetryReceiptButton.tsx  # Reintentar envío
│       ├── EvidenceViewer.tsx      # Modal con imagen
│       ├── TransferQRDisplay.tsx   # QR para transferencia
│       ├── CameraCapture.tsx       # Captura de cámara (5MB max)
│       └── DateInput.tsx           # DD/MM/AAAA input
├── hooks/
│   └── useIntake.ts                # CRUD + RPC calls
```

---

## Fase 4: Componentes Clave

### 4.1 `DateInput` — Entrada de Fecha DD/MM/AAAA

```tsx
// Acepta DD/MM/AAAA o DD.MM.AAAA
// Muestra teclado numérico en móvil
// Valida fecha real y calcula edad
interface DateInputProps {
  value: string; // ISO format internally
  onChange: (isoDate: string, age: number) => void;
  maxAge?: number; // Default 25
  minAge?: number; // Default 3
}
```

### 4.2 `CameraCapture` — Evidencia de Pago

```tsx
// - Botón que abre input type="file" con capture="environment"
// - Compresión automática si >5MB
// - Preview antes de confirmar
// - Upload a bucket intake-documents
interface CameraCaptureProps {
  onCapture: (file: File) => void;
  maxSizeMB?: number; // Default 5
}
```

### 4.3 `TransferQRDisplay` — QR para Transferencias

```tsx
// Muestra QR desde org_intake_settings.transfer_qr_url
// Si no hay URL, muestra datos bancarios en texto
// Copia datos al clipboard
```

### 4.4 `IntakeTerminal` — Formulario por Secciones

```tsx
// Secciones colapsables:
// 1. Datos del Jugador (nombre, fecha nacimiento, edad auto-calculada)
// 2. Datos del Tutor (nombre, teléfono, email opcional)
// 3. Deporte y Categoría (auto-suggest por edad)
// 4. Pago (método, monto calculado por reglas, evidencia si cash)

// Validación en vivo:
// - Campos obligatorios resaltados
// - Edad vs categoría warning
// - Cash sin evidencia = bloqueado

// CTA fijo al fondo:
// [Registrar Fichaje] — disabled hasta válido
```

### 4.5 `IntakeHistory` — Lista con Filtros

```tsx
// Filtros:
// - Búsqueda por nombre jugador/tutor
// - Status: pending | completed | failed
// - Rango de fechas
// - Método de pago

// Columnas mobile-friendly (cards):
// - Fecha + hora
// - Nombre jugador
// - Tutor
// - Monto
// - Status badge
// - Acciones: Ver detalle, Reintentar recibo
```

---

## Fase 5: Flujo de Negocio

### 5.1 Reglas de Precio

```typescript
function calculateFees(sport: string, isPitchSigning: boolean, settings: OrgIntakeSettings) {
  if (sport === 'Basketball') {
    return { 
      monthlyFee: settings.basketball_fee,
      registrationFee: settings.default_registration_fee 
    };
  }
  
  // Fútbol
  if (isPitchSigning && settings.promo_active) {
    return { 
      monthlyFee: settings.promo_fee,
      registrationFee: settings.default_registration_fee 
    };
  }
  
  return { 
    monthlyFee: settings.soccer_fee,
    registrationFee: settings.default_registration_fee 
  };
}
```

### 5.2 Flujo de Submit

```
1. Usuario llena formulario
2. Frontend valida:
   - Todos campos requeridos
   - Si cash → evidencia obligatoria
   - Si transfer → evidencia opcional
3. Genera idempotency_key (hash de org + phone + birthdate + name)
4. INSERT intake_requests (status: pending)
5. Si hay evidencia → upload a storage
6. INSERT intake_documents (link a request)
7. CALL process_intake_and_create_entities(request_id)
8. Si success:
   - Mostrar pantalla éxito
   - Trigger send-intake-receipt (async, non-blocking)
9. Si fail:
   - Mostrar error con opción de reintentar
   - intake_requests queda en status: failed para debug
```

---

## Fase 6: Routing

### 6.1 Nuevas Rutas en `App.tsx`

```tsx
// Importar páginas
import TerminalPage from './pages/fichajes/TerminalPage';
import HistorialPage from './pages/fichajes/HistorialPage';

// Dentro de AcademyRoutes, después de los dashboards:
<Route path="/fichajes/terminal" element={
  <ProtectedRoute allowedRoles={['org_owner', 'director_deportivo', 'administrativo', 'entrenador']}>
    <TerminalPage />
  </ProtectedRoute>
} />
<Route path="/fichajes/historial" element={
  <ProtectedRoute allowedRoles={['org_owner', 'director_deportivo', 'administrativo']}>
    <HistorialPage />
  </ProtectedRoute>
} />
```

### 6.2 Acceso desde Dashboards

Agregar botón/link en:
- `EntrenadorDashboard` → "Nuevo Fichaje" (solo terminal)
- `DirectorDeportivoDashboard` → "Fichajes" (tab con terminal + historial)
- `OrgOwnerDashboard` → igual que director

---

## Fase 7: Testing Checklist

### Happy Path
- [ ] Crear fichaje con efectivo + evidencia → player + payment creados
- [ ] Crear fichaje con transferencia sin evidencia → funciona
- [ ] Promo aplicada correctamente para Fútbol en cancha
- [ ] Basketball usa tarifa fija (no promo)
- [ ] Recibo enviado automáticamente si hay email
- [ ] Historial muestra solo fichajes de la org (RLS)

### Edge Cases
- [ ] Cash sin evidencia → submit bloqueado
- [ ] Duplicado (mismo phone + birthdate + name) → error controlado
- [ ] Tutor ya existe → upsert correcto
- [ ] Email tutor inválido → warning pero permite continuar
- [ ] Categoría no match con edad → warning visible
- [ ] Recibo falla → status queda pending_email, botón retry visible
- [ ] Entrenador solo ve sus fichajes en historial
- [ ] Director ve todos los fichajes

### Mobile
- [ ] Formulario usable en iPhone SE (320px width)
- [ ] Sin overflow horizontal
- [ ] CTA fijo visible siempre
- [ ] Cámara funciona en iOS Safari
- [ ] Teclado numérico para fecha y teléfono

---

## Archivos a Crear/Modificar

| Archivo | Acción |
|---------|--------|
| `supabase/migrations/xxx.sql` | Nueva migración (RPC + índice + columnas) |
| `supabase/functions/send-intake-receipt/index.ts` | Nueva Edge Function |
| `src/pages/fichajes/TerminalPage.tsx` | Nueva página |
| `src/pages/fichajes/HistorialPage.tsx` | Nueva página |
| `src/components/fichajes/*.tsx` | 10+ nuevos componentes |
| `src/hooks/useIntake.ts` | Nuevo hook |
| `src/App.tsx` | Agregar rutas |
| `src/pages/dashboard/*.tsx` | Agregar navegación |

---

## Orden de Implementación

1. **Migración SQL** — columnas + función RPC + índice
2. **Edge Function** — send-intake-receipt
3. **Hook useIntake** — lógica de negocio
4. **Componentes base** — DateInput, CameraCapture, TransferQRDisplay
5. **IntakeTerminal** — formulario completo
6. **IntakeHistory** — lista + filtros
7. **IntakeDetailDrawer** — detalle + retry
8. **Páginas** — TerminalPage, HistorialPage
9. **Routing** — App.tsx + dashboards
10. **Testing** — manual + checklist

---

## Consideraciones de Seguridad

- RLS verificado: cada query filtra por `organization_id = get_current_org_id()`
- Entrenadores solo ven/editan SUS fichajes
- Función RPC usa SECURITY DEFINER para operaciones atómicas
- Storage path incluye org_id para aislamiento
- Idempotency key previene duplicados

---

## Preparación para Gamificación (Futuro)

El diseño actual permite:
- Agregar columna `guardian_link_token` para invitación a app padre
- Agregar tabla `guardian_achievements` sin modificar intake
- Tracking de `referral_source` ya preparado en intake_requests

No se implementa gamificación ahora, pero la arquitectura lo soporta.
