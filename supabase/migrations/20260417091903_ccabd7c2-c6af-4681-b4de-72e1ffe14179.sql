UPDATE training_modules SET title = 'Guía Operativa Sub-5' WHERE target_category = 'sub-5';
UPDATE training_modules SET title = 'Guía Operativa Sub-9' WHERE target_category = 'sub-9';
UPDATE training_modules SET title = 'Guía Operativa Sub-11' WHERE target_category = 'sub-11';
UPDATE training_modules SET title = 'Guía Operativa Sub-13' WHERE target_category = 'sub-13';

UPDATE training_components SET title = 'El entrenador explica Sub-5 en cancha' WHERE title ILIKE '%Carlos explica Sub-5%';
UPDATE training_components SET title = 'El entrenador explica la sesión Sub-9' WHERE title ILIKE '%Jaime explica%Sub-9%';
UPDATE training_components SET title = 'El entrenador explica la sesión Sub-11' WHERE title ILIKE '%Jaime explica%Sub-11%';
UPDATE training_components SET title = 'El entrenador explica Sub-13 y el silencio metodológico' WHERE title ILIKE '%Carlos explica Sub-13%';

UPDATE training_components SET
  content = REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(
            REPLACE(content,
              'Carlos Cortez se hizo como entrenador', 'el Director Deportivo se hizo'),
            'Carlos recibe a cada niño por nombre', 'el entrenador recibe a cada niño por nombre'),
          'Carlos observa y anota en Stryk', 'el entrenador observa y anota en Stryk'),
        'Carlos nombra 3 cosas', 'el entrenador nombra 3 cosas'),
      'Carlos registra 4 preguntas', 'el entrenador registra 4 preguntas'),
    'Carlos lo resuelve en 5 segundos', 'el entrenador lo resuelve en 5 segundos')
WHERE module_id IN (SELECT id FROM training_modules WHERE module_type = 'categoria');

UPDATE training_components SET
  content = REPLACE(
    REPLACE(content,
      'Jaime observa y anota', 'el entrenador observa y anota'),
    'Jaime valida con 1 corrección máxima', 'el entrenador valida con 1 corrección máxima')
WHERE module_id IN (SELECT id FROM training_modules WHERE module_type = 'categoria');

UPDATE training_components SET
  content = REPLACE(
    REPLACE(
      REPLACE(
        REPLACE(
          REPLACE(content,
            'Carlos no planifica', 'el entrenador no planifica'),
          'Carlos solo observa', 'el entrenador solo observa'),
        'Carlos valida', 'el entrenador valida'),
      'Carlos solo dice', 'el entrenador solo dice'),
    'Carlos espera hasta el Paso 4', 'el entrenador espera hasta el Paso 4')
WHERE module_id IN (SELECT id FROM training_modules WHERE module_type = 'categoria');