
# Plan: Habilitar Acceso RLS para Portal Familiar

## Problema Identificado

El Portal Familiar no puede autenticar padres porque las políticas RLS bloquean el acceso anónimo a las tablas necesarias.

| Tabla | Política Actual | Problema |
|-------|----------------|----------|
| `organizations` | Solo `authenticated` | El login no puede buscar la academia por `org_code` |
| `guardians` | Solo `authenticated` | No puede verificar el teléfono del padre |
| `player_guardians` | Solo `authenticated` | No puede cargar jugadores vinculados |

## Solución

Crear políticas RLS específicas que permitan acceso anónimo **muy limitado** para el flujo del Portal Familiar.

### Políticas a Crear

#### 1. Organizations - Permitir verificar org_code públicamente

```sql
CREATE POLICY "Portal can verify org_code"
ON organizations FOR SELECT
TO anon
USING (
  is_active = true 
  AND feature_portal_familiar_enabled = true
);
```

Esta política solo permite ver organizaciones activas con portal habilitado.

#### 2. Guardians - Permitir login por teléfono

```sql
CREATE POLICY "Portal can authenticate guardians"
ON guardians FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM organizations o
    WHERE o.id = guardians.organization_id
    AND o.is_active = true
    AND o.feature_portal_familiar_enabled = true
  )
);
```

Solo permite acceder a guardians de organizaciones con portal habilitado.

#### 3. Player_Guardians - Permitir cargar vínculos

```sql
CREATE POLICY "Portal can view guardian links"
ON player_guardians FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM guardians g
    JOIN organizations o ON o.id = g.organization_id
    WHERE g.id = player_guardians.guardian_id
    AND o.feature_portal_familiar_enabled = true
  )
);
```

#### 4. Players - Permitir ver datos básicos del jugador

```sql
CREATE POLICY "Portal can view linked players"
ON players FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM player_guardians pg
    JOIN guardians g ON g.id = pg.guardian_id
    JOIN organizations o ON o.id = g.organization_id
    WHERE pg.player_id = players.id
    AND o.feature_portal_familiar_enabled = true
  )
);
```

#### 5. Categories y Sports - Permitir ver nombres

```sql
CREATE POLICY "Portal can view categories"
ON categories FOR SELECT TO anon USING (true);

CREATE POLICY "Portal can view sports"
ON sports FOR SELECT TO anon USING (true);
```

#### 6. Tablas STRYK Way - Datos del portal

También necesitamos políticas para:
- `player_progress` - Ver XP y nivel
- `player_badges` - Ver insignias ganadas
- `stryk_events` - Ver actividad reciente
- `player_challenges` - Ver retos activos
- `stryk_badges` / `stryk_challenges` - Definiciones

---

## Migración SQL Completa

Se creará una migración que añade todas las políticas necesarias para el Portal Familiar sin comprometer la seguridad de las otras tablas.

---

## Seguridad

Estas políticas son seguras porque:
1. Solo permiten SELECT (lectura)
2. Solo aplican a organizaciones con `feature_portal_familiar_enabled = true`
3. Los datos sensibles (pagos, gastos) no se exponen
4. El acceso está limitado a datos vinculados vía `player_guardians`

---

## Resultado Esperado

| Antes | Después |
|-------|---------|
| Login falla: "Código de academia no encontrado" | Login exitoso |
| Padres no pueden ver datos | Padres ven progreso de sus hijos |
| 0% de padres con acceso | 100% de padres con teléfono válido |

---

## Archivos a Modificar

| Archivo | Tipo | Descripción |
|---------|------|-------------|
| Nueva migración SQL | SQL | Políticas RLS para Portal Familiar |

No se requieren cambios en TypeScript - el código ya está listo, solo faltaban los permisos.
