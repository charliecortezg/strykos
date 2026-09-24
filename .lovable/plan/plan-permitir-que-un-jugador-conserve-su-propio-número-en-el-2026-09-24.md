# Plan: Permitir que un jugador conserve su propio número en el pedido de uniformes

## Problema

En el formulario público de pedido de uniformes, el sistema bloquea TODOS los números ya asignados en la categoría — incluido el número que pertenece al mismo jugador que está haciendo el pedido. Un papá no puede pedir el uniforme nuevo con el número que su hijo ya usa.

## Cambio

Si el número solicitado ya pertenece al mismo jugador (mismo nombre en la misma categoría), ese número se considera disponible **solo para él**. Para todos los demás sigue bloqueado.

## Archivos a modificar

### 1. `supabase/functions/uniform-campaign/index.ts` (función del pedido)

- `getOccupiedNumbers()` acepta un `playerName` opcional:
  - Al sumar números de jugadores con `jersey_number`: se excluye el número si el nombre del jugador coincide (comparación normalizada: minúsculas, sin espacios extra) con quien hace el pedido.
  - Al sumar `uniform_blocked_numbers`: misma excepción si `player_name` coincide.
  - Los pedidos (`uniform_orders`) previos NO se exceptúan: un número ya pedido por otro sigue bloqueado.
- `GET ?action=available-numbers`: acepta parámetro opcional `player_name` y lo pasa al cálculo.
- `POST` (crear pedido): pasa `player_name` al cálculo de ocupados, de modo que el jugador pueda enviar su propio número aunque la lista general lo marque ocupado. La validación anti-conflicto se mantiene para números de otros jugadores.
- Redeploy de la función.

### 2. `src/pages/uniforms/UniformOrderPage.tsx` (formulario)

- Al consultar números disponibles, se envía también el `player_name` escrito (se vuelve a consultar cuando el nombre o la categoría cambian).
- Mensaje de error sin cambios para números ajenos.

## Resultado esperado

- Santiago (u otro jugador) puede seleccionar su número actual y completar el pedido.
- Otro jugador que intente ese mismo número lo verá bloqueado como antes.
- Sin cambios en base de datos ni en otros módulos.

## Nota

La coincidencia es por nombre exacto normalizado dentro de la categoría. Si el papá escribe el nombre distinto a como está registrado (faltas, apellidos incompletos), el número seguirá bloqueado. Como respaldo, el admin puede confirmar el número manualmente desde el panel.
