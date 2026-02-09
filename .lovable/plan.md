

# Plan: Terminal de Fichaje como POS integrado con planes

## Resumen

Actualmente el terminal de fichaje calcula los montos usando tarifas fijas del `IntakeSettings` (inscripcion $400, mensualidad futbol $450, etc.), ignorando el precio real del plan seleccionado. Esto genera una desconexion entre los planes creados por el admin y lo que cobra el fichaje.

El cambio principal es: **los planes son la fuente de verdad del precio**. El terminal muestra el desglose segun los planes seleccionados, no segun tarifas hardcodeadas.

---

## Que cambia

### 1. Terminal de Fichaje: seleccion multi-plan con precios reales

**Actualmente:** Un solo campo `planId` (select unico). El total se calcula con `calculateIntakeFees()` basado en sport + promo, no en el plan.

**Nuevo comportamiento:**
- El campo de plan pasa de ser un select unico a un **selector multi-plan con checkboxes**
- Cada plan seleccionado muestra su nombre y precio
- El total se calcula sumando los precios de los planes seleccionados
- **Minimo 1 plan obligatorio** para continuar
- El desglose en la seccion de pago muestra cada plan como linea separada (como un ticket de venta)
- La promo "Fichaje en Cancha" aplica como descuento sobre el plan mensual de futbol (si existe entre los seleccionados)

**Ejemplo visual del desglose:**
```text
Inscripcion (Anual)         $400
Entrenamiento - Mensualidad $500
                     Total: $900
```

O con promo activa:
```text
Inscripcion (Anual)         $400
Entrenamiento - Mensualidad $300  PROMO
                     Total: $700
```

### 2. Datos guardados en intake_requests

**Actualmente:** `plan_id` (uuid unico), `registration_fee`, `monthly_fee`, `total_amount`

**Cambio de datos:**
- Nuevo campo `plan_ids` (uuid array) para guardar multiples planes seleccionados
- `registration_fee` y `monthly_fee` se mantienen por retrocompatibilidad pero se calculan del desglose de planes
- `total_amount` = suma de todos los planes seleccionados (con descuentos aplicados)

### 3. Admin Dashboard: ya tiene lo necesario

El admin **ya tiene** las herramientas para modificar precios:
- Tab "Planes": `PlansModule` con CRUD completo (crear, editar precio, activar/desactivar, eliminar)
- Tab "Configuracion/Cobranza": `IntakeSettingsPanel` para tarifas de fichajes y promos

Lo unico que falta es agregar el `IntakeSettingsPanel` tambien dentro del tab de Fichajes como acceso rapido, para que sea mas intuitivo.

---

## Detalle tecnico

### Migracion SQL
- Agregar columna `plan_ids uuid[]` a `intake_requests`
- Mantener `plan_id` existente por retrocompatibilidad (se llena con el primer plan)

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Migracion SQL | Agregar `plan_ids uuid[]` a `intake_requests` |
| `src/components/fichajes/IntakeTerminal.tsx` | Cambiar `planId: string` a `selectedPlanIds: string[]`. Selector multi-plan con checkboxes. Calcular total sumando precios de planes seleccionados. Desglose tipo ticket en seccion de pago. Logica de promo sobre plan mensual futbol |
| `src/hooks/useIntake.ts` | Actualizar `CreateIntakeData` para aceptar `planIds: string[]`. Guardar en `plan_ids` y `plan_id` (primer elemento). Calcular `total_amount` desde planes |
| `src/pages/dashboard/AdministrativoDashboard.tsx` | Agregar `IntakeSettingsPanel` como sub-seccion dentro del tab "Fichajes" para acceso rapido a configuracion de precios |

### Logica del total

```text
total = suma de (plan.price para cada plan seleccionado)

Si promo activa Y isPitchSigning:
  - Buscar plan con periodicity='monthly' y sport=futbol entre seleccionados
  - Aplicar precio promo en lugar de precio original de ESE plan
```

### Flujo del usuario en el terminal

1. Selecciona deporte
2. Ve lista de planes activos del deporte con checkboxes y precios
3. Marca al menos 1 plan (ej: "Inscripcion $400" + "Entrenamiento $500")
4. En la seccion de pago ve el desglose tipo ticket
5. El boton de registro muestra el total calculado

---

## Lo que NO cambia
- La estructura de `plans` (ya tiene `periodicity: annual` para inscripcion)
- El `PlansModule` del admin (ya permite CRUD de planes)
- El `IntakeSettingsPanel` (se mantiene para promo y configuracion general)
- La logica de RPC `process_intake_and_create_entities`
