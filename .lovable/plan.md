# Cargar números de uniforme de White Lions

## Qué se hará
1. Guardar en la ficha de cada jugador de White Lions el número de uniforme de la lista (Biberón, Escuelita, Estrellita, Infantil, Juvenil A).
2. **Katherine (Biberón)**: se omite. Cuando la des de alta en la terminal de fichaje, se le asigna su número.
3. **Números repetidos en Infantil**:
   - 9: se queda con **Mateo Ávila**; a **Allaim Contreras** se le quita (queda N/A).
   - 12 (Gael Aguilar / Ian Jesús Flores): no se guarda a ninguno hasta que me digas a quién se le queda.
4. Al terminar te entrego la tabla final Categoría / Nombre completo / Número (N/A si no tiene).

## Detalles técnicos
- Solo se actualiza el campo de número de uniforme en `players` de la org White Lions; no se borra nada.
- Antes de guardar se verifica que ningún número quede repetido dentro de la misma categoría.
