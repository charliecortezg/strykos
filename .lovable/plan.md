

# Plan: Limpiar datos de prueba de "Carlos Cortez"

Se eliminaran 5 jugadores de prueba y todos sus registros asociados en el orden correcto (para respetar foreign keys).

## Datos a eliminar

| Jugador | ID | Pagos | Fichajes | Guardians |
|---------|-----|-------|----------|-----------|
| Carlos cortez (Pruebas) 9 | 29e8c... | 1 ($850) | 1 | 1 |
| Carlos cortez (Pruebas) 8 | 9100c... | 1 ($850) | 1 | 1 |
| Carlos cortez (Pruebas) 7 | aa1eb... | 1 ($850) | 1 | 1 |
| Pruebas Carlos cortez ( 5 | 74058... | 1 ($850) | 1 | 1 |
| carlos cortez Jugador (Prueba) | bddfa... | 0 | 0 | 0 |

**Total a limpiar:** $3,400 en pagos ficticios que afectan las ganancias reales del mes.

## Orden de eliminacion (respetando FK constraints)

1. `billing_events_log` (si hay registros)
2. `player_lifecycle_log` (si hay registros)
3. `player_offboarding` (si hay registros)
4. `intake_requests` (4 registros - referencia a payments y players)
5. `payments` (4 registros de $850 c/u)
6. `players` (5 jugadores de prueba)
7. `guardians` (4 guardians de prueba)

## SQL a ejecutar

Se ejecutaran DELETEs directos en la base de datos usando el tool de insercion/actualizacion, en el orden indicado arriba, usando los IDs exactos ya identificados.

## Detalle tecnico

**Player IDs:**
- `29e8c5d3-61ff-4896-b3d9-b5ad59c09fcf`
- `9100c583-67d6-4b62-bb75-0fb05589a672`
- `aa1eb8cc-f3eb-446f-82ec-9eac59dae1fb`
- `74058e87-3a9b-4b06-bc89-ddaeaaa479ab`
- `bddfa45e-48ac-450a-94f8-b8f7e68dca93`

**Guardian IDs:**
- `1d529d4a-4abd-4695-8071-0858dfa53cf7`
- `8ec0d5d4-8ab5-4afa-92b6-c7d80ce852fe`
- `b6e73462-a752-4157-ad80-d8731d9e69a8`
- `b921f307-63fe-4a3a-b2f7-1ef7bedd6f00`

No se requieren cambios de codigo, solo limpieza de datos.
