Haré un hotfix enfocado solo en el popup de detalle de partido para resolver el zoom y el swipe horizontal sin tocar lógica ni guardados.

1. Revertir el bloqueo de zoom global
- Ajustar el meta viewport para quitar `user-scalable=no` y `maximum-scale=1`.
- Esto devuelve al usuario la capacidad de hacer pinch/zoom como escape inmediato si el contenido se desborda.

2. Corregir el drawer para que no escale la pantalla base
- En `MatchDetailDrawer.tsx`, abrir el drawer con `shouldScaleBackground={false}`.
- Esto evita que la librería del drawer transforme/escale el fondo, que es una causa probable del popup abriendo en una escala incorrecta.
- Mantener el portal en `document.body`, pero evitar cambios globales innecesarios en el drawer compartido.

3. Convertir el detalle de partido en una vista modal mobile real
- Hacer que el `DrawerContent` del detalle de partido use casi toda la pantalla móvil: ancho real del viewport, altura controlada y `overflow-hidden`.
- Separar estructura en:
  - Header fijo.
  - Tabs swipeables.
  - Contenido vertical scrollable.
  - Footer fijo.
- Esto permitirá ver el módulo completo sin tener que “zoom out”.

4. Arreglar swipe horizontal de tabs
- Aplicar el scroll al contenedor exacto que envuelve los tabs, no al `TabsList` solamente.
- Usar `overflow-x-scroll`, `flex-nowrap`, `WebkitOverflowScrolling: touch`, `scrollSnapType`, `touchAction: pan-x`.
- Asegurar que cada tab tenga `flex-shrink-0`.

5. Reconstruir la lista de jugadores como tabla mobile-scrollable
- Reemplazar la fila tipo card/flex actual del tab Jugadores por una estructura tipo tabla simple dentro de un wrapper horizontal:
  - Wrapper: `overflow-x-auto`, `touchAction: pan-x`, `WebkitOverflowScrolling: touch`.
  - Tabla: `min-width` explícito para forzar scroll horizontal.
  - Primera columna Jugador sticky a la izquierda.
- Mantener los mismos datos visibles: jugador, posición, rendimiento, asistencia, goles/asistencias o puntos.
- Mantener el click para abrir detalle de jugador y la edición existente sin cambiar la lógica de guardado.

6. Alcance exacto
- Archivos a tocar:
  - `src/components/matches/MatchDetailDrawer.tsx`
  - `index.html` solo para corregir el viewport global.
- No tocar base de datos, hooks, XP, escrituras, rutas ni otros módulos.

Resultado esperado:
- El popup ya no abrirá con escala incorrecta.
- El usuario podrá hacer zoom manual si el navegador lo requiere.
- Los tabs serán alcanzables por swipe.
- La tabla/lista de jugadores se podrá mover horizontalmente para ver todas las columnas en móvil.