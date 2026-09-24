# Plan: Selección de jugador y conservación de número en pedidos de uniformes

## Diagnóstico confirmado

- Santiago Guadalupe Simental Orozco está activo en **Escuelita Fútbol (2019-2020)**.
- Su ficha de jugador no tiene número de camiseta guardado.
- El número **7** está asociado a Santiago en un pedido confirmado de marzo de 2026.
- El pedido actual de septiembre quedó registrado temporalmente con el número **77**.
- La validación actual bloquea todos los pedidos anteriores, incluso cuando pertenecen al mismo jugador.
- Además, la base de datos impide repetir un número en la categoría entre campañas distintas; por eso comparar únicamente el nombre no podía resolver completamente el problema.

## Cambios

### 1. Categoría primero y jugador mediante buscador

En el formulario público:

1. Seleccionar primero la categoría.
2. Mostrar después un buscador con lista desplegable de los jugadores activos de esa categoría.
3. Al escribir, filtrar la lista por nombre.
4. Guardar internamente el identificador real del jugador seleccionado; no aceptar un nombre libre como identidad del pedido.
5. Al cambiar de categoría, limpiar el jugador y número seleccionados.

El buscador público devolverá solamente identificador y nombre del jugador, nunca teléfono, correo ni otros datos personales.

### 2. Validación correcta del número propio

- Consultar los números disponibles usando el identificador del jugador seleccionado.
- Liberar para ese jugador el número que tenga en su ficha, en números reservados a su nombre o en pedidos históricos anteriores.
- Mantener bloqueado ese número para cualquier otro jugador de la categoría.
- Los números 67 y 69 continuarán bloqueados para todos.
- Los números usados por otro pedido dentro de la campaña actual continuarán bloqueados.
- Repetir la misma validación al enviar el pedido para que no dependa solamente de la pantalla.

### 3. Identidad estable en pedidos y regla por campaña

- Vincular los nuevos pedidos con el jugador seleccionado mediante `player_id`.
- Asociar los pedidos históricos con jugadores cuando exista una coincidencia única por organización, categoría y nombre normalizado.
- Cambiar la restricción de número único para que aplique dentro de cada campaña y categoría, no para todas las campañas históricas.
- Conservar compatibilidad con pedidos antiguos que no puedan vincularse automáticamente.

### 4. Corregir el pedido actual de Santiago

Después de aplicar las nuevas reglas, cambiar el pedido de septiembre de Santiago de **77** a **7**, sin crear un pedido duplicado ni modificar pedidos de otros jugadores.

## Verificación

- Categoría → buscador → selección de Santiago muestra el 7 disponible.
- Otro jugador de Escuelita sigue viendo el 7 bloqueado.
- Un nombre escrito parcialmente no se usa hasta seleccionar un resultado real.
- Cambiar de categoría limpia la selección anterior.
- El envío acepta el número propio y rechaza números ajenos o duplicados en la campaña actual.
- El pedido vigente de Santiago queda con el número 7.
