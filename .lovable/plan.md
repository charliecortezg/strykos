
# WBS - Ruta Crítica para Completar STRYK Way + Portal Familiar

## Objetivo
Tener el sistema funcionando end-to-end para demo comercial.

---

## 🔴 RUTA CRÍTICA (Bloqueantes)

### RC-1: Crear Trigger de XP en Base de Datos
**Prioridad:** BLOQUEANTE  
**Tiempo estimado:** 5 min  
**Dependencias:** Ninguna

El trigger `trigger_attendance_xp` no existe en la base de datos aunque la función sí. Sin este trigger, **no se genera XP** cuando se marca asistencia.

**Acción:**
```sql
DROP TRIGGER IF EXISTS trigger_attendance_xp ON public.attendance;
CREATE TRIGGER trigger_attendance_xp
AFTER INSERT OR UPDATE OF status ON public.attendance
FOR EACH ROW
EXECUTE FUNCTION public.process_attendance_xp();
```

---

### RC-2: Generar Datos de Progreso Retroactivos
**Prioridad:** BLOQUEANTE  
**Tiempo estimado:** 10 min  
**Dependencias:** RC-1

Actualmente hay 100+ registros de asistencia "presente" que no generaron XP. Debemos procesarlos manualmente.

**Acción:** Script SQL para procesar asistencias existentes y generar:
- Registros en `stryk_events`
- Registros en `player_progress`

---

### RC-3: Implementar Desbloqueo Automático de Badges
**Prioridad:** ALTA  
**Tiempo estimado:** 20 min  
**Dependencias:** RC-2

Actualmente `player_badges` está vacía. Necesitamos:
1. Función que evalúe criterios de badges vs progreso del jugador
2. Trigger o cronjob para ejecutar evaluación

---

### RC-4: Implementar Progreso de Challenges
**Prioridad:** ALTA  
**Tiempo estimado:** 20 min  
**Dependencias:** RC-2

La tabla `player_challenges` está vacía. Necesitamos:
1. Vincular jugadores activos a los challenges activos
2. Actualizar `current_value` basado en su progreso real

---

## 🟡 MEJORAS DE UX (No bloqueantes pero importantes)

### M-1: Mejorar Visibilidad de STRYK Way en Dashboard
**Prioridad:** MEDIA  
**Tiempo estimado:** 5 min

Mover el acceso a STRYK Way más arriba en el dashboard del org_owner.

---

### M-2: Añadir RadarChart SVG en Player Card
**Prioridad:** BAJA  
**Tiempo estimado:** 15 min

El componente RadarChart existe pero puede necesitar verificación visual.

---

### M-3: Crear Más Tutores de Prueba
**Prioridad:** BAJA (para demos)  
**Tiempo estimado:** 5 min

Actualmente solo hay 1 tutor vinculado a 1 jugador.

---

## 📋 Orden de Ejecución (Gantt Simplificado)

```text
┌──────────────────────────────────────────────────────────┐
│ Fase 1: Infraestructura (20 min)                         │
├──────────────────────────────────────────────────────────┤
│ RC-1: Crear Trigger ████                                 │
│ RC-2: Datos Retroactivos   ████████                      │
└──────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────┐
│ Fase 2: Automatización (40 min)                          │
├──────────────────────────────────────────────────────────┤
│ RC-3: Badges Auto          ████████████████████          │
│ RC-4: Challenges Progress  ████████████████████          │
└──────────────────────────────────────────────────────────┘
        ↓
┌──────────────────────────────────────────────────────────┐
│ Fase 3: Polish (25 min - paralelo)                       │
├──────────────────────────────────────────────────────────┤
│ M-1: Dashboard UX          ████                          │
│ M-2: RadarChart            ████████████                  │
│ M-3: Tutores Demo          ████                          │
└──────────────────────────────────────────────────────────┘
```

---

## 🎯 Definición de "Terminado"

El sistema está **completo para demo comercial** cuando:

| Criterio | Verificación |
|----------|--------------|
| ✅ Asistencia genera XP | Marcar "presente" → `stryk_events` crece |
| ✅ Progreso visible en portal | Tutor ve XP, nivel, racha del jugador |
| ✅ Badges se desbloquean | "Primer Entrenamiento" aparece automático |
| ✅ Challenges muestran progreso | "2/3 asistencias esta semana" |
| ✅ Actividad reciente funciona | Feed muestra últimos eventos |
| ✅ RadarChart renderiza | Hexágono con 6 atributos |
| ✅ Analytics muestra datos | Gráficas con jugadores activos |

---

## Resumen de Entregables

| # | Entregable | Tipo | Prioridad |
|---|------------|------|-----------|
| RC-1 | Migración SQL - Trigger | SQL | 🔴 Crítico |
| RC-2 | Script retroactivo XP | SQL | 🔴 Crítico |
| RC-3 | Función auto-badge | SQL + Trigger | 🟠 Alto |
| RC-4 | Lógica challenges | SQL + Trigger | 🟠 Alto |
| M-1 | Dashboard reorder | TypeScript | 🟡 Medio |
| M-2 | RadarChart verify | TypeScript | ⚪ Bajo |
| M-3 | Tutores adicionales | SQL | ⚪ Bajo |

---

## Tiempo Total Estimado

| Fase | Tiempo |
|------|--------|
| Ruta Crítica (RC-1 a RC-4) | ~60 min |
| Mejoras (M-1 a M-3) | ~25 min |
| **TOTAL** | **~85 min** |

---

## Recomendación de Próximo Paso

Ejecutar **RC-1 y RC-2 juntos** para tener datos reales en el portal inmediatamente. Después proceder con automatización de badges y challenges.
