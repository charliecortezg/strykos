
# Plan: Corregir Activación de Portal Familiar + Crear Tutor Demo

## Problema Identificado

Cuando activaste STRYK Way desde el Studio, solo se activó `feature_stryk_way_enabled`, pero el Portal Familiar requiere un flag diferente: `feature_portal_familiar_enabled`.

Además, no hay tutores registrados en la base de datos, por lo que no podrás hacer login aunque activemos el flag.

---

## Cambios a Realizar

### 1. Modificar PackActivator para activar TODOS los feature flags relacionados

**Archivo:** `src/components/stryk-way/PackActivator.tsx`

**Cambio:** En la línea 107-110, actualizar para activar también el Portal Familiar y Analytics:

```typescript
// ANTES:
await supabase
  .from('organizations')
  .update({ feature_stryk_way_enabled: true })
  .eq('id', orgId);

// DESPUÉS:
await supabase
  .from('organizations')
  .update({ 
    feature_stryk_way_enabled: true,
    feature_portal_familiar_enabled: true,  // Nuevo
    feature_analytics_enabled: true,        // Nuevo
    feature_studio_pro_enabled: true,       // Nuevo
  })
  .eq('id', orgId);
```

---

### 2. Migración SQL para:
   a) Activar los feature flags para White Lions (ya que STRYK Way ya fue activado)
   b) Crear un tutor de prueba vinculado a un jugador activo

```sql
-- Activar todos los feature flags
UPDATE public.organizations
SET 
  feature_portal_familiar_enabled = true,
  feature_analytics_enabled = true,
  feature_studio_pro_enabled = true
WHERE org_code = 'white-lions-academies';

-- Encontrar un jugador activo y crear su tutor
WITH active_player AS (
  SELECT id, full_name, tutor_name, phone
  FROM players 
  WHERE organization_id = '982f355c-0196-46d3-8da9-3e5e83813dad'
    AND is_active = true
  LIMIT 1
),
inserted_guardian AS (
  INSERT INTO guardians (
    organization_id,
    full_name,
    phone,
    phone_normalized,
    relationship
  )
  SELECT 
    '982f355c-0196-46d3-8da9-3e5e83813dad',
    COALESCE(ap.tutor_name, 'Tutor de ' || ap.full_name),
    COALESCE(ap.phone, '6864408021'),
    '6864408021',
    'padre'
  FROM active_player ap
  ON CONFLICT (organization_id, phone_normalized) DO NOTHING
  RETURNING id
)
INSERT INTO player_guardians (player_id, guardian_id, is_primary)
SELECT ap.id, ig.id, true
FROM active_player ap, inserted_guardian ig
ON CONFLICT DO NOTHING;
```

---

## Resultado Esperado

Después de aplicar estos cambios:

| Característica | Estado |
|----------------|--------|
| STRYK Way | ✅ Activo |
| Portal Familiar | ✅ Activo |
| Analytics | ✅ Activo |
| Studio Pro | ✅ Activo |

### Credenciales de Prueba para Portal:
- **Código de Academia:** `white-lions-academies`
- **Teléfono:** `6864408021`  
- **PIN:** `8021` (últimos 4 dígitos)

---

## Archivos a Modificar

| Archivo | Tipo de Cambio |
|---------|----------------|
| `src/components/stryk-way/PackActivator.tsx` | Activar todos los flags juntos |
| Nueva migración SQL | Activar flags + crear tutor demo |
