# Alta de Ethan Leonardo Rendón Ríos en Estrellita + asistencia de agosto

## Qué se va a hacer

1. Registrar al jugador en **Estrellita (2017-2018) Futbol** de White Lions con:
   - Nombre: Ethan Leonardo Rendón Ríos
   - Fecha de nacimiento: 10/12/2017
   - Tutor: Dolores Ríos Montoya
   - Teléfono: 6862239669
   - Email: vecyloliz@gmail.com
   - Activo, sin beca, sin prueba, mensualidad al corriente (mismo esquema que sus compañeros de categoría: mensualidad de $450). Si su mensualidad es otra, dímelo y la ajusto.
   - El sistema creará automáticamente el vínculo de tutor (Portal Familiar) con esos datos de contacto.

2. Registrar **asistencia "Presente"** en los 8 entrenamientos que la categoría ya tiene capturados en agosto 2026:
   3, 5, 10, 12, 17, 19, 24 y 31 de agosto.

3. No se toca ninguna evaluación: la de agosto la capturas tú manualmente después.

## Detalle técnico

- Insert en `players` (organization_id White Lions, category_id `a85385c9-...`, sport_id fútbol, plan_id del plan de $450) mediante la herramienta de datos.
- Insert de 8 filas en `attendance` con `status = 'presente'` y las fechas exactas ya existentes para esa categoría (se toman de los registros actuales, sin inventar fechas).
- Los triggers existentes (XP por asistencia, provisión de tutor, bloque de membresía) se ejecutan solos; no se modifica código de la app.

## Verificación

- Confirmar que el jugador aparece en la lista de Estrellita.
- Confirmar 8 asistencias "presente" en agosto para ese jugador.
