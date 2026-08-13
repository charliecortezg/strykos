# Fecha editable en el módulo de Asistencia del entrenador

## Problema
Hoy el módulo de asistencia del entrenador muestra la fecha como texto fijo (solo el día actual). Si un entrenador olvida registrar la asistencia, no puede volver atrás y termina registrando en días equivocados.

## Qué se va a construir
En la tarjeta de controles de Asistencia, reemplazar la fecha fija por un selector de fecha con calendario:

- Botón con la fecha visible (dd/MM/yyyy) que abre un calendario al tocarlo.
- Se pueden elegir días pasados; los días futuros quedan deshabilitados.
- Al cambiar la fecha, la lista de jugadores y el estado guardado de ese día se recargan automáticamente (ya funciona así, la fecha es la clave de la consulta).
- Un botón "Hoy" para volver rápido a la fecha actual.
- Cuando la fecha seleccionada no es hoy, se muestra una etiqueta "Registro retroactivo" junto al resumen de la categoría.
- Los botones Presente / Ausente / Justificada, "Todos presente" y "Guardar asistencia" funcionan igual en cualquier fecha seleccionada.

La Clase Muestra sigue usando la fecha seleccionada, por lo que también respeta el registro retroactivo.

## Detalles técnicos
- Archivo: `src/components/attendance/TrainingAttendanceModule.tsx`. El bloque de fecha de solo lectura se cambia por `Popover` + `Calendar` (shadcn) con `className="pointer-events-auto"`.
- Manejo de fechas con `time-utils.ts`: `parseDateOnly` para pasar el string a `Date` del calendario y formateo manual a `YYYY-MM-DD` al seleccionar (nunca `toISOString`), evitando el corrimiento UTC.
- `disabled={(d) => d > parseDateOnly(getLocalToday())}` para bloquear futuro.
- No se toca `AttendanceRegistration` ni `useTrainingAttendance`: ya aceptan cualquier fecha y hacen upsert por `player_id,date,category_id`.
- Se actualiza la memoria del proyecto: la regla "asistencia limitada al día actual" queda reemplazada por "fecha seleccionable, retroactiva permitida, futuro bloqueado".
