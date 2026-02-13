

# Plan: Eliminar "Pasar Lista" al Programar un Partido

## Problema

Al crear un partido nuevo (status "programado"), el flujo actual obliga al entrenador a pasar lista de asistencia. Esto no tiene sentido operativo: la lista se toma **despues** del partido, no antes. Programar un partido solo necesita los datos basicos (categoria, rival, tipo, fecha, campo).

## Solucion

Simplificar el `CreateMatchFlow` para que al **programar** un partido solo tenga 1 paso (datos del partido), sin pasar lista ni confirmar asistencia. La lista de asistencia ya se maneja cuando el entrenador "Carga Resultado" despues del partido (en `LoadResultsModal`).

## Cambios

### Archivo: `src/components/matches/CreateMatchFlow.tsx`

1. **Eliminar los pasos 2 y 3** (attendance y confirm) del flujo de creacion
2. **Eliminar el step indicator** (1 > 2 > 3) ya que solo habra 1 paso
3. **El boton "Siguiente" se convierte en "Programar Partido"** y guarda directamente
4. **No se envian jugadores** al crear el partido -- los jugadores se registran cuando se carga el resultado
5. Limpiar estado y codigo muerto relacionado con attendance en este componente

### Resultado

```text
ANTES (3 pasos):
[1. Info] > [2. Pasar Lista] > [3. Confirmar] --> Guardar

DESPUES (1 paso):
[Info del partido] --> Programar Partido
```

El flujo completo queda asi:

```text
Crear partido  -->  status: "programado" (sin jugadores)
Cargar resultado (LoadResultsModal)  -->  status: "terminado" (con lista, stats, MVP, semaforo)
```

### Datos que se envian al programar

- category_id, rival_name, match_type, match_date, venue_id, importance, xp_multiplier
- status: "programado"
- goals_for: 0, goals_against: 0
- players: [] (array vacio -- sin lista)

## Seccion tecnica

### Cambios especificos en `CreateMatchFlow.tsx`

1. Eliminar tipo `FlowStep` y estado `step` -- ya no hay pasos
2. Eliminar estados: `playerAttendance`, `showGuestSearch`, `guestSearch`, `availableGuests`
3. Eliminar funciones: `toggleAttendance`, `markAllPresent`, `addGuestPlayer`, `removeGuestPlayer`
4. Eliminar los bloques JSX de step "attendance" y step "confirm"
5. Eliminar step indicator del header
6. Cambiar `handleSubmit` para enviar `players: []`
7. El footer solo muestra boton "Cancelar" y "Programar Partido"

### Sin cambios en backend

No se necesitan migraciones. El campo `players` en `useCreateMatch` ya acepta array vacio.

