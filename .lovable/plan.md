
# Plan: Auto-creación de Guardian al Registrar Jugador

## Contexto Actual

| Dato | Estado |
|------|--------|
| Jugadores activos | 42 |
| Con guardian vinculado | 1 |
| Con teléfono válido | ~38 |
| Sin teléfono o "S/N" | ~4 |

El problema: cuando se crea un jugador via `CreatePlayerModal` o edición manual, NO se crea automáticamente el guardian. Esto impide que los padres accedan al Portal Familiar.

---

## Solución: Trigger de Base de Datos

Crear un trigger que automáticamente:
1. Detecte cuando se crea o actualiza un jugador con teléfono
2. Cree/actualice el guardian correspondiente
3. Vincule player ↔ guardian en `player_guardians`

### Ventajas del Trigger vs Código en Frontend:
- Funciona para TODAS las formas de crear jugadores (Modal, Intake, importación Excel, SQL directo)
- Garantiza consistencia de datos
- No requiere cambios en múltiples archivos TypeScript

---

## Cambios a Realizar

### 1. Migración SQL: Función + Trigger

```sql
-- Función que auto-crea guardian cuando se crea/actualiza un jugador
CREATE OR REPLACE FUNCTION auto_create_guardian_from_player()
RETURNS TRIGGER AS $$
DECLARE
  v_phone_normalized TEXT;
  v_guardian_name TEXT;
  v_guardian_id UUID;
BEGIN
  -- Solo procesar si hay teléfono válido
  IF NEW.phone IS NULL OR NEW.phone = '' OR NEW.phone = 'S/N' THEN
    RETURN NEW;
  END IF;

  -- Normalizar teléfono (últimos 10 dígitos)
  v_phone_normalized := RIGHT(regexp_replace(NEW.phone, '[^0-9]', '', 'g'), 10);
  
  -- Mínimo 10 dígitos para ser válido
  IF length(v_phone_normalized) < 10 THEN
    RETURN NEW;
  END IF;

  -- Determinar nombre del guardian
  v_guardian_name := COALESCE(
    NULLIF(NEW.tutor_name, ''),
    'Tutor de ' || NEW.full_name
  );

  -- Upsert guardian
  INSERT INTO guardians (
    organization_id, full_name, phone, phone_normalized, relationship
  ) VALUES (
    NEW.organization_id,
    v_guardian_name,
    NEW.phone,
    v_phone_normalized,
    'Padre/Madre'
  )
  ON CONFLICT (organization_id, phone_normalized) 
  DO UPDATE SET 
    full_name = EXCLUDED.full_name,
    updated_at = now()
  RETURNING id INTO v_guardian_id;

  -- Vincular player con guardian
  INSERT INTO player_guardians (player_id, guardian_id, is_primary)
  VALUES (NEW.id, v_guardian_id, true)
  ON CONFLICT (player_id, guardian_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger en players
DROP TRIGGER IF EXISTS trigger_auto_create_guardian ON players;
CREATE TRIGGER trigger_auto_create_guardian
AFTER INSERT OR UPDATE OF phone, tutor_name ON players
FOR EACH ROW
EXECUTE FUNCTION auto_create_guardian_from_player();
```

### 2. Script Retroactivo para Jugadores Existentes

Procesar los 41 jugadores que ya tienen teléfono pero no tienen guardian:

```sql
-- Crear guardians para jugadores existentes
WITH players_needing_guardians AS (
  SELECT 
    p.id AS player_id,
    p.organization_id,
    p.full_name,
    p.phone,
    p.tutor_name,
    RIGHT(regexp_replace(p.phone, '[^0-9]', '', 'g'), 10) AS phone_normalized
  FROM players p
  LEFT JOIN player_guardians pg ON pg.player_id = p.id
  WHERE pg.id IS NULL
    AND p.phone IS NOT NULL 
    AND p.phone != ''
    AND p.phone != 'S/N'
    AND length(RIGHT(regexp_replace(p.phone, '[^0-9]', '', 'g'), 10)) >= 10
),
inserted_guardians AS (
  INSERT INTO guardians (organization_id, full_name, phone, phone_normalized)
  SELECT DISTINCT
    organization_id,
    COALESCE(NULLIF(tutor_name, ''), 'Tutor de ' || full_name),
    phone,
    phone_normalized
  FROM players_needing_guardians
  ON CONFLICT (organization_id, phone_normalized) DO NOTHING
  RETURNING id, organization_id, phone_normalized
)
INSERT INTO player_guardians (player_id, guardian_id, is_primary)
SELECT 
  png.player_id,
  COALESCE(ig.id, g.id),
  true
FROM players_needing_guardians png
LEFT JOIN inserted_guardians ig 
  ON ig.organization_id = png.organization_id 
  AND ig.phone_normalized = png.phone_normalized
LEFT JOIN guardians g 
  ON g.organization_id = png.organization_id 
  AND g.phone_normalized = png.phone_normalized
WHERE COALESCE(ig.id, g.id) IS NOT NULL
ON CONFLICT (player_id, guardian_id) DO NOTHING;
```

---

## Resultado Esperado

| Antes | Después |
|-------|---------|
| 1 guardian | ~38+ guardians |
| 41 sin acceso al portal | ~38 con acceso |
| Nuevos jugadores sin guardian | Auto-vinculados |

### Credenciales de Acceso para Padres

Una vez implementado, los padres podrán acceder a:

**URL:** `https://strykos.lovable.app/portal/login`

**Datos necesarios:**
| Campo | Valor |
|-------|-------|
| Código de Academia | `white-lions-academies` |
| Teléfono | El mismo que registraron |
| PIN | Últimos 4 dígitos del teléfono |

**Ejemplo:** Si el teléfono es `6861965753`, el PIN es `5753`.

---

## Comunicación Sugerida para Padres

Una vez listo, podrías enviar este mensaje:

> **¡Accede al Portal Familiar de White Lions!**
> 
> Ahora puedes ver el progreso de tu hijo(a) en la academia.
> 
> 📱 Entra a: strykos.lovable.app/portal/login
> 
> **Datos de acceso:**
> - Código: white-lions-academies
> - Teléfono: (el que registraste)
> - PIN: últimos 4 dígitos de tu teléfono
> 
> ¡Podrás ver asistencias, logros y más!

---

## Archivos a Modificar

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| Nueva migración SQL | SQL | Función + trigger + datos retroactivos |

**No se requieren cambios en TypeScript** - el trigger maneja todo automáticamente.

---

## Verificación Post-Implementación

Después de aplicar, verificar:
1. `SELECT COUNT(*) FROM guardians` → Debe ser ~38+
2. `SELECT COUNT(*) FROM player_guardians` → Debe ser ~42
3. Probar login con teléfono existente → Debe funcionar

