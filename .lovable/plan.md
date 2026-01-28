

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

### Próximos Pasos

1. **Fase 2**: UI del módulo intake en STRYK OS (lista de fichajes, formulario)
2. **Fase 3**: Implementar lógica completa en `process_intake_request()` 
3. **Fase 4**: Integrar con `send-payment-receipt` existente para recibos automáticos

