# Permitir confirmar todos los pedidos de "Uniformes noviembre"

## Causa (confirmada)
No es la categoría. Al confirmar, el panel busca si el número ya fue confirmado en esa categoría en **cualquier** pedido de temporadas pasadas (marzo, abril, septiembre). Los 26 pedidos pendientes de noviembre chocan solo con pedidos viejos; por ejemplo, Alexis Espinoza (#1) choca con su propio pedido de septiembre, y Katherine (#9) con Leonardo Ramírez, de abril. Dentro de noviembre no hay números repetidos en la misma categoría.

## Cambio
- Al confirmar, solo se revisan los pedidos **de este mismo pedido de uniformes** y de la misma categoría. Es la misma regla que ya usa el formulario de los papás.
- Si hay un choque real dentro del mismo pedido de uniformes, el mensaje dirá qué jugador tiene ya ese número.
- Nada más cambia. La base de datos ya permite repetir un número en categorías distintas y en pedidos de uniformes distintos.

## Verificación
- Confirmar la orden de Katherine (#9, Biberón) y revisar que pase.
- Revisar que ninguna de las 26 pendientes tenga un choque dentro de noviembre.

## Detalle técnico
`src/hooks/useUniforms.ts` → `confirmNumber`: agregar `.eq('campaign_id', order.campaign_id)` a la consulta de choques y mostrar el nombre del jugador en el error.
