# Fecha de nacimiento en Editar Jugador

Agregar el campo **Fecha de nacimiento** al modal de edición de jugador (usado desde el panel de Director Deportivo), mostrando el dato existente y permitiendo corregirlo.

## Comportamiento

- Nuevo campo en el modal, junto al nombre/correo, con formato DD/MM/AAAA.
- Se precarga con el valor guardado del jugador; si el jugador no tiene fecha, queda vacío y es opcional (no bloquea guardar).
- Al lado se muestra la edad calculada como referencia.
- Al guardar, la fecha se actualiza en el perfil del jugador; si se deja vacía, el campo queda sin valor.

## Detalles técnicos

- `src/components/players/EditPlayerModal.tsx`: agregar `date_of_birth` al esquema del formulario (opcional), al `defaultValues`, al `form.reset` desde `player.date_of_birth`, y al payload de `updatePlayer`. Reutilizar `DateInput` de `src/components/fichajes/DateInput.tsx` (ya maneja máscara DD/MM/AAAA, validación y cálculo de edad, y trabaja con strings ISO `YYYY-MM-DD`, sin desfase UTC).
- `src/types/categories.ts`: agregar `date_of_birth?: string | null` a `CreatePlayerData`.
- `src/hooks/usePlayers.ts`: en `updatePlayer`, mapear `date_of_birth` a `updateData` (`|| null`).

Sin cambios de base de datos: la columna `date_of_birth` ya existe en `players`.
