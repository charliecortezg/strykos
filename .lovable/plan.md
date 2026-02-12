

# Plan: Asignar Bloque FOUNDATION a Todos los Jugadores Activos

## Resumen

Ejecutar una migracion SQL que asigne el bloque FOUNDATION a todos los jugadores internos existentes que aun no tienen bloque asignado. Tambien ajustar el trigger de insercion para que cubra jugadores con `lifecycle_status = 'prospect'` (no solo `active`), evitando que este problema se repita.

---

## Cambios

### 1. Migracion SQL unica

La migracion hara tres cosas:

**A) Actualizar el trigger de insercion** para que tambien asigne bloque cuando un jugador entra como `prospect` (actualmente solo lo hace para `active`, pero los jugadores entran como `prospect` desde la central de fichaje).

**B) Actualizar el trigger de cambio de lifecycle** para cubrir la transicion `prospect -> active` (no solo `inactive -> active`), asignando bloque si el jugador no tiene uno.

**C) Asignacion masiva retroactiva**: Llamar `assign_default_membership_block()` para cada jugador interno existente que tenga `membership_stage = 'none'`, sin importar si es `active` o `prospect`. Esto les asignara FOUNDATION con fecha de inicio = hoy y fecha de fin = hoy + 3 meses.

### 2. Resultado esperado

- Los 48 jugadores actuales apareceran en el bloque "Fundacion"
- La card del Portal del Jugador mostrara el progreso en lugar del mensaje "El camino formativo aun no ha sido activado"
- Futuros jugadores creados desde fichaje (que entran como `prospect`) tambien recibiran bloque automaticamente

## Seccion tecnica

### Sin cambios en frontend

Solo se ejecuta una migracion SQL. Los componentes `MembershipHeroCard` y `MembershipTimeline` ya estan preparados para mostrar los datos una vez existan en la base de datos.

### Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| Nueva migracion SQL | Actualizar triggers + asignacion masiva retroactiva |

