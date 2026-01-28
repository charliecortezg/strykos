

## Plan: Migración del Módulo Intake a STRYK OS

### ✅ Fase 1 Completada - Infraestructura de Base de Datos

La migración SQL se ejecutó exitosamente. Se crearon:

| Objeto | Estado |
|--------|--------|
| `players.date_of_birth` | ✅ Agregado |
| `guardians` | ✅ Creada con RLS |
| `player_guardians` | ✅ Creada con RLS |
| `intake_requests` | ✅ Creada con RLS |
| `intake_documents` | ✅ Creada con RLS |
| `org_intake_settings` | ✅ Creada con RLS |
| `normalize_phone()` | ✅ Con search_path |
| `normalize_name()` | ✅ Con search_path |
| `generate_intake_idempotency_key()` | ✅ Con search_path |
| `process_intake_request()` | ✅ Stub SECURITY DEFINER |
| Bucket `intake-documents` | ✅ Creado con RLS |

---

### ✅ Fase 2 Completada - Módulo UI de Intake

**Archivos Creados:**

**Tipos y Utilidades:**
- `src/modules/intake/types/intake.types.ts` - Tipos TypeScript
- `src/modules/intake/lib/intake-utils.ts` - Funciones helper
- `src/modules/intake/lib/intake-validations.ts` - Schema Zod

**Hooks:**
- `src/modules/intake/hooks/useIntakeSettings.ts` - Configuración por academia
- `src/modules/intake/hooks/useIntakeCatalogs.ts` - Sports, categories, plans, venues
- `src/modules/intake/hooks/useCreateIntakeRequest.ts` - Mutación para crear fichajes
- `src/modules/intake/hooks/useIntakeHistory.ts` - Lista con filtros

**Componentes:**
- `src/modules/intake/components/DateInput.tsx` - Input DD/MM/AAAA
- `src/modules/intake/components/CameraCapture.tsx` - Captura de foto
- `src/modules/intake/components/IntakeSuccess.tsx` - Pantalla de éxito

**Páginas:**
- `src/modules/intake/pages/IntakeTerminal.tsx` - Formulario principal
- `src/modules/intake/pages/IntakeHistory.tsx` - Historial con filtros

**Rutas:**
- `/intake` - Terminal de fichaje
- `/intake/history` - Historial de fichajes

---

### Próximos Pasos

1. **Fase 3**: Implementar lógica completa en `process_intake_request()` 
2. **Fase 4**: Integrar con `send-payment-receipt` existente para recibos automáticos
