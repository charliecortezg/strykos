
# Plan: Corregir Overflow en Modales/Drawers de Partidos

## Problema Diagnosticado

Analizando las imágenes y el código, identifico **dos problemas de overflow horizontal**:

### 1. LoadResultsModal.tsx ("Cargar Resultado")
- La barra de scroll horizontal visible en la imagen se debe a:
  - `TabsList` en línea 202 tiene `mx-4` (margen horizontal) pero está fuera del contenedor con padding
  - El contenedor scrollable (`div className="flex-1 overflow-y-auto"`) no tiene `overflow-x-hidden`
  - Los tabs flotan fuera del área contenida

### 2. MatchDetailDrawer.tsx ("Detalle del Partido")  
- Similar problema potencial con el `ScrollArea` y contenido interno

---

## Solución Propuesta

### Cambios en LoadResultsModal.tsx

**Línea 200-202** — Mover padding al contenedor externo y eliminar margen en TabsList:

```tsx
// ANTES
<div className="flex-1 overflow-y-auto">
  <Tabs defaultValue="result" className="w-full">
    <TabsList className="w-full grid grid-cols-3 mx-4 mt-3">

// DESPUÉS  
<div className="flex-1 overflow-y-auto overflow-x-hidden px-4">
  <Tabs defaultValue="result" className="w-full">
    <TabsList className="w-full grid grid-cols-3 mt-3">
```

**Línea 217, 320, 424** — Remover padding horizontal duplicado de TabsContent:

```tsx
// ANTES
<TabsContent value="result" className="px-4 py-4 space-y-4">

// DESPUÉS
<TabsContent value="result" className="py-4 space-y-4">
```

### Cambios en MatchDetailDrawer.tsx

**Línea 146** — Agregar overflow-x-hidden al ScrollArea container:

```tsx
// ANTES
<ScrollArea className="flex-1 px-4">

// DESPUÉS
<ScrollArea className="flex-1 px-4 overflow-x-hidden">
```

### Cambios en drawer.tsx (Componente base)

**Línea 34** — Agregar `overflow-hidden` al DrawerContent para prevenir overflow horizontal a nivel global:

```tsx
// ANTES
className={cn(
  "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background",
  className,
)}

// DESPUÉS
className={cn(
  "fixed inset-x-0 bottom-0 z-50 mt-24 flex h-auto flex-col rounded-t-[10px] border bg-background overflow-hidden",
  className,
)}
```

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/ui/drawer.tsx` | Agregar `overflow-hidden` al contenedor base |
| `src/components/matches/LoadResultsModal.tsx` | Reorganizar padding, eliminar márgenes, agregar `overflow-x-hidden` |
| `src/components/matches/MatchDetailDrawer.tsx` | Agregar `overflow-x-hidden` al ScrollArea |

---

## Resultado Esperado

- Sin scroll horizontal en ningún drawer
- Layout contenido correctamente dentro del viewport móvil
- Consistencia visual en ambos modales
- Sin romper funcionalidad existente

---

## Detalles Técnicos

El problema raíz es que Vaul Drawer (el componente base) no previene overflow horizontal por defecto, y los márgenes internos (`mx-4`) empujan el contenido fuera del contenedor cuando se combinan con elementos de ancho completo (`w-full`).

La solución sigue el patrón STRYK de "scroll-safe modal standard" mencionado en la memoria del proyecto: contenedores con max-height, flex bodies scrollables, y sin layout shifts.
