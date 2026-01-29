
# Plan: Resolver Módulo de Partidos (RLS + UI/UX)

## Diagnóstico Confirmado

He analizado el código y la base de datos. Hay **3 problemas principales**:

### Problema 1: Entrenadores no pueden registrar resultados
Las políticas RLS actuales solo permiten a `org_owner` y `director_deportivo` hacer UPDATE en:
- Tabla `matches` 
- Tabla `match_players`

**El entrenador puede crear partidos, pero NO puede actualizarlos después** (el flujo de "Cargar Resultado" falla silenciosamente).

### Problema 2: Director no puede eliminar partidos
No existe ninguna política DELETE para las tablas `matches` ni `match_players`.

Las tablas hijas (`match_players`, `match_media`) ya tienen CASCADE configurado, así que al eliminar un match se eliminarán automáticamente los registros relacionados.

### Problema 3: UI/UX deficiente
- La tabla de historial tiene scroll horizontal (molesto en móvil y desktop)
- El modal de detalle es un Dialog pesado, no mobile-friendly
- No hay acceso rápido a eliminar desde la interfaz

---

## Solución Propuesta

### Fase 1: Base de Datos (RLS)

**1.1 Permitir a Entrenadores actualizar SUS partidos y estadísticas**

```sql
-- Política UPDATE para matches: Entrenador puede actualizar 
-- partidos de SUS categorías
CREATE POLICY "Trainers can update own matches"
ON matches FOR UPDATE TO authenticated
USING (
  organization_id = get_current_org_id() 
  AND has_org_role('entrenador') 
  AND is_category_trainer(category_id)
)
WITH CHECK (
  organization_id = get_current_org_id() 
  AND has_org_role('entrenador') 
  AND is_category_trainer(category_id)
);

-- Política UPDATE para match_players: Entrenador puede actualizar
CREATE POLICY "Trainers can update match players"
ON match_players FOR UPDATE TO authenticated
USING (
  organization_id = get_current_org_id() 
  AND has_org_role('entrenador')
)
WITH CHECK (
  organization_id = get_current_org_id() 
  AND has_org_role('entrenador')
);
```

**1.2 Permitir a Director/Owner eliminar partidos**

```sql
-- DELETE para matches
CREATE POLICY "Directors and owners can delete matches"
ON matches FOR DELETE TO authenticated
USING (
  organization_id = get_current_org_id() 
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
);

-- DELETE para match_players (por consistencia, aunque CASCADE lo maneja)
CREATE POLICY "Directors and owners can delete match players"
ON match_players FOR DELETE TO authenticated
USING (
  organization_id = get_current_org_id() 
  AND (has_org_role('org_owner') OR has_org_role('director_deportivo'))
);
```

---

### Fase 2: Backend (Hook de eliminación)

**2.1 Agregar función deleteMatch en useMatches.ts**

```typescript
const deleteMatch = useMutation({
  mutationFn: async (matchId: string) => {
    const { error } = await supabase
      .from('matches')
      .delete()
      .eq('id', matchId);
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['matches'] });
    toast.success('Partido eliminado correctamente');
  },
  onError: () => {
    toast.error('Error al eliminar el partido');
  },
});
```

---

### Fase 3: UI/UX - Rediseño Completo

**3.1 Reemplazar tabla horizontal por cards responsivas**

En lugar de una tabla con 9 columnas + scroll, usar cards que muestren:
- Información esencial visible
- Detalles expandibles
- Acciones accesibles

**Diseño propuesto para MatchesTable → MatchesGrid:**

```text
┌────────────────────────────────────────────────┐
│ 🗓️ 24 Ene 2026  │  Liga  │  ✓ Terminado       │
│ vs Los Tigres                                  │
│ Cat. Sub-15 • Fútbol • Juan García            │
│ ─────────────────────────────────────────────  │
│ Resultado:  [  3  -  1  ]  🟢 Victoria         │
│ ─────────────────────────────────────────────  │
│ [ 👁 Ver ]  [ ✏️ Editar ]  [ 🗑 Eliminar ]      │
└────────────────────────────────────────────────┘
```

**3.2 Reemplazar Modal pesado por Drawer mobile-first**

El `MatchDetailModal` actual usa `<Dialog>` (modal centrado). Cambiar a `<Drawer>` igual que `LoadResultsModal` para consistencia y mejor UX móvil.

**3.3 Agregar botón de eliminar con confirmación**

Agregar acción "Eliminar partido" visible solo para Director/Owner con dialog de confirmación.

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| **supabase/migrations/** | Nueva migración para RLS (4 políticas) |
| `src/hooks/useMatches.ts` | Agregar `deleteMatch` mutation |
| `src/components/matches/MatchesTable.tsx` | Rediseñar a grid/cards responsive |
| `src/components/matches/MatchDetailModal.tsx` | Convertir a Drawer + agregar delete |
| `src/components/matches/MatchHistoryModule.tsx` | Pasar `canDelete` y `onDelete` |

---

## Comportamiento Esperado Post-Implementación

| Actor | Acción | Resultado |
|-------|--------|-----------|
| Entrenador | Crear partido | ✅ Funciona |
| Entrenador | Cargar resultado de SU partido | ✅ **Ahora funciona** |
| Director | Ver todos los partidos | ✅ Funciona |
| Director | Editar cualquier partido | ✅ Funciona |
| Director | Eliminar partido de prueba | ✅ **Ahora funciona** |
| Owner | Todo lo anterior | ✅ Funciona |

---

## Orden de Implementación

1. **Migración RLS** (crítico - desbloquea funcionalidad)
2. **Hook deleteMatch** (backend para eliminar)
3. **UI MatchesTable responsive** (mejor visualización)
4. **MatchDetailModal → Drawer + Delete** (acciones de director)

---

## Riesgos y Mitigaciones

| Riesgo | Mitigación |
|--------|------------|
| Entrenador edita partido de otra categoría | RLS usa `is_category_trainer(category_id)` |
| Eliminación accidental | Confirmación con AlertDialog |
| Datos huérfanos al eliminar | CASCADE ya configurado en FK |
