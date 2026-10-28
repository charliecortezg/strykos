# Pruebas físicas para Sub-11 y Sub-13 (pedido de Jaime)

## Qué se agrega
En la evaluación mensual de White Lions, solo para las categorías **Sub-11 (Infantil)** y **Sub-13 (Juvenil A)**, una nueva sección **"Pruebas físicas"** con 4 pruebas. El entrenador escribe el número y STRYK pone el color solo.

| Prueba | Cómo se mide | Rojo | Amarillo | Verde |
|---|---|---|---|---|
| Abdominales | repeticiones en 1 minuto | 0–19 | 20–34 | 35 o más |
| Lagartijas | repeticiones en 1 minuto | 0–9 | 10–19 | 20 o más |
| Sentadillas | repeticiones en 1 minuto | 0–24 | 25–39 | 40 o más |
| Beep test (20 m) | nivel alcanzado, ej. 5.7 | N1–N3 | N4–N7 | N8–N10 |

Beep test: se captura con un selector de **nivel (1–10)** y **recorrido (1–9)** → se guarda como 5.7. El color sale del nivel (5.7 = Amarillo).

## A prueba de errores
- Solo se aceptan números enteros, sin negativos; tope razonable (máx. 150 repeticiones) para evitar dedazos como 350.
- Si el número es inusualmente alto (ej. más de 80 abdominales), pide confirmar "¿Seguro? 85 abdominales en 1 minuto".
- Beep test sin texto libre: nivel 1–10 y recorrido 1–9 con selectores, imposible escribir 5.12 o 11.3.
- Se puede dejar una prueba vacía ("no la hizo") sin que cuente como Rojo; se ve como "Sin dato".
- Al salir con cambios sin guardar, avisa (igual que el resto de la evaluación).
- El color se calcula siempre en el sistema, el entrenador no lo puede elegir a mano.

## Dónde se ve
- **Capturar**: en la hoja de cada jugador, nueva tarjeta "Pruebas físicas" debajo de la batería.
- **Grupo**: por prueba, cuántos jugadores en Rojo/Amarillo/Verde y promedio del grupo (misma vista que los indicadores técnicos/tácticos).
- El portal de papás **no** cambia por ahora (lo vemos después si lo quieres).

## Detalles técnicos
- Tabla nueva `wl_physical_tests` (catálogo por org + category_key: nombre, unidad, tipo `reps`|`beep`, rangos rojo/amarillo/verde) con seed para sub-11 y sub-13 de White Lions; GRANTs + RLS por org.
- Columna nueva aditiva `wl_monthly_evaluations.physical_results jsonb default '{}'` (ej. `{"abdominales":32,"beep":{"nivel":5,"recorrido":7}}`). Sin tocar `battery_results`.
- Validación también en base de datos (trigger que rechaza valores fuera de rango), no solo en pantalla.
- Utilidad `getPhysicalColor()` en `wl-utils.ts` con prueba automática de los cortes (19→Rojo, 20→Amarillo, 35→Verde, beep 3.9→Rojo, 4.1→Amarillo, 8.1→Verde).
- Componentes: tarjeta en `WLPlayerEvaluationSheet`, panel nuevo `WLGroupPhysicalPanel` en la pestaña Grupo; solo se muestran si la categoría es sub-11 o sub-13.
