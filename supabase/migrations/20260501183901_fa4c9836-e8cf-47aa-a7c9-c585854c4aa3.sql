-- 1. XOLOS MXLI: Limpiar nota de Ian Jesús (quitar lo de Rommel)
UPDATE match_players
SET note = '[Migrado de notas del partido] [delantero medio volante] Buen 1 vs 1 pero falló mucho en frente de la portería que pudieron ser goles a favor'
WHERE id = '76a52ec4-4eec-4161-a20d-e5ba5b41bb07';

-- 2. XOLOS MXLI: Asignar nota correcta a Romel Ruiz
UPDATE match_players
SET note = '[Migrado de notas del partido] Buena técnica pero le hizo falta intensidad para presionar'
WHERE id = '3d6c2977-26da-4d3c-94b6-e0e8ee5db0ff';

-- 3. NIDO ÁGUILA: Asignar nota a Dylan Gutierrez
UPDATE match_players
SET note = '[Migrado de notas del partido] [delantero-volante] De los mejores en este partido, le costó un poco entrar en juego pero su agilidad y su regate hacen que en cualquier momento pueda crear mucho peligro',
    attended = true
WHERE id = 'a5fb96d5-1bb6-489c-8e78-c54e5f512af7';

-- 4. PORTALES (24cbe616): Migración manual de notas individuales
UPDATE match_players SET note = '[Migrado de notas del partido] [delantero centro / defensa] Buen juego, jugó de delantero centro y peleó varias pelotas, todavía necesita instrucciones básicas para saber posicionarse en el juego, sin embargo ya toma iniciativa para ir a quitar balones y hacer pases cortos a sus compañeros más cercanos. Jugó un poco de tiempo de defensa donde tuvo oportunidad de hacer saques, por su edad y su fuerza física todavía se le dificultan, pero es normal y está bien que tenga estas experiencias para poder buscar a sus compañeros en situaciones sin tanta presión.'
WHERE id = '55734203-fbf3-45d4-bed6-328f36b79904';

UPDATE match_players SET note = '[Migrado de notas del partido] [delantero / medio central ofensivo] MVP del partido. Como delantero es letal, ya sabe jugar la posición y es su mejor posición para poder atacar y recuperar el balón en zonas de peligro. Metió 4 goles siendo diferencial en zona de definición y supo moverse para tomar el liderato. Es nuestro as bajo la manga tenerlo en la delantera. Toma su tiempo para definir, encuentra rebotes y presiona bien a la defensa rival. Como medio central ofensivo, le cuesta acomodarse para congeniar con sus compañeros, no hace pases de seguridad y se le dificulta hacer pases de progresión para ayudar a sus compañeros que están en mejor oportunidad; también cuando hay que decidir en presión conjunta chocaba con un compañero de su propio equipo. Sin embargo, es importante que aprenda nuevas posiciones y no solamente se especialice en una sola; el movimiento y la capacidad la tiene, solo es cuestión de diversificarla para poder hacerlo más importante a él, a sus compañeros y al equipo.'
WHERE id = 'd70b3c4e-8ce4-4415-bfdd-7a990eef04d5';

UPDATE match_players SET note = '[Migrado de notas del partido] [defensa derecho] Gran partido, jugó de defensa derecho, salió al 3/4 del segundo tiempo. Rendimiento excelente posicionalmente, sabía cuándo atacar y defender de manera innata, también tuvo oportunidades de tiro y pases importantes en zona de definición. Progresión del balón por banda y pases importantes. Por su edad, lo que necesita es más trabajo de fuerza, pero esa la irá consiguiendo con el tiempo, no es necesario aún, pero mientras la obtiene será su mayor oportunidad de mejora.'
WHERE id = 'f8c07786-64c2-4f19-9ba4-53f911175ad6';

UPDATE match_players SET note = '[Migrado de notas del partido] [delantero centro] Jugó los últimos 10 minutos de delantero centro. Supo tomar buenas decisiones posicionales y presionar al rival de manera activa. Sin embargo todavía necesita aprender sobre las transiciones de disposición del balón y recuperación. Ya pone más atención durante el partido, y no se distrae cuando el balón ya no está activo. Su mayor oportunidad es poder tomar la confianza de tomar el balón y conducir con él. Estaba bien posicionado para recibir el balón en varias ocasiones pero sus compañeros o no se lo pasaron o León no se comunicó eficientemente para ser opción. Sin embargo, buen juego y buena actitud, ¡que es lo más importante!'
WHERE id = '19cedb15-dd74-4adc-86b8-79395c18c16c';

UPDATE match_players SET note = '[Migrado de notas del partido] [delantero centro / defensa lateral - juego de enfoque] Jugó delantero centro al inicio del segundo tiempo y volvió a entrar faltando 3 minutos para terminar de defensa lateral. De defensa no tuvo mucha actividad para poder identificar mejoras. De delantero estaba un poco perdido, tuvo oportunidades para quitar el balón e hizo buenos pases, sin embargo al tomar decisiones en campo todavía le falta un poco más de experiencia. En 3 ocasiones no se comunicaron él y otro compañero al hacer una marca, esto más por el otro compañero que estaba ocupando el espacio de Luis, sin embargo la comunicación también es importante para poder evitar esto. Se le ve mejor trabajo posicional, ya no se distrae con otros compañeros y sigue el balón. Todavía le falta un poco más de trabajo posicional para que pueda explotar mejor sus habilidades de tiro, que es uno de sus más grandes fuertes; al quedarse más en el centro del campo con más presión se le dificultó poder tomar el balón en condiciones óptimas para su fortaleza.'
WHERE id = '3686655a-8f34-4d2d-aa1e-19f7b2cefca9';

UPDATE match_players SET note = '[Migrado de notas del partido] [medio central] Buen partido. Jugó de medio central hasta 3/4 de la segunda mitad, fue sustituido porque ya se le veía cansado. Tiene gran fuerza, potencia y cuerpo. También sabe moverse con el balón. La posición en la que está le exige usar esa fuerza para pelear el balón y recuperarlo. También hizo buenos pases cortos de progresión. Sin embargo una de sus fortalezas en el dribbling no lució tanto este partido, el rival se juntaba mucho alrededor del balón lo que hacía que fuera más difícil poder hacer buenos pases o drible. Su actitud siempre suma; si lo comparara con un jugador sería Gavi del FC Barcelona, siempre está activo y siempre está buscando marcar y recuperar el balón con garra. Celebra los éxitos de sus compañeros y es muy feliz jugando, esa es una de las cualidades más especiales: gran compañerismo y gran actitud. En los tiros de esquina se veía que quería ganar la posición y peleaba para ganar el balón.'
WHERE id = '4327c4fa-62da-49d5-9107-aee3daf4a3e1';

UPDATE match_players SET note = '[Migrado de notas del partido] [defensa izquierdo] ¡Muy buen partido! Generó mucho peligro por su banda, dribleó y tuvo tiempo para dar pases inteligentes de progresión hacia la zona de creación. El liderazgo de Romel ayudó mucho para los movimientos posicionales y ayudó a defender bastante bien, atacando cuando tenía que hacerlo. Le tuve que decir cuándo defender en más de una ocasión por su emoción del partido, ¡quería meter gol! Es muy importante mantener esa constancia que tiene, se ve muy diferente a lo que se trabajaba hace un mes: hace recorridos, corre y defiende bien. Su mayor oportunidad es aprender a hacer pases medianos y largos, además de buscar los espacios en los saques de banda; esto último lo irá adquiriendo con el tiempo y la experiencia.'
WHERE id = '568bcf44-69ee-4f05-8df6-960dd46a88e3';

UPDATE match_players SET note = '[Migrado de notas del partido] [medio central ofensivo] Buen juego. Jugó medio central ofensivo y ayudó con varias asistencias y a disponer el balón a sus compañeros. Los pases cortos los tiene bien manejados, los pases de progresión al espacio libre es algo que tenemos que trabajar, más que nada porque tiene la capacidad para hacerlo, falta la decisión de dónde y cuándo. Salió lastimado del tobillo en el medio tiempo y eso nos quitó momentum ya que estaba haciendo muy buen trabajo para ayudar a la delantera a atacar, presionaba bien y recuperó muchos balones en zona de creación rival. Volvió a entrar faltando 5 minutos pero ya el juego era diferente y recuperó algunos balones en zona de creación, pero ya no pudo generar el mismo peligro al frente ya que sus compañeros no le comunicaban de manera efectiva.
---
[defensa central] Buen partido en general. Hizo tiros libres que apoyaron a los goles y metió uno de esos. Su instrucción fue ayudar a sus compañeros, lo cual hizo y ayudó a que generáramos más peligro en un principio. Posición nueva, nueva mentalidad: hizo un gran trabajo de líder ayudando y dándole indicaciones a sus compañeros, sus compañeros brillaron jugando junto a él, eso es lo que hace la diferencia de un jugador bueno y uno excelente.'
WHERE id = '2fb477f2-dae0-435c-aaa8-86f3b8c16aa9';

-- Angel (portero) no estaba en el match_players, se inserta
INSERT INTO match_players (match_id, player_id, organization_id, attended, note)
VALUES (
  '24cbe616-4a1a-4b68-bfb1-4bc79fa97fbc',
  'ed0fd262-a854-4f73-94fd-238327ff142c',
  '982f355c-0196-46d3-8da9-3e5e83813dad',
  true,
  '[Migrado de notas del partido] [portero] Tuvo muchas oportunidades de brillar, la portería no le permitió demostrar todas sus habilidades. El tamaño de la portería también es factor y uno de los más grandes. En 1v1 tuvo oportunidades y ganó algunos duelos y otros los perdió. Esto se tiene que trabajar, no solo su habilidad en el 1v1, sino en su comunicación con sus compañeros para evitar estas ocasiones. El coordinar a la defensa es una de las responsabilidades de la portería, ya que sus compañeros a veces están fuera de su posición y necesitan ayuda para poder saber qué pasa a sus espaldas, ahí entra el portero, que es quien ve todo el campo. Hizo pases largos de progresión de buena manera y apoyo a que el resultado fuera ganador.'
)
ON CONFLICT (match_id, player_id) DO UPDATE SET note = EXCLUDED.note, attended = true;