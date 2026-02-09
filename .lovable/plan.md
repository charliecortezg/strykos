
# Hotfix: Terminal de Fichaje - 3 Problemas Criticos

## Problema 1: Error "player_guardians_unique" (BUG CRITICO)

**Causa raiz:** Hay un conflicto entre dos mecanismos que hacen lo mismo:

1. La funcion RPC `process_intake_and_create_entities` crea el jugador, luego inserta en `player_guardians` (paso 4)
2. El trigger `auto_create_guardian_from_player` se dispara automaticamente cuando se crea el jugador (paso 2) y TAMBIEN inserta en `player_guardians`

Resultado: dos INSERT a `player_guardians` con el mismo `(player_id, guardian_id)` = violacion de constraint unique.

**Solucion:** Modificar la funcion RPC para usar `ON CONFLICT (player_id, guardian_id) DO NOTHING` en el INSERT a `player_guardians`. Asi, si el trigger ya creo el vinculo, la funcion simplemente lo ignora.

Ademas, limpiar los 2 registros fallidos que quedaron bloqueados.

## Problema 2: Toggle "Fichaje en Cancha" no aparece

**Causa:** El toggle solo se muestra cuando `settings?.promo_active` es `true`. Revisando la base de datos, el registro de `org_intake_settings` fue creado en la migracion anterior con `promo_active = true`, pero el toggle requiere que `formData.sportId` ya este seleccionado Y que el deporte sea futbol. 

Sin embargo, al filtrar solo Futbol (problema 3), el deporte se puede auto-seleccionar, lo que hara visible el toggle automaticamente.

**Solucion adicional:** Auto-seleccionar Futbol como unico deporte disponible al cargar el formulario.

## Problema 3: Mostrar solo Futbol como opcion de deporte

**Cambio:** Filtrar el selector de deportes para mostrar unicamente "Futbol" (id: `69d680e4-f183-42e7-a82b-501dd26e8a59`). Como solo hay un deporte, se auto-seleccionara al cargar.

---

## Cambios Tecnicos

### 1. Migracion SQL

| Cambio | Detalle |
|--------|---------|
| Fix RPC `process_intake_and_create_entities` | Agregar `ON CONFLICT (player_id, guardian_id) DO NOTHING` al INSERT de player_guardians |
| Limpiar datos | DELETE de los 2 intake_requests con status='failed' y error de player_guardians_unique |

### 2. Frontend (`IntakeTerminal.tsx`)

| Cambio | Detalle |
|--------|---------|
| Filtrar deportes | Solo mostrar deportes cuyo nombre contenga "fut" (Futbol) |
| Auto-seleccionar Futbol | Si solo hay un deporte filtrado, auto-asignarlo al formData |
| Abrir secciones automaticamente | Al auto-seleccionarse el deporte, abrir la seccion de pago |

### Archivos a modificar

| Archivo | Tipo de cambio |
|---------|---------------|
| Migracion SQL | Fix funcion RPC + limpiar datos fallidos |
| `src/components/fichajes/IntakeTerminal.tsx` | Filtrar deportes a solo Futbol, auto-seleccion |

---

## Resultado esperado

1. Un tutor puede registrar multiples hijos sin error de constraint
2. El toggle "Fichaje en Cancha" aparece visible al seleccionar (o auto-seleccionarse) Futbol
3. Solo aparece Futbol como opcion de deporte
4. Los registros fallidos se limpian para no bloquear futuros intentos
