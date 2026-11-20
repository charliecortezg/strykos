# Pedido de uniformes: número actual del jugador y números liberados al dar de baja

## Qué cambia
1. **El papá ve el número actual de su hijo.** Al elegir categoría y jugador, el formulario muestra "Número actual: 12" ya seleccionado. Puede quedárselo con un toque o cambiarlo por cualquier número libre.
2. **La ficha del jugador manda.** Un número solo está ocupado si:
   - lo trae un jugador **activo** de la misma categoría,
   - está reservado a mano por la academia, o
   - ya lo pidió otro jugador en **este** pedido.
   Los pedidos de temporadas anteriores ya no bloquean números. El 67 y el 69 siguen bloqueados para todos.
3. **Dar de baja libera el número.** Cuando un jugador se desactiva por cualquier vía, se le quita el número y se libera cualquier reserva a su nombre. Así otro jugador lo puede tomar de inmediato.
4. **Limpieza de hoy.** A todos los jugadores que ya están inactivos se les quita el número y sus reservas.
5. **Si cambia de número, se actualiza su ficha.** Cuando la academia confirma un pedido, ese número queda guardado en la ficha y se libera el anterior.

## Detalles técnicos
- La función `uniform-campaign` pasa a usar `getOccupiedNumbers`: `players.jersey_number` filtrado por `is_active=true`, más `uniform_blocked_numbers` y `uniform_orders` limitados a la campaña actual y a jugadores activos. Se conserva la excepción por `player_id`.
- La acción `available-numbers` también devuelve `current_number` (la ficha del jugador). El formulario lo preselecciona y muestra el botón "Mantener mi número".
- Trigger en `players`: si `is_active` pasa de true a false, se pone `jersey_number = null` y se borran las filas de `uniform_blocked_numbers` con ese `player_id`.
- Al confirmar el pedido (cuando `number_status` pasa a confirmed) se hace `players.jersey_number = assigned_number`.
- Limpieza única de los inactivos de White Lions con una consulta de datos.
- Prueba: comprobar que el número de un jugador inactivo aparece libre y que un jugador activo sigue viendo su propio número disponible.
