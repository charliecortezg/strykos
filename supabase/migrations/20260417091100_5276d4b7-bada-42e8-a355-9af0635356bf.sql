
-- ===========================================================
-- SPRINT 4 — Módulos de Categoría (Guías Operativas)
-- Adaptado al esquema real (module_order, component_order, sin
-- organization_id en training_modules, sin max_attempts ni
-- verification_* en training_components).
-- ===========================================================

-- 1. Agregar columnas module_type y target_category
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS module_type text NOT NULL DEFAULT 'certificacion'
    CHECK (module_type IN ('certificacion', 'categoria')),
  ADD COLUMN IF NOT EXISTS target_category text;

-- 2. Permitir 'categoria' como certification_level (además de WL-C1..WL-C5)
ALTER TABLE training_modules
  DROP CONSTRAINT IF EXISTS training_modules_certification_level_check;
ALTER TABLE training_modules
  ADD CONSTRAINT training_modules_certification_level_check
  CHECK (certification_level = ANY (ARRAY[
    'WL-C1','WL-C2','WL-C3','WL-C4','WL-C5','categoria'
  ]));

-- 3. Marcar módulos existentes WL-C1 como 'certificacion'
UPDATE training_modules
SET module_type = 'certificacion'
WHERE certification_level = 'WL-C1';

-- 4. Seed: 4 módulos de categoría + componentes + 60 preguntas
DO $$
DECLARE
  mod_sub5_id uuid;
  mod_sub9_id uuid;
  mod_sub11_id uuid;
  mod_sub13_id uuid;
  exam_sub5_id uuid;
  exam_sub9_id uuid;
  exam_sub11_id uuid;
  exam_sub13_id uuid;
BEGIN

-- ── MÓDULO SUB-5 ──
INSERT INTO training_modules (
  certification_level, module_type, target_category,
  module_order, title, description, estimated_minutes
) VALUES (
  'categoria', 'categoria', 'sub-5', 1,
  'Guía Operativa Sub-5 — Entrenador Cortez',
  'Conoce la estructura, los juegos y el protocolo completo de las sesiones de Sub-5 en White Lions.',
  60
) RETURNING id INTO mod_sub5_id;

INSERT INTO training_components (module_id, component_type, title, content, component_order)
VALUES
(mod_sub5_id, 'lectura', 'La sesión Sub-5: estructura y propósito',
'SUB-5 ES LA CATEGORÍA MÁS IMPORTANTE — Y LA MÁS FÁCIL DE ARRUINAR

La tentación más grande en Sub-5 es sobre-complicar. Añadir objetivos técnicos, corregir la postura, exigir que "pasen bien". Resistir esa tentación es la habilidad más importante del entrenador en esta etapa.

La Guía Operativa Sub-5 tiene una premisa central: todo es juego. Los 4 bloques de la sesión son juego. El rondo es juego. El partido es juego. El cierre es celebración.

EL ÚNICO INDICADOR DE ÉXITO

El éxito en Sub-5 se mide en una sola cosa: que los niños quieran volver mañana.

No en cuántos pases correctos hubo. No en si aplicaron la restricción. No en si gritaron "disponemos". En si se fueron sonriendo y ya están pensando en la próxima sesión.

Todo lo demás — los indicadores de Stryk, los fundamentos técnicos, el vocabulario WL — es secundario a ese objetivo primario.

LOS 4 BLOQUES — 60 MINUTOS

Bloque 1 — Activación lúdica (8-10 min):
Sin balón los primeros 2 minutos. Carreras libres. Carlos recibe a cada niño POR NOMBRE. Ese acto de bienvenida individual es la primera señal de que este es un espacio seguro.

Luego: balón propio para cada niño. Tocar, rodar, explorar. Sin consigna técnica. El niño calibra su cuerpo antes de que empiece el juego organizado.

Bloques 2-3 — Bloque de Juegos (35-38 min):
2-3 juegos del ambiente del mes. Carlos cambia de juego cada 10-12 minutos — los cambios mantienen la atención fresca en niños de 4-5 años.

El rondo lúdico 3v1 o 4v1 siempre aparece en este bloque. El campo es 12x12m — grande para que los niños no se agolpen. Sin límite de toques. Sin restricción técnica. El que pierde el balón entra al centro: "¡te toca ser el guardián!" — aventura, nunca castigo.

Bloque 4 — Partido libre (10-12 min):
Partido 4v4 libre sin restricciones. Carlos observa y anota en Stryk. CERO paradas. Si hay conflicto entre niños, Carlos lo resuelve en 5 segundos y el partido sigue.

En 1 de los partidos de 3 minutos, Carlos anota los 3 indicadores principales de Stryk.

Cierre — 3 minutos:
Carlos nombra 3 cosas específicas y positivas del partido CON NOMBRES PROPIOS. "¡Said persiguió el balón 5 veces!" Nunca señala errores. Termina con el grito del equipo.

LA FICHA POST-SESIÓN EN STRYK

5 minutos después de cada sesión, Carlos registra 4 preguntas:
1. ¿Todos los niños se fueron con energía positiva?
2. ¿Observé los indicadores del mes? (X/8 por cada indicador)
3. ¿Algún niño tuvo pocos toques del balón?
4. ¿Algún niño lloró o se frustró?

Estas 4 preguntas son la evaluación completa de Sub-5. Son más importantes que cualquier dato técnico.', 1),
(mod_sub5_id, 'video', 'Carlos explica Sub-5 en cancha',
'https://youtube.com/placeholder-sub5-video', 2);

INSERT INTO training_components (
  module_id, component_type, title, component_order, passing_score
) VALUES (
  mod_sub5_id, 'examen',
  'Examen — Guía Operativa Sub-5', 3, 70
) RETURNING id INTO exam_sub5_id;

INSERT INTO training_components (
  module_id, component_type, title, content, component_order
) VALUES (
  mod_sub5_id, 'tarea_campo',
  'Aplica el protocolo completo en 2 sesiones de Sub-5',
  'Planifica y ejecuta 2 sesiones de Sub-5 siguiendo el protocolo completo de la Guía Operativa: bienvenida por nombre, 2-3 juegos del mes, partido libre con CERO paradas, cierre con 3 positivos específicos y grito del equipo. Registra la ficha post-sesión en Stryk.',
  4
);

-- ── MÓDULO SUB-9 ──
INSERT INTO training_modules (
  certification_level, module_type, target_category,
  module_order, title, description, estimated_minutes
) VALUES (
  'categoria', 'categoria', 'sub-9', 2,
  'Guía Operativa Sub-9 — Entrenador Estrella',
  'Domina la estructura de sesión Sub-9: rondo 4+1v2, diferencia Lunes/Miércoles, triggers de presión y protocolo del capitán.',
  60
) RETURNING id INTO mod_sub9_id;

INSERT INTO training_components (module_id, component_type, title, content, component_order)
VALUES
(mod_sub9_id, 'lectura', 'La sesión Sub-9: de la situación al posicionamiento',
'SUB-9 — LA CATEGORÍA QUE INTRODUCE EL SISTEMA COMPLETO

Sub-9 es la primera categoría donde el entrenador empieza a diseñar dos tipos de sesión distintos: una de foco técnico-situacional (Lunes) y una de foco posicional (Miércoles). Esta diferencia no es estética — refleja una distinción pedagógica real: las habilidades técnicas se consolidan con oposición activa, y el posicionamiento se aprende con espacios definidos y roles claros.

LA EVOLUCIÓN DESDE SUB-7

Rondo: Sub-7 tenía 4v1 libre. Sub-9 tiene 4+1v2 posicional. El comodín siempre entre líneas. Orientación de Balón OBLIGATORIA.

Bloque 2: Sub-7 usaba ejercicios sin defensor en Nivel 1. En Sub-9, la oposición es constante desde el primer ejercicio.

Bloque 3: Sub-7 solo tenía Juego de Situación. Sub-9 diferencia: Lunes = Situación, Miércoles = Posición.

Partido: Sub-7 tenía 0 paradas. Sub-9 permite 1 pausa táctica por partido. La gestiona el capitán rotativamente — no el entrenador.

LA DIFERENCIA LUNES vs MIÉRCOLES

LUNES (foco técnico-situacional):
Rondo con orientación obligatoria. Juego de Situación: pressing activo, superioridades numéricas con criterio de decisión. Cierre con pregunta técnica: "¿Qué hicimos bien con el pressing?"

MIÉRCOLES (foco posicional):
Rondo con el comodín entre líneas. Juego de Posición: 5v5 con restricciones de pasillos, zonas y amplitud. Cierre con pregunta posicional: "¿En qué zona estabas cuando disponíamos?"

LOS TRIGGERS DE PRESIÓN EN SUB-9

Sub-9 introduce el trigger principal. El delantero lo reconoce y reacciona — el equipo lo sigue.

Trigger 1 — Pase atrás al portero rival:
El delantero presiona al portero en menos de 2 segundos. ML y MR tapan los laterales. MC cierra el canal central. Los 2 defensores NO suben.

Trigger 2 — Control imperfecto del rival:
El jugador más cercano presiona al portador. El segundo tapa el canal de pase más obvio. (2v1)

Trigger 3 — Pase largo al defensor rival:
El delantero cierra el ángulo mientras el defensor controla. El equipo sube 5m.

EL PROTOCOLO POST-SESIÓN EN STRYK

Sesión del Lunes (después del partido):
¿Cuántos jugadores orientaron el primer toque en más del 70% de sus recepciones?
¿Hubo pressing coordinado real? → Coordinado / Individual / No hubo

Sesión del Miércoles:
¿El equipo mantuvo amplitud en ZC? → Sí / No / Parcialmente
¿El MC nunca estuvo en el mismo pasillo que el extremo? → % de cumplimiento', 1),
(mod_sub9_id, 'video', 'Jaime explica la sesión Sub-9',
'https://youtube.com/placeholder-sub9-video', 2);

INSERT INTO training_components (
  module_id, component_type, title, component_order, passing_score
) VALUES (
  mod_sub9_id, 'examen',
  'Examen — Guía Operativa Sub-9', 3, 70
) RETURNING id INTO exam_sub9_id;

INSERT INTO training_components (
  module_id, component_type, title, content, component_order
) VALUES (
  mod_sub9_id, 'tarea_campo',
  'Planifica 1 sesión de Lunes y 1 de Miércoles en Sub-9',
  'Planifica y ejecuta 1 sesión de Lunes (Situación) y 1 sesión de Miércoles (Posición) en Sub-9, diferenciando correctamente el foco de cada una. Registra el protocolo post-sesión en Stryk incluyendo el dato de pressing coordinado.',
  4
);

-- ── MÓDULO SUB-11 ──
INSERT INTO training_modules (
  certification_level, module_type, target_category,
  module_order, title, description, estimated_minutes
) VALUES (
  'categoria', 'categoria', 'sub-11', 3,
  'Guía Operativa Sub-11 — Entrenador Estrella',
  'Aprende las evoluciones clave de Sub-11: rondo 5v2, exigencia desde Nivel 2, y el cierre con diagnóstico del capitán.',
  60
) RETURNING id INTO mod_sub11_id;

INSERT INTO training_components (module_id, component_type, title, content, component_order)
VALUES
(mod_sub11_id, 'lectura', 'La sesión Sub-11: exigencia desde Nivel 2',
'SUB-11 — DONDE LA EXIGENCIA SUBE Y LA INSTRUCCIÓN BAJA

Sub-11 es la categoría bisagra del sistema WL. Ya no es iniciación — es desarrollo avanzado. El entrenador habla menos y los jugadores piensan más. La estructura de sesión es idéntica a Sub-9, pero el contenido de cada bloque exige más del jugador desde el primer momento.

LAS EVOLUCIONES CLAVE DESDE SUB-9

Rondo: Sub-9 tenía 4+1v2 posicional. Sub-11 tiene 5v2 posicional (12x12m), máximo 2 toques, comodín libre. La exigencia es mayor porque hay más jugadores en espacio similar y menos tiempo de posesión.

Bloque 2: Sub-9 comenzaba en Nivel 1 (sin defensor). Sub-11 comienza en Nivel 2 directamente. No hay progresión sin presión en Sub-11.

Partido: La pausa táctica sigue siendo 1, gestionada por el capitán rotativamente. Los 3 triggers están siempre activos.

LA SESIÓN CONJUNTA MENSUAL CON SUB-13

Una vez por mes, Sub-11 y Sub-13 tienen sesión conjunta. Sub-13 lidera el rondo 7v3 — Sub-11 participa en roles secundarios. Esta sesión sirve como espejo para Sub-11: ver a Sub-13 en acción es la mejor demostración de hacia dónde va el sistema.

EL CIERRE EN M3

A partir del Mesociclo 3 (abril-mayo), el cierre de Sub-11 incluye un protocolo reducido:
El capitán diagnostica primero: "¿Qué salió mal?" El equipo propone. Jaime valida con 1 corrección máxima. En M3, 0 intervenciones del entrenador durante el partido.

DIFERENCIA LUNES vs MIÉRCOLES SUB-11

LUNES: Juego de Situación con pressing activo y superioridades. El ejercicio del Bloque 2 trabaja el fundamento técnico del mes con oposición activa desde el inicio.

MIÉRCOLES: Juego de Posición en el formato de competición del período. F7 o F9 en campo pequeño. F11 en campo grande cuando sea posible. El foco es el posicionamiento y el vocabulario activo.

Los cierres también difieren:
Lunes → pregunta técnica: "¿Qué hicimos bien con el pressing?"
Miércoles → pregunta táctica del formato: "¿Por qué no puede el lateral subir cuando el contrario también está arriba?"', 1),
(mod_sub11_id, 'video', 'Jaime explica la sesión Sub-11',
'https://youtube.com/placeholder-sub11-video', 2);

INSERT INTO training_components (
  module_id, component_type, title, component_order, passing_score
) VALUES (
  mod_sub11_id, 'examen',
  'Examen — Guía Operativa Sub-11', 3, 70
) RETURNING id INTO exam_sub11_id;

INSERT INTO training_components (
  module_id, component_type, title, content, component_order
) VALUES (
  mod_sub11_id, 'tarea_campo',
  'Observa y registra la diferencia Lunes/Miércoles en Sub-11',
  'Ejecuta 1 sesión de Lunes y 1 de Miércoles en Sub-11, registrando en Stryk la diferencia de foco entre ambas. Verifica que el Bloque 2 comenzó en Nivel 2 directamente (sin fase sin oposición).',
  4
);

-- ── MÓDULO SUB-13 ──
INSERT INTO training_modules (
  certification_level, module_type, target_category,
  module_order, title, description, estimated_minutes
) VALUES (
  'categoria', 'categoria', 'sub-13', 4,
  'Guía Operativa Sub-13 — Entrenador Cortez',
  'Domina el protocolo completo de Sub-13: rondo 7v3, los 5 triggers, el silencio metodológico M3 y el Pasaporte de Egreso.',
  60
) RETURNING id INTO mod_sub13_id;

INSERT INTO training_components (module_id, component_type, title, content, component_order)
VALUES
(mod_sub13_id, 'lectura', 'La sesión Sub-13: autonomía y silencio metodológico',
'SUB-13 — EL ESTÁNDAR MÁS ALTO DEL SISTEMA WL

Sub-13 es la categoría donde el sistema WL se evalúa a sí mismo. Si un equipo de Sub-13 puede auto-organizarse tácticamente, diagnosticar sus errores, proponer mejoras y ejecutar el modelo sin que el entrenador hable — el sistema funcionó.

EL RONDO 7v3 CON ROLES DEL 4-3-3

El rondo de Sub-13 no es libre. Cada jugador tiene un rol del 4-3-3 activo durante el rondo. Las restricciones son por posición:
El pivote (MC) nunca puede recibir de espaldas.
El lateral solo recibe si ya se ha desmarcado previamente.
El delantero es el primero en presionar cuando el equipo pierde el balón.

Espacio: 15x15m. Máx 2 toques. 7v3.

LOS 5 TRIGGERS Y EL REGISTRO POST-SESIÓN

Sub-13 trabaja con 5 triggers activos. El entrenador registra en Stryk después de cada partido:
T1: ___/intentos. T2: ___/intentos. T3: ___/intentos. T4: ___/intentos. T5: ___/intentos.

Además: ¿La contra-presión en ZD se ejecutó en 3 segundos? → Ocurrencias: ___, Coordinadas: ___, Porcentaje: ___

EL CIERRE DE 5 PASOS — PROTOCOLO COMPLETO

Paso 1 — Autoevaluación (cada jugador):
Evalúa su partido en 1-3 y da 1 razón. En Sub-13 el jugador nombra el indicador Stryk que falló, no solo "jugué bien/mal".

Paso 2 — Diagnóstico del capitán (rotativo):
Qué falló colectivamente y por qué. El capitán DEBE mencionar el modelo — no solo el resultado.

Paso 3 — Propuesta de mejora:
El equipo propone 1 ajuste concreto. Debe ser específico: "¿cuándo activamos el trigger 4?" — no "presionar mejor".

Paso 4 — Validación de Carlos:
Carlos valida o añade 1 corrección. NUNCA da la respuesta completa.

Paso 5 — Foco del partido:
"Esta semana en el partido: [X]." 1 frase, 1 foco. En M3: el foco lo propone el equipo. Carlos solo confirma.

EL SILENCIO METODOLÓGICO M3 (ABRIL-MAYO)

En M3, Carlos solo observa. No hay instrucción pre-partido. No hay intervenciones. No hay correcciones en el cierre.

La pregunta adicional que Carlos se hace en los 5 minutos antes: "¿Es sesión de M3?" Si la respuesta es sí, no planifica ninguna intervención.

En el cierre de M3, Carlos espera hasta el Paso 4. Si el equipo llega sin errores: "Correcto."

EL PASAPORTE DE EGRESO

Al final de la temporada, cada jugador recibe su Pasaporte de Egreso: nivel actual en las 4 dimensiones, indicadores consolidados (Nivel 3 confirmado en 3+ evaluaciones), indicadores para la siguiente categoría.

Carlos registra en Stryk después de cada partido: "¿Hay algo del partido para el Pasaporte de Egreso?"', 1),
(mod_sub13_id, 'video', 'Carlos explica Sub-13 y el silencio metodológico',
'https://youtube.com/placeholder-sub13-video', 2);

INSERT INTO training_components (
  module_id, component_type, title, component_order, passing_score
) VALUES (
  mod_sub13_id, 'examen',
  'Examen — Guía Operativa Sub-13', 3, 70
) RETURNING id INTO exam_sub13_id;

INSERT INTO training_components (
  module_id, component_type, title, content, component_order
) VALUES (
  mod_sub13_id, 'tarea_campo',
  'Ejecuta el cierre de 5 pasos en 2 sesiones de Sub-13',
  'Aplica el protocolo completo del cierre de 5 pasos en 2 sesiones de Sub-13 y registra en Stryk: los triggers activados, la contra-presión en ZD, y si el cierre llegó al paso 3 sin intervención del entrenador.',
  4
);

-- ══════════════════════════════════════════
-- PREGUNTAS SUB-5 (15)
-- ══════════════════════════════════════════
INSERT INTO training_exam_questions
  (component_id, question_order, question_text, options, correct_option, explanation)
VALUES
(exam_sub5_id, 1, 'Los primeros 2 minutos del Bloque 1 en Sub-5 no tienen balón. ¿Cuál es la razón documentada en la Guía Operativa?',
'[{"key":"a","text":"Para que los niños calienten los músculos antes del contacto con el balón"},{"key":"b","text":"Son carreras libres mientras Carlos recibe a cada niño por nombre — bienvenida individual intencional"},{"key":"c","text":"Para que el entrenador organice el material y los conos antes de empezar"},{"key":"d","text":"Es un requisito de seguridad para niños de 4-5 años antes de actividad física"}]'::jsonb,
'b', 'Los primeros 2 min son carreras libres mientras Carlos recibe a cada niño por nombre. Es el primer acto que comunica que este es un espacio seguro para cada niño.'),
(exam_sub5_id, 2, '¿Cuál es el único indicador de éxito real de una sesión de Sub-5 según la Guía Operativa?',
'[{"key":"a","text":"Que al menos el 60% de los niños ejecutó el pase correctamente"},{"key":"b","text":"Que no hubo conflictos entre niños durante el partido libre"},{"key":"c","text":"Que los niños se fueron sonriendo y ya están pensando en la próxima sesión"},{"key":"d","text":"Que el entrenador completó los 3 indicadores de Stryk del mes"}]'::jsonb,
'c', 'El único indicador real es que los niños quieran volver. Todo lo técnico es secundario a ese objetivo primario en Sub-5.'),
(exam_sub5_id, 3, 'En el rondo lúdico de Sub-5, ¿qué ocurre cuando un jugador pierde el balón?',
'[{"key":"a","text":"Hace 5 sentadillas como penalización ligera para que recuerde no perder el balón"},{"key":"b","text":"Sale 1 minuto fuera del campo y vuelve cuando el siguiente jugador pierde"},{"key":"c","text":"Entra al centro: ¡te toca ser el guardián! — aventura, nunca castigo"},{"key":"d","text":"El equipo pierde 1 punto pero el jugador mantiene su posición exterior"}]'::jsonb,
'c', 'Exactamente esa frase. El lenguaje importa: convierte la pérdida en aventura. No hay penalizaciones ni exclusiones en Sub-5.'),
(exam_sub5_id, 4, '¿Cuántas paradas hace Carlos durante el partido libre de Sub-5?',
'[{"key":"a","text":"1 parada máxima si el 50% del grupo comete el mismo error del foco"},{"key":"b","text":"2 paradas: una a los 5 minutos y una al final para dar feedback técnico"},{"key":"c","text":"Las que Carlos considere necesarias para el aprendizaje de los niños"},{"key":"d","text":"Cero paradas — el partido corre completo. Si hay conflicto, Carlos lo resuelve en 5 segundos y sigue"}]'::jsonb,
'd', 'CERO paradas en Sub-5. Si hay conflicto entre niños, Carlos lo resuelve en 5 segundos y el partido continúa. Anotar en Stryk si hubo incidencia.'),
(exam_sub5_id, 5, '¿Cómo termina SIEMPRE el cierre de una sesión de Sub-5?',
'[{"key":"a","text":"Con una pregunta abierta para que los niños expresen lo que aprendieron"},{"key":"b","text":"Con Carlos nombrando 3 cosas específicas y positivas con nombres propios, y el grito del equipo"},{"key":"c","text":"Con Carlos nombrando al jugador más mejorado de la sesión"},{"key":"d","text":"Con una actividad de relajación de 2 minutos para bajar las revoluciones"}]'::jsonb,
'b', 'Carlos nombra 3 cosas específicas y positivas CON NOMBRES PROPIOS. Nunca señala errores. Termina con el grito del equipo. La sesión siempre termina con energía positiva.'),
(exam_sub5_id, 6, '¿Cuántos juegos usa Carlos en el Bloque de Juegos y con qué frecuencia de cambio?',
'[{"key":"a","text":"1 solo juego por sesión para que los niños lo dominen con repetición"},{"key":"b","text":"4-5 juegos distintos cambiando cada 5 minutos para máxima variedad"},{"key":"c","text":"2-3 juegos del ambiente del mes, cambiando cada 10-12 minutos"},{"key":"d","text":"El número que el entrenador considere según la respuesta del grupo ese día"}]'::jsonb,
'c', '2-3 juegos del ambiente del mes, cambiando cada 10-12 minutos. Los cambios mantienen la atención fresca en niños de 4-5 años.'),
(exam_sub5_id, 7, '¿Qué registra Carlos en Stryk en los 5 minutos después de una sesión de Sub-5?',
'[{"key":"a","text":"Solo el indicador técnico del mes — los demás registros no aplican en Sub-5"},{"key":"b","text":"El marcador del partido libre y el jugador más activo de cada equipo"},{"key":"c","text":"Si todos se fueron con energía positiva, indicadores X/8, si alguno tuvo pocos toques, y si hubo llanto o frustración"},{"key":"d","text":"Solo registra si hubo algún incidente grave que deba comunicar a las familias"}]'::jsonb,
'c', 'La Guía Sub-5 Sec. 7.2 especifica 4 preguntas: energía positiva, indicadores por jugador (X/8), pocos toques, y situaciones emocionales con nombre y situación.'),
(exam_sub5_id, 8, 'El rondo de Sub-5 tiene estas especificaciones. ¿Cuál es la combinación correcta?',
'[{"key":"a","text":"4v2 posicional, campo 10x10m, máximo 2 toques, restricción técnica activa del mes"},{"key":"b","text":"3v1 o 4v1, campo 12x12m, sin límite de toques, sin restricción técnica formal"},{"key":"c","text":"5v2 libre, campo 15x15m, máximo 3 toques, con penalización de punto al perder"},{"key":"d","text":"3v1, campo 8x8m, sin límite de toques, el defensor es pasivo siempre"}]'::jsonb,
'b', 'Rondo 3v1 o 4v1, 12x12m, sin límite de toques, sin restricción técnica, sin penalización emocional.'),
(exam_sub5_id, 9, 'Carlos llega a una sesión y ve que un niño lleva 10 minutos sin casi tocar el balón. ¿Qué hace?',
'[{"key":"a","text":"Para el juego y asigna al niño a un grupo más pequeño donde tenga más toques"},{"key":"b","text":"Lo anota en Stryk como observación y en la próxima sesión ajusta el diseño del juego para favorecer su participación"},{"key":"c","text":"Le da instrucciones directas al niño para que busque más el balón"},{"key":"d","text":"Habla con los padres después de la sesión para que en casa practiquen más con el niño"}]'::jsonb,
'b', 'La Guía Sub-5: si un niño tuvo pocos toques, anotarlo en Stryk y en la próxima sesión ajustar el diseño.'),
(exam_sub5_id, 10, '¿Cuál es la "habilidad más importante del entrenador en Sub-5" según la Guía Operativa?',
'[{"key":"a","text":"Saber diseñar restricciones técnicas apropiadas para la edad"},{"key":"b","text":"Conocer los fundamentos técnicos de fútbol base para enseñarlos correctamente"},{"key":"c","text":"Resistir la tentación de sobre-complicar y añadir objetivos técnicos específicos"},{"key":"d","text":"Manejar conflictos entre niños de 4-5 años de forma efectiva y rápida"}]'::jsonb,
'c', 'Resistir la tentación de sobre-complicar es la habilidad más importante del entrenador en Sub-5.'),
(exam_sub5_id, 11, 'En Sub-5 hay un partido especial en el que Carlos anota los indicadores de Stryk. ¿Cuándo ocurre?',
'[{"key":"a","text":"En el último partido de cada mes como evaluación formal de indicadores"},{"key":"b","text":"En 1 de los partidos de 3 minutos del Bloque 4 — la evaluación integrada en el juego"},{"key":"c","text":"En el primer partido de cada sesión como diagnóstico de inicio"},{"key":"d","text":"Carlos no anota durante el partido — lo hace después de memoria en la ficha Stryk"}]'::jsonb,
'b', 'En 1 de los partidos de 3 minutos, Carlos anota los 3 indicadores principales Stryk.'),
(exam_sub5_id, 12, '¿Cuántos bloques tiene la sesión de Sub-5 y cuánto dura en total?',
'[{"key":"a","text":"5 bloques, 90 minutos — igual que Sub-9 y Sub-11"},{"key":"b","text":"3 bloques, 45 minutos — adaptado a la capacidad de atención de la edad"},{"key":"c","text":"4 bloques (con cierre), 60 minutos — con Bloques 2 y 3 fusionados en un bloque de juegos"},{"key":"d","text":"4 bloques, 75 minutos — con 15 minutos adicionales para la activación lúdica"}]'::jsonb,
'c', '4 bloques en 60 minutos. Los Bloques 2 y 3 se fusionan en un Bloque de Juegos de 35-38 min.'),
(exam_sub5_id, 13, '¿Qué significa que en el Bloque 1 "no hay consigna técnica" en Sub-5?',
'[{"key":"a","text":"Carlos no explica las reglas del ejercicio para que los niños las descubran solos"},{"key":"b","text":"El niño recibe un balón propio y lo explora libremente: tocar, rodar, descubrir — sin que Carlos diga cómo hacerlo"},{"key":"c","text":"Carlos no hace correcciones técnicas pero sí muestra la ejecución correcta como modelo"},{"key":"d","text":"Los niños juegan sin balón para evitar que se centren en la técnica antes de calentar"}]'::jsonb,
'b', 'En el Bloque 1 de Sub-5: balón propio para cada niño, exploración libre sin instrucciones técnicas.'),
(exam_sub5_id, 14, '¿Qué hace Carlos cuando dos niños tienen un conflicto durante el partido libre de Sub-5?',
'[{"key":"a","text":"Para el partido, resuelve el conflicto con todos los niños observando como aprendizaje social"},{"key":"b","text":"Deja que los niños resuelvan solos — la intervención del entrenador inhibe el desarrollo social"},{"key":"c","text":"Resuelve la situación en 5 segundos y el partido sigue — lo registra en Stryk"},{"key":"d","text":"Saca a ambos niños del partido durante 2 minutos como consecuencia natural del conflicto"}]'::jsonb,
'c', 'Carlos lo resuelve en 5 segundos y el partido continúa.'),
(exam_sub5_id, 15, 'Un padre de Sub-5 te pregunta por qué no corriges la técnica del pase de su hijo. ¿Cuál es la respuesta más alineada con la Guía Operativa?',
'[{"key":"a","text":"Le explicas que la técnica se trabaja a partir de Sub-6, cuando el niño tiene más madurez neurológica"},{"key":"b","text":"Le prometes que la siguiente sesión harás más hincapié en la técnica del pase de su hijo"},{"key":"c","text":"Le explicas que en Sub-5 el objetivo es que su hijo quiera volver — y que ese es el fundamento más importante de todo"},{"key":"d","text":"Le muestras los indicadores de Stryk de su hijo para demostrar que sí se trabaja la técnica"}]'::jsonb,
'c', 'El único indicador de éxito en Sub-5 es que el niño quiera volver.');

-- ══════════════════════════════════════════
-- PREGUNTAS SUB-9 (15)
-- ══════════════════════════════════════════
INSERT INTO training_exam_questions
  (component_id, question_order, question_text, options, correct_option, explanation)
VALUES
(exam_sub9_id, 1, '¿Cuál es la evolución más importante del rondo de Sub-7 a Sub-9?',
'[{"key":"a","text":"El espacio se reduce de 12x12m a 10x10m para generar mayor presión"},{"key":"b","text":"Se añade límite de toques: de libre a máximo 3 toques"},{"key":"c","text":"Se pasa de 4v1 libre a 4+1v2 posicional con comodín entre líneas y orientación obligatoria"},{"key":"d","text":"El defensor pasa de pasivo a activo desde el primer segundo"}]'::jsonb,
'c', 'Sub-7 tenía 4v1 libre. Sub-9 tiene 4+1v2 con comodín posicional y orientación de balón obligatoria.'),
(exam_sub9_id, 2, 'En Sub-9, ¿quién gestiona la pausa táctica disponible durante el partido?',
'[{"key":"a","text":"El entrenador Jaime Estrella — es el único que puede decidir cuándo pausar"},{"key":"b","text":"El capitán rotativamente — no el entrenador"},{"key":"c","text":"Cualquier jugador puede pedir la pausa cuando lo considere necesario"},{"key":"d","text":"No hay pausa táctica en Sub-9 — el partido corre completo como en Sub-7"}]'::jsonb,
'b', 'En Sub-9 la pausa táctica la gestiona el capitán rotativamente.'),
(exam_sub9_id, 3, '¿Cuál es la pregunta del cierre de una sesión de Miércoles en Sub-9?',
'[{"key":"a","text":"¿Qué hicimos bien con el pressing hoy?"},{"key":"b","text":"¿Cuántos triggers activamos correctamente en el partido?"},{"key":"c","text":"¿En qué zona estabas cuando disponíamos?"},{"key":"d","text":"¿Cuál fue la restricción del rondo de hoy y por qué es importante?"}]'::jsonb,
'c', 'El Miércoles tiene foco posicional: ¿en qué zona estabas cuando disponíamos?'),
(exam_sub9_id, 4, 'En Sub-9, el Bloque 2 trabaja el fundamento del mes con oposición desde el primer ejercicio. ¿Qué cambio representa esto respecto a Sub-7?',
'[{"key":"a","text":"En Sub-7 tampoco había ejercicios sin oposición — la diferencia es solo la intensidad del defensor"},{"key":"b","text":"Sub-7 usaba ejercicios sin defensor en Nivel 1. En Sub-9 la oposición es constante aunque sea ligera"},{"key":"c","text":"En Sub-9 la oposición empieza solo en el Bloque 3 — el Bloque 2 sigue siendo sin presión"},{"key":"d","text":"La diferencia es que en Sub-9 hay 2 defensores en lugar de 1 desde el inicio"}]'::jsonb,
'b', 'Sub-7 usaba Nivel 1 (sin defensor). En Sub-9 la oposición es constante desde el primer ejercicio del Bloque 2.'),
(exam_sub9_id, 5, 'El Trigger 1 en Sub-9 se activa cuando el rival hace un pase atrás al portero. ¿Qué debe hacer el delantero exactamente?',
'[{"key":"a","text":"Presiona al portero en menos de 2 segundos — sin esperar"},{"key":"b","text":"Presiona al portero solo si está dentro de ZD — fuera de esa zona espera"},{"key":"c","text":"Señaliza al equipo con el brazo para que todos sepan que hay trigger activo"},{"key":"d","text":"Presiona al portero en menos de 3 segundos y el MC cierra el canal central"}]'::jsonb,
'a', 'Trigger 1: el delantero presiona en menos de 2 segundos sin esperar.'),
(exam_sub9_id, 6, '¿Qué registra Jaime en Stryk después del partido del Lunes en Sub-9?',
'[{"key":"a","text":"El score técnico de cada jugador en orientación de balón del 1 al 10"},{"key":"b","text":"¿Hubo pressing coordinado real? Coordinado / Individual / No hubo"},{"key":"c","text":"Cuántos triggers se activaron correctamente de los 3 disponibles"},{"key":"d","text":"El porcentaje de pases correctos del equipo durante el partido"}]'::jsonb,
'b', '¿Hubo pressing coordinado real? Coordinado / Individual / No hubo.'),
(exam_sub9_id, 7, 'En la sesión del Miércoles en Sub-9, ¿cuál es la restricción del rondo en el Bloque 1?',
'[{"key":"a","text":"Orientación de balón obligatoria + máximo 3 toques — igual que el Lunes"},{"key":"b","text":"El comodín solo puede recibir si está entre líneas — no en la misma línea que los 4"},{"key":"c","text":"Pase al pie lejano del rival del receptor + máximo 2 toques"},{"key":"d","text":"Sin restricción en Miércoles — el rondo del Miércoles es libre para contrastar con el Lunes"}]'::jsonb,
'b', 'Miércoles: el comodín solo puede recibir si está entre líneas.'),
(exam_sub9_id, 8, '¿Qué tipo de ejercicio va en el Bloque 3 de la sesión del Lunes en Sub-9?',
'[{"key":"a","text":"Juego de Posición: 5v5 con restricciones de pasillos, zonas y amplitud"},{"key":"b","text":"Juego de Situación: pressing activo, superioridades numéricas con criterio de decisión"},{"key":"c","text":"Juego libre sin restricciones para evaluar transferencia natural"},{"key":"d","text":"Partido pequeño 3v3 con los mismos triggers del rondo"}]'::jsonb,
'b', 'Lunes Bloque 3 = Juego de Situación.'),
(exam_sub9_id, 9, '¿En qué categoría se introduce por primera vez la diferencia formal entre sesión de Lunes (técnica) y sesión de Miércoles (posicional)?',
'[{"key":"a","text":"Sub-7 — ya tiene dos tipos de sesión aunque con menor complejidad"},{"key":"b","text":"Sub-9 — es la primera categoría donde el Bloque 3 es Situación O Posición según el día"},{"key":"c","text":"Sub-11 — cuando los jugadores tienen madurez para entender el posicionamiento"},{"key":"d","text":"Sub-13 — donde la autonomía táctica hace necesaria la diferenciación"}]'::jsonb,
'b', 'Sub-9 es la primera categoría con esta diferenciación formal.'),
(exam_sub9_id, 10, 'El Trigger 2 en Sub-9 se activa cuando el rival tiene un control imperfecto. ¿Qué formación de presión genera?',
'[{"key":"a","text":"El delantero presiona solo — sin coordinar con el equipo hasta recuperar"},{"key":"b","text":"El jugador más cercano presiona al portador y el segundo tapa el canal de pase más obvio — 2v1"},{"key":"c","text":"Los 3 mediocampistas cierran simultáneamente en bloque"},{"key":"d","text":"El delantero y el extremo más cercano cierran los 2 ángulos de pase"}]'::jsonb,
'b', 'Trigger 2: 2v1 coordinado.'),
(exam_sub9_id, 11, '¿Qué observa y registra Jaime sobre el posicionamiento en la sesión del Miércoles?',
'[{"key":"a","text":"Si los jugadores usaron correctamente el vocabulario WL durante el partido"},{"key":"b","text":"¿El equipo mantuvo amplitud en ZC? y ¿el MC estuvo en el mismo pasillo que el extremo?"},{"key":"c","text":"El número de veces que el equipo recuperó la posesión con pressing coordinado"},{"key":"d","text":"Si todos los jugadores llegaron a su posición base antes de que el rival tuviera el balón"}]'::jsonb,
'b', 'Amplitud en ZC y pasillos del MC vs extremo.'),
(exam_sub9_id, 12, '¿Cuál es la evolución del cierre reflexivo de Sub-7 a Sub-9?',
'[{"key":"a","text":"No hay evolución — el cierre es refuerzo positivo en ambas categorías"},{"key":"b","text":"Sub-7 tenía solo refuerzo positivo. Sub-9 añade 1 pregunta táctica + refuerzo + foco del partido"},{"key":"c","text":"Sub-9 introduce el protocolo de 5 pasos con diagnóstico del capitán"},{"key":"d","text":"Sub-9 elimina el refuerzo positivo y lo reemplaza por análisis técnico del rendimiento"}]'::jsonb,
'b', 'Sub-9 añade pregunta táctica + refuerzo + foco.'),
(exam_sub9_id, 13, '¿Qué posición adoptan los 2 defensores cuando se activa el Trigger 1 en Sub-9?',
'[{"key":"a","text":"Suben a ZC para apoyar el pressing del delantero y los extremos"},{"key":"b","text":"Uno presiona al portero rival y el otro cubre la espalda"},{"key":"c","text":"NO suben — mantienen posición compacta en ZA/ZB"},{"key":"d","text":"Se posicionan en los pasillos laterales para tapar la salida por bandas"}]'::jsonb,
'c', 'Los 2 defensores NO suben.'),
(exam_sub9_id, 14, '¿Cuál es la especificación del rondo 4+1v2 en Sub-9?',
'[{"key":"a","text":"4 exteriores + 1 comodín vs 2 defensores, en campo 10x10m, orientación de balón obligatoria"},{"key":"b","text":"4 exteriores + 1 central vs 2 defensores, en campo 12x12m, máximo 2 toques"},{"key":"c","text":"4 exteriores + 1 comodín vs 2 defensores, en campo 8x8m, sin límite de toques"},{"key":"d","text":"4 exteriores + 1 pivote vs 2 defensores, en campo 10x10m, máximo 3 toques"}]'::jsonb,
'a', '4+1v2 posicional en 10x10m con orientación obligatoria.'),
(exam_sub9_id, 15, 'En M3 (abril-mayo), ¿cuántas intervenciones puede hacer Jaime durante el partido de Sub-9?',
'[{"key":"a","text":"1 pausa táctica máxima — igual que en M1 y M2"},{"key":"b","text":"2 pausas: una técnica y una posicional"},{"key":"c","text":"0 intervenciones del entrenador durante el partido"},{"key":"d","text":"Las que considere necesarias — M3 no cambia el protocolo del partido en Sub-9"}]'::jsonb,
'c', 'En M3, 0 intervenciones del entrenador durante el partido.');

-- ══════════════════════════════════════════
-- PREGUNTAS SUB-11 (15)
-- ══════════════════════════════════════════
INSERT INTO training_exam_questions
  (component_id, question_order, question_text, options, correct_option, explanation)
VALUES
(exam_sub11_id, 1, '¿Cuál es la evolución más significativa del rondo de Sub-9 a Sub-11?',
'[{"key":"a","text":"Se añade un defensor más: de 4+1v2 a 5v3"},{"key":"b","text":"Se pasa de 4+1v2 con orientación obligatoria a 5v2 posicional con máx 2 toques y comodín libre"},{"key":"c","text":"El espacio se amplía de 10x10m a 15x15m para más complejidad posicional"},{"key":"d","text":"La orientación de balón deja de ser obligatoria — en Sub-11 el jugador decide"}]'::jsonb,
'b', 'Sub-11: 5v2 posicional, 12x12m, máx 2 toques, comodín libre.'),
(exam_sub11_id, 2, 'En Sub-11, ¿desde qué nivel de dificultad empieza el Bloque 2 de trabajo técnico/táctico?',
'[{"key":"a","text":"Nivel 1 — sin defensor, igual que Sub-9, para que el aprendizaje sea progresivo"},{"key":"b","text":"Nivel 2 directamente — la oposición activa es constante desde el inicio"},{"key":"c","text":"Nivel 3 desde el inicio — Sub-11 trabaja siempre en máxima exigencia"},{"key":"d","text":"Varía según el fundamento del mes: técnicos empiezan en Nivel 1, tácticos en Nivel 2"}]'::jsonb,
'b', 'En Sub-11 empieza directamente en Nivel 2.'),
(exam_sub11_id, 3, '¿Cuál es el contenido del Bloque 3 del Miércoles en Sub-11?',
'[{"key":"a","text":"Juego de Situación con pressing alto y superioridades numéricas"},{"key":"b","text":"Ejercicio técnico del mes con oposición activa desde Nivel 2"},{"key":"c","text":"Juego de Posición en el formato de competición del período"},{"key":"d","text":"Partido libre sin restricciones para evaluar transferencia natural"}]'::jsonb,
'c', 'Miércoles Sub-11: Juego de Posición en el formato de competición.'),
(exam_sub11_id, 4, '¿Con qué frecuencia hay sesión conjunta entre Sub-11 y Sub-13?',
'[{"key":"a","text":"Cada sesión — siempre entrenan juntos para que Sub-11 aprenda de Sub-13"},{"key":"b","text":"1 vez por mes — Sub-13 lidera el rondo 7v3, Sub-11 participa en roles secundarios"},{"key":"c","text":"1 vez por trimestre — en el cierre de cada mesociclo"},{"key":"d","text":"Solo en M3 — cuando Sub-13 ya tiene autonomía total y puede guiar a Sub-11"}]'::jsonb,
'b', '1 vez por mes con Sub-13 liderando.'),
(exam_sub11_id, 5, '¿Cómo es el cierre reflexivo de Sub-11 en M3?',
'[{"key":"a","text":"Silencio total — el equipo no hace cierre reflexivo en M3"},{"key":"b","text":"Cierre normal: 1 pregunta táctica de Jaime + refuerzo + foco del partido"},{"key":"c","text":"El capitán diagnostica primero, el equipo propone, Jaime valida con 1 corrección máxima"},{"key":"d","text":"Igual que Sub-13: protocolo completo de 5 pasos con autoevaluación individual"}]'::jsonb,
'c', 'Protocolo reducido en M3 Sub-11.'),
(exam_sub11_id, 6, '¿Cuántos triggers tiene Sub-11 activos durante el partido?',
'[{"key":"a","text":"Solo el Trigger 1 (pase atrás al portero) — los otros se incorporan en Sub-13"},{"key":"b","text":"2 triggers: pase atrás y control imperfecto"},{"key":"c","text":"Los 3 triggers siempre activos en todos los partidos"},{"key":"d","text":"5 triggers — igual que Sub-13"}]'::jsonb,
'c', 'Los 3 triggers siempre activos en Sub-11.'),
(exam_sub11_id, 7, 'La pregunta del cierre del Lunes en Sub-11 es diferente a la del Miércoles. ¿Cuál es la del Miércoles?',
'[{"key":"a","text":"¿Qué hicimos bien con el pressing? — refuerza el foco técnico"},{"key":"b","text":"¿Cuántos triggers activamos correctamente en el partido de hoy?"},{"key":"c","text":"¿Por qué no puede el lateral subir cuando el contrario también está arriba? — pregunta táctica del formato"},{"key":"d","text":"¿Qué restricción del rondo aplicamos hoy y qué aprendimos de ella?"}]'::jsonb,
'c', 'Pregunta táctica del formato del Miércoles.'),
(exam_sub11_id, 8, '¿Qué rol tiene el comodín en el rondo 5v2 de Sub-11?',
'[{"key":"a","text":"Está posicionado entre líneas obligatoriamente — igual que en Sub-9"},{"key":"b","text":"Es libre — puede posicionarse donde quiera dentro del campo"},{"key":"c","text":"Solo puede recibir si está en una posición posicional válida del formato del mes"},{"key":"d","text":"No hay comodín en Sub-11 — el rondo es 5v2 sin posiciones especiales"}]'::jsonb,
'b', 'Comodín libre en Sub-11.'),
(exam_sub11_id, 9, '¿Cómo difiere el Bloque 3 del Lunes en Sub-11 del de Sub-9?',
'[{"key":"a","text":"En Sub-11 el Bloque 3 del Lunes es Juego de Posición — en Sub-9 era Situación"},{"key":"b","text":"En Sub-11 el Bloque 3 del Lunes es Juego de Situación con pressing activo y superioridades — igual que Sub-9 pero con mayor exigencia"},{"key":"c","text":"En Sub-11 no hay diferencia entre Lunes y Miércoles en el Bloque 3"},{"key":"d","text":"Sub-11 no tiene Bloque 3 de Situación — solo tiene Bloque 3 de Posición en ambos días"}]'::jsonb,
'b', 'Igual concepto que Sub-9 pero desde Nivel 2 de exigencia.'),
(exam_sub11_id, 10, '¿Cuántas intervenciones puede hacer Jaime durante el partido de Sub-11 en M1 y M2?',
'[{"key":"a","text":"Sin límite — Jaime interviene según su criterio"},{"key":"b","text":"Máximo 2: una técnica y una posicional"},{"key":"c","text":"Máximo 1 pausa táctica por partido, gestionada por el capitán"},{"key":"d","text":"Cero — el silencio metodológico empieza en Sub-11 desde M1"}]'::jsonb,
'c', 'Máx 1 pausa táctica gestionada por el capitán.'),
(exam_sub11_id, 11, '¿Cuántos jugadores tiene Sub-11 en el equipo de Jaime Estrella?',
'[{"key":"a","text":"8 jugadores — igual que Sub-5"},{"key":"b","text":"12 jugadores"},{"key":"c","text":"7 jugadores"},{"key":"d","text":"10 jugadores"}]'::jsonb,
'c', 'Sub-11 (Jaime Estrella): 7 jugadores.'),
(exam_sub11_id, 12, 'En Sub-11, ¿cuándo empieza el Bloque 3 a diferenciar Lunes de Miércoles?',
'[{"key":"a","text":"Solo en M3, cuando los jugadores tienen madurez para el posicionamiento avanzado"},{"key":"b","text":"Desde el inicio de la temporada — la diferencia Lunes/Miércoles es estructural en Sub-11"},{"key":"c","text":"A partir del Mesociclo 2, cuando se incorpora el posicionamiento formal"},{"key":"d","text":"Solo cuando el equipo ha completado el Curriculum Técnico básico del período"}]'::jsonb,
'b', 'Estructural desde el inicio.'),
(exam_sub11_id, 13, '¿En qué días entrena Sub-11 según la Guía Operativa?',
'[{"key":"a","text":"Martes y Jueves"},{"key":"b","text":"Lunes y Miércoles"},{"key":"c","text":"Lunes y Jueves"},{"key":"d","text":"Miércoles y Viernes"}]'::jsonb,
'b', 'Sub-11 entrena Lunes y Miércoles.'),
(exam_sub11_id, 14, '¿Qué significa que el Bloque 2 de Sub-11 "empieza desde Nivel 2"?',
'[{"key":"a","text":"El ejercicio comienza con 2 defensores activos desde el inicio — no con 1"},{"key":"b","text":"La dificultad no empieza sin presión como en Sub-9 — hay oposición activa desde el primer minuto"},{"key":"c","text":"El jugador debe estar en Nivel 2 de evaluación Stryk para poder participar en el Bloque 2"},{"key":"d","text":"Los primeros 2 minutos del bloque tienen 2 restricciones activas simultáneamente"}]'::jsonb,
'b', 'Nivel 2 = oposición activa constante.'),
(exam_sub11_id, 15, '¿Qué rol adopta Sub-11 en la sesión conjunta mensual con Sub-13?',
'[{"key":"a","text":"Sub-11 lidera la sesión — Sub-13 hace de mentores observando"},{"key":"b","text":"Sub-11 participa en roles secundarios del rondo 7v3 que Sub-13 lidera"},{"key":"c","text":"Sub-11 y Sub-13 juegan en equipos mixtos sin roles diferenciados"},{"key":"d","text":"Sub-11 solo observa — no participa activamente en la sesión conjunta"}]'::jsonb,
'b', 'Sub-11 en roles secundarios del rondo 7v3.');

-- ══════════════════════════════════════════
-- PREGUNTAS SUB-13 (15)
-- ══════════════════════════════════════════
INSERT INTO training_exam_questions
  (component_id, question_order, question_text, options, correct_option, explanation)
VALUES
(exam_sub13_id, 1, '¿Cuáles son las restricciones de rol en el rondo 7v3 de Sub-13?',
'[{"key":"a","text":"Sin restricciones — el rondo 7v3 es libre para que los jugadores apliquen lo aprendido espontáneamente"},{"key":"b","text":"El pivote nunca puede recibir de espaldas. El lateral solo recibe si ya se ha desmarcado previamente"},{"key":"c","text":"El delantero debe presionar siempre al defensor que pierde el balón en el centro"},{"key":"d","text":"Los 3 mediocampistas deben estar siempre en diferentes pasillos durante el rondo"}]'::jsonb,
'b', 'Restricciones por rol en rondo 7v3.'),
(exam_sub13_id, 2, 'En el Paso 2 del cierre de 5 pasos, ¿qué hace el capitán (rotativo) en Sub-13?',
'[{"key":"a","text":"Propone el foco técnico del próximo partido según su criterio como líder"},{"key":"b","text":"Evalúa a sus compañeros individualmente con nota del 1 al 3 en cada dimensión"},{"key":"c","text":"Diagnostica qué falló colectivamente y por qué — debe mencionar el modelo, no solo el resultado"},{"key":"d","text":"Resume los scores de Stryk del partido para generar consciencia colectiva de los datos"}]'::jsonb,
'c', 'El capitán diagnostica mencionando el modelo.'),
(exam_sub13_id, 3, '¿Cuántos triggers tiene Sub-13 activos y cómo se registran en Stryk?',
'[{"key":"a","text":"3 triggers — igual que Sub-11. Se registra si hubo pressing coordinado o no"},{"key":"b","text":"5 triggers. Se registra T1/intentos, T2/intentos... T5/intentos para cada uno"},{"key":"c","text":"5 triggers. Solo se registra el total de triggers activados correctamente del partido"},{"key":"d","text":"Los triggers no se registran en Stryk — solo se evalúan en el cierre reflexivo"}]'::jsonb,
'b', '5 triggers registrados individualmente.'),
(exam_sub13_id, 4, 'En M3 (abril-mayo), ¿qué pregunta adicional tiene Carlos en los 5 minutos antes de la sesión de Sub-13?',
'[{"key":"a","text":"¿Hay sesión conjunta con Sub-11 hoy?"},{"key":"b","text":"¿Es sesión de M3? → Silencio Metodológico"},{"key":"c","text":"¿Cuántos triggers se trabajarán activos hoy?"},{"key":"d","text":"¿Qué variante del triángulo toca según la rotación?"}]'::jsonb,
'b', '¿Es sesión de M3? → silencio metodológico.'),
(exam_sub13_id, 5, '¿Qué registra Carlos sobre la contra-presión después del partido de Sub-13?',
'[{"key":"a","text":"Solo si hubo contra-presión o no — respuesta binaria sí/no"},{"key":"b","text":"Cuántos jugadores ejecutaron la contra-presión correctamente en porcentaje del equipo"},{"key":"c","text":"¿La contra-presión en ZD se ejecutó en 3 seg? Ocurrencias + coordinadas en tiempo + porcentaje"},{"key":"d","text":"En qué zona del campo ocurrió la mayoría de las contra-presiones del partido"}]'::jsonb,
'c', 'Ocurrencias, coordinadas y porcentaje.'),
(exam_sub13_id, 6, '¿Qué hace Carlos en el Paso 4 del cierre de 5 pasos durante M3?',
'[{"key":"a","text":"Explica en detalle qué salió mal y da la respuesta correcta"},{"key":"b","text":"Solo valida: Correcto — o señala qué revisar sin dar la respuesta completa"},{"key":"c","text":"No participa en el cierre hasta el Paso 5 — los pasos 1-4 son completamente autónomos"},{"key":"d","text":"Hace preguntas adicionales si el equipo no llegó solo al diagnóstico correcto"}]'::jsonb,
'b', 'Solo valida sin dar respuesta completa.'),
(exam_sub13_id, 7, '¿Qué es el Pasaporte de Egreso y cuándo se entrega?',
'[{"key":"a","text":"Es el historial completo de evaluaciones del año que se archiva en Stryk al final de la temporada"},{"key":"b","text":"Es el documento con nivel actual en las 4 dimensiones, indicadores consolidados e indicadores para la siguiente categoría — se entrega en junio"},{"key":"c","text":"Es la certificación de que el jugador aprobó los estándares de Sub-13 para subir de categoría"},{"key":"d","text":"Es un informe para las familias que resume el año completo de formación del jugador"}]'::jsonb,
'b', 'Pasaporte de Egreso entregado en junio.'),
(exam_sub13_id, 8, '¿Qué característica distingue al rondo de Sub-13 respecto a todas las categorías anteriores?',
'[{"key":"a","text":"Es el único rondo del sistema sin comodín — todos los jugadores tienen roles fijos"},{"key":"b","text":"Es posicional 7v3 con roles del 4-3-3 activos y restricciones específicas por posición"},{"key":"c","text":"Es el único rondo donde el límite de toques es 1 — para máxima velocidad"},{"key":"d","text":"Los defensores pueden variar entre 2 y 4 según la decisión del capitán"}]'::jsonb,
'b', 'Roles del 4-3-3 activos en el rondo.'),
(exam_sub13_id, 9, 'En el Paso 3 del cierre de Sub-13, ¿qué convierte una propuesta en válida?',
'[{"key":"a","text":"Que la proponga el capitán — el liderazgo del capitán le da autoridad a cualquier propuesta"},{"key":"b","text":"Que sea específica: ¿cuándo activamos el trigger 4? — no vaga como presionar mejor"},{"key":"c","text":"Que refiera al fundamento técnico del mes activo en Stryk"},{"key":"d","text":"Que todo el equipo esté de acuerdo con la propuesta antes de presentarla a Carlos"}]'::jsonb,
'b', 'Especificidad como estándar.'),
(exam_sub13_id, 10, '¿Cuántas intervenciones puede hacer Carlos pre-partido en M3?',
'[{"key":"a","text":"1 frase pre-partido máxima — igual que en M1 y M2"},{"key":"b","text":"2 frases: una técnica y una táctica"},{"key":"c","text":"Cero — silencio metodológico total. Ni pre-partido ni durante ni post-partido"},{"key":"d","text":"Las que considere para contextualizar el foco del partido del mes"}]'::jsonb,
'c', 'Silencio metodológico total en M3.'),
(exam_sub13_id, 11, 'En el Paso 5 del cierre de Sub-13 durante M3, ¿quién propone el foco del partido?',
'[{"key":"a","text":"Carlos — siempre es el entrenador quien define el foco"},{"key":"b","text":"El capitán del día — en M3 tiene autonomía total de liderazgo"},{"key":"c","text":"El equipo — Carlos solo confirma con una palabra"},{"key":"d","text":"No hay foco del partido en M3 — el equipo juega libremente"}]'::jsonb,
'c', 'El equipo propone, Carlos confirma.'),
(exam_sub13_id, 12, '¿Cómo describe la Guía Sub-13 el Mesociclo 3 en términos de nivel de los fundamentos?',
'[{"key":"a","text":"DESAR todo — los jugadores están en desarrollo en los fundamentos del año"},{"key":"b","text":"CONS absoluto — todo en nivel Consolidado. Autonomía táctica completa. Silencio metodológico"},{"key":"c","text":"INTRO de los fundamentos más avanzados del 4-3-3 con liderazgo emergente"},{"key":"d","text":"Evaluación diagnóstica — el M3 es para medir el estado real después de 2 mesociclos"}]'::jsonb,
'b', 'CONS absoluto con silencio metodológico.'),
(exam_sub13_id, 13, '¿Qué es lo primero que Carlos registra en Stryk después del partido en Sub-13?',
'[{"key":"a","text":"El score general del equipo en los 4 triggers del partido"},{"key":"b","text":"Si el cierre de 5 pasos llegó al paso 3 sin su intervención"},{"key":"c","text":"¿Cuántos de los 5 triggers se activaron correctamente? — desglosado por trigger"},{"key":"d","text":"El nivel de autonomía del equipo en una escala del 1 al 3"}]'::jsonb,
'c', 'Desglose por trigger T1..T5.'),
(exam_sub13_id, 14, '¿Cuándo hay "No hay Nivel 1 en Sub-13"? ¿Qué significa operativamente?',
'[{"key":"a","text":"Los jugadores de Sub-13 no pueden retroceder a Nivel 1 en evaluación Stryk"},{"key":"b","text":"El Bloque 2 no incluye ejercicios sin presión — la progresión parte del Nivel 2 de exigencia"},{"key":"c","text":"No se usan indicadores de Nivel 1 en las rúbricas de evaluación de Sub-13"},{"key":"d","text":"No se planifica contenido de nivel básico en Sub-13 — toda la sesión es nivel avanzado"}]'::jsonb,
'b', 'No hay fase sin presión — parte de Nivel 2.'),
(exam_sub13_id, 15, '¿Qué registra Carlos después del cierre de 5 pasos en Stryk?',
'[{"key":"a","text":"Solo si el capitán diagnosticó correctamente en el Paso 2"},{"key":"b","text":"¿El cierre llegó al paso 3 sin Carlos? Sí / No. ¿Qué paso falló? ¿La propuesta fue específica o vaga?"},{"key":"c","text":"El nivel de liderazgo del capitán del día en una escala del 1 al 3"},{"key":"d","text":"Solo registra el cierre si hubo algún error que Carlos tuvo que corregir en el Paso 4"}]'::jsonb,
'b', 'Tres preguntas específicas sobre el cierre.');

END $$;
