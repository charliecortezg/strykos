

## Plan: Migración del Módulo Intake a STRYK OS

### Resumen Ejecutivo

Ejecutar la migración SQL proporcionada por el proyecto "Terminal de Fichaje" para habilitar el módulo de registro/fichaje de nuevos jugadores en STRYK OS. Esta migración agrega las tablas, funciones y políticas RLS necesarias para capturar inscripciones desde cualquier punto (entrenador en cancha, administrativo, director).

---

### Verificación Pre-Migración Completada

| Verificación | Estado | Acción |
|-------------|--------|--------|
| `get_current_org_id()` existe | OK | Reutilizar |
| `has_org_role()` existe | OK | Reutilizar |
| `players.date_of_birth` | NO EXISTE | Agregar |
| Tablas intake | NO EXISTEN | Crear todas |
| Bucket `intake-documents` | NO EXISTE | Crear |

---

### Fases de la Migración

#### Fase 1A: Agregar columna a `players`
```sql
ALTER TABLE public.players 
ADD COLUMN IF NOT EXISTS date_of_birth date NULL;
```
- Agrega fecha de nacimiento para data del jugador
- Índice para búsquedas eficientes

#### Fase 1B: Funciones de Normalización
- `normalize_phone()` - Normaliza teléfonos a últimos 10 dígitos
- `normalize_name()` - Minúsculas, sin acentos, espacios normalizados  
- `generate_intake_idempotency_key()` - Hash determinístico para evitar duplicados

#### Fase 1C: Tabla `guardians` (Tutores)
- Almacena tutores/padres separados de `players.tutor_name`
- Constraint UNIQUE por organización + teléfono normalizado
- RLS: visible para toda la org, editable solo por admins

#### Fase 1D: Tabla `player_guardians` (Relación M:N)
- Vincula múltiples tutores a múltiples jugadores
- Flag `is_primary` para tutor principal

#### Fase 1E: Tabla `intake_requests` (Log de Fichajes)
- Snapshot completo del fichaje: datos del jugador, tutor, pago
- Estados: `pending` → `processing` → `completed`/`failed`
- Idempotency key para prevenir duplicados
- FKs a `profiles.id` para tracking (created_by, processed_by)

#### Fase 1F: Tabla `intake_documents` (Evidencias)
- Documentos asociados a cada fichaje
- Referencia al bucket `intake-documents`

#### Fase 1G: Tabla `org_intake_settings` (Configuración)
- Configuración por academia: fees, flags, mensajes
- Solo editable por `org_owner` y `director_deportivo`

#### Fase 1H-1I: RLS Policies
- **Entrenador**: puede crear fichajes y ver solo los suyos
- **Administrativo/Director/Owner**: puede ver todos, editar todos
- Políticas restrictivas alineadas con modelo STRYK

#### Fase 1J: Storage Bucket
- Bucket privado `intake-documents`
- RLS: path debe empezar con `{org_id}/`

#### Fase 1K: Stub del Processor RPC
- Placeholder para Fase 3: `process_intake_request()`
- SECURITY DEFINER para bypass de RLS al crear entidades

---

### Cambios en la Base de Datos

| Objeto | Tipo | Descripción |
|--------|------|-------------|
| `players.date_of_birth` | Columna | Fecha de nacimiento del jugador |
| `guardians` | Tabla | Tutores/padres de familia |
| `player_guardians` | Tabla | Relación jugador-tutor (M:N) |
| `intake_requests` | Tabla | Log de fichajes/inscripciones |
| `intake_documents` | Tabla | Evidencias de pago |
| `org_intake_settings` | Tabla | Configuración por academia |
| `normalize_phone()` | Función | Normalizar teléfonos |
| `normalize_name()` | Función | Normalizar nombres |
| `generate_intake_idempotency_key()` | Función | Generar clave de idempotencia |
| `process_intake_request()` | Función RPC | Procesar fichaje (stub Fase 3) |
| `intake-documents` | Bucket | Storage para evidencias |

---

### Permisos por Rol (RLS)

| Tabla | org_owner | director_deportivo | administrativo | entrenador |
|-------|-----------|-------------------|----------------|------------|
| `guardians` | CRUD | CRUD | CRUD | READ |
| `player_guardians` | CRUD | CRUD | CRUD | READ |
| `intake_requests` | CRUD | CRUD | CRUD | CREATE + READ (propios) |
| `intake_documents` | CRUD | CRUD | CRUD | CREATE + READ (propios) |
| `org_intake_settings` | CRUD | CRUD | READ | READ |

---

### Flujo Post-Migración

1. **Entrenador en cancha**: Abre terminal → Captura datos → Se crea `intake_request` con status `pending`
2. **Processor (Fase 3)**: Convierte `intake_request` → `player` + `guardian` + `payment`
3. **Director/Admin**: Ve todos los fichajes, puede filtrar y dar seguimiento

---

### Sección Técnica

La migración es idempotente gracias a:
- `CREATE TABLE IF NOT EXISTS`
- `CREATE INDEX IF NOT EXISTS`
- `DROP POLICY IF EXISTS` antes de cada `CREATE POLICY`
- `ON CONFLICT DO NOTHING` para el bucket

**FKs validadas:**
- `intake_requests.created_by` → `profiles.id` (correcto, `profiles.id = auth.uid()`)
- `intake_requests.player_id` → `players.id`
- `intake_requests.guardian_id` → `guardians.id`
- `intake_requests.payment_id` → `payments.id`

**Compatibilidad confirmada:**
- Funciones `get_current_org_id()` y `has_org_role()` ya existen
- El SQL usa exactamente estas funciones en las policies

---

### Próximos Pasos (Post-Migración)

1. **Fase 2**: UI del módulo intake en STRYK OS (lista de fichajes, formulario)
2. **Fase 3**: Implementar lógica completa en `process_intake_request()` 
3. **Fase 4**: Integrar con `send-payment-receipt` existente para recibos automáticos

