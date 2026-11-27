# Confirmar pedidos de uniformes sin volver a revisar números

## Qué pasa hoy
Al presionar confirmar, el panel vuelve a revisar el número y lo compara con pedidos de meses pasados (marzo, abril, septiembre). Por eso salta "Número ya confirmado en otra orden" aunque en noviembre no haya repetidos.

## Cambio
- El botón de confirmar ya **no revisa números**. Solo marca la orden como confirmada. El formulario de los papás ya evita que dos jugadores de la misma categoría elijan el mismo número.
- Al confirmar, el número se sigue guardando en la ficha del jugador, igual que hoy.

## Verificación
- Confirmar la orden de Katherine (#9, Biberón) y comprobar que pasa.

## Detalle técnico
`src/hooks/useUniforms.ts` → `confirmNumber`: eliminar la consulta de choques y el error; dejar solo el update `number_status='confirmed'`. La restricción única de la base de datos (pedido de uniformes + categoría + número) sigue existiendo como respaldo.
