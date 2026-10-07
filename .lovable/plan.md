# Módulo "Documentos de jugadores"

## Punto crítico antes de construir
Hoy el Portal Familiar no tiene una sesión real: el papá entra con código + teléfono + PIN (últimos 4 dígitos del teléfono) y la "sesión" vive solo en el navegador. Con eso, la base de datos no puede saber quién es el papá, así que no se puede garantizar "solo los documentos de SUS hijos" para algo tan sensible como actas y CURP.

Propuesta: el login del portal pasa por una función del servidor que valida código/teléfono/PIN y entrega un token firmado de 24 h (reutilizando la tabla existente `tutor_auth_tokens`). Toda acción de documentos de la familia (ver estado, subir, URL firmada, guardar datos) va por funciones del servidor que validan ese token. El login actual sigue funcionando igual para el resto del portal.

## 1. Base de datos, archivos y bitácora
- Tabla `player_documents` y `document_access_log` con `org_id`, RLS activo y permisos solo vía funciones SECURITY DEFINER (`puede_ver_documentos`, `puede_subir_documentos`, admin = org_owner/administrativo).
- Índices únicos parciales: un vigente por jugador+tipo (y por temporada en constancia).
- Columna nueva `players.curp` (nullable).
- Temporada: no existe por organización; se agrega `organizations.temporada_actual` (por defecto "2026-2027").
- Funciones: `docs_estado_jugador`, `docs_subir`, `docs_revisar`, `docs_guardar_datos_base` (familia solo llena vacíos), `docs_constancia_vigencia`, `docs_completitud_org`.
- Bucket privado `player-documents`, ruta `{org}/{jugador}/{tipo}/{uuid}.{ext}`, sin URLs públicas.
- Función del servidor `player-documents`: URL firmada de 60 s + registro en bitácora; también atiende al portal con el token familiar.
- Flag `documentos` agregado y activado en White Lions.

## 2. Administración (Panel del Dueño > Jugadores)
- Pestaña "Documentos" en el perfil: datos base editables, 4 tarjetas (Subir/Reemplazar/Ver/Descargar/Eliminar), Aprobar/Rechazar con motivo de lista + nota, campo "Temporada actual".
- Lista: columna 0/3–3/3, insignia de constancia, filtros Faltantes / Por revisar / Constancia vencida, botón "Pedir documentos por WhatsApp" (wa.me con link al portal).
- Entrenador: solo ve "Completo sí/no".

## 3. Portal de papás
- Ruta `/portal/documentos` (sin sesión → login → regresa ahí).
- Lista de hijos con estado; por hijo: Paso 1 datos (existentes bloqueados con nota), Paso 2 cuatro tarjetas con "Tomar foto o elegir archivo", vista previa, Enviar, reintento automático, motivo de rechazo.
- Compresión de imágenes en navegador, HEIC→JPG, PDF, máx 10 MB, recorte cuadrado para foto, validación CURP con advertencia si no coincide con la fecha.

## 4. Indicador
- En Inicio: "Documentos completos: X de Y jugadores" desde `docs_completitud_org()` (misma fuente que el filtro Faltantes).

## Pruebas al final
Verificaré con sesiones reales: aislamiento entre organizaciones, URL directa del archivo sin sesión (debe fallar), familia sin poder sobrescribir datos, bitácora en cada vista/descarga, cambio de temporada → constancias "Vencida" sin borrarse.
