
# Plan: Resolver Módulo de Partidos (RLS + UI/UX)

## ✅ COMPLETADO

### Fase 1: Base de Datos (RLS) ✅
- **Migración ejecutada**: 4 nuevas políticas RLS
  - Entrenadores pueden UPDATE sus partidos y match_players
  - Directores/Owners pueden DELETE partidos y match_players

### Fase 2: Backend (Hook) ✅
- `deleteMatch` mutation agregada a `useMatches.ts`
- Invalidación de cache correcta

### Fase 3: UI/UX Rediseño ✅
- **MatchCard.tsx**: Actualizado con variante `full` para historial y soporte para delete
- **MatchesGrid.tsx**: Nuevo componente - grid responsivo de cards (1-3 columnas)
- **MatchDetailDrawer.tsx**: Nuevo componente - drawer mobile-first reemplazando Dialog
- **MatchHistoryModule.tsx**: Actualizado para usar Grid + Drawer + Delete

### Archivos Modificados
| Archivo | Estado |
|---------|--------|
| `supabase/migrations/` | ✅ Migración RLS ejecutada |
| `src/hooks/useMatches.ts` | ✅ deleteMatch agregado |
| `src/components/matches/MatchCard.tsx` | ✅ Variante full + delete |
| `src/components/matches/MatchesGrid.tsx` | ✅ Nuevo componente |
| `src/components/matches/MatchDetailDrawer.tsx` | ✅ Nuevo componente |
| `src/components/matches/MatchHistoryModule.tsx` | ✅ Actualizado |
| `src/pages/dashboard/DirectorDeportivoDashboard.tsx` | ✅ canDelete=true |

---

## Comportamiento Post-Implementación

| Actor | Acción | Resultado |
|-------|--------|-----------|
| Entrenador | Crear partido | ✅ Funciona |
| Entrenador | Cargar resultado de SU partido | ✅ **Ahora funciona** |
| Director | Ver todos los partidos | ✅ Funciona |
| Director | Editar cualquier partido | ✅ Funciona |
| Director | Eliminar partido de prueba | ✅ **Ahora funciona** |
| Owner | Todo lo anterior | ✅ Funciona |

---

## Mejoras de UX Implementadas

1. **Grid responsivo** en lugar de tabla horizontal
   - 1 columna en móvil
   - 2 columnas en tablet
   - 3 columnas en desktop

2. **Drawer mobile-first** en lugar de Dialog pesado
   - Desliza desde abajo
   - Scroll interno
   - Tabs compactos

3. **Botón eliminar** con confirmación
   - Visible solo para Director/Owner
   - AlertDialog de confirmación
   - Feedback con toast
