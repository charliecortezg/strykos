

# Plan: Integrar Tab "Fichajes" en Todos los Dashboards

## Resumen

Agregar acceso consistente al módulo de Fichajes en los tres dashboards:
- **Administrativo**: Tab nuevo con historial completo + botón nuevo fichaje
- **Entrenador**: Tab nuevo "Fichajes" (4 tabs total) con historial limitado a sus categorías
- **Director Deportivo**: Tab nuevo "Fichajes" (8 tabs) con historial completo

---

## Cambios por Dashboard

### 1. AdministrativoDashboard.tsx

**Estado actual:** 4 tabs (Finanzas, Jugadores, Planes, Cobranza), sin acceso a fichajes

**Cambios:**

```tsx
// Agregar imports
import { useNavigate } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { IntakeHistory } from '@/components/fichajes/IntakeHistory';

// Agregar hook
const navigate = useNavigate();

// Cambiar grid a 5 columnas
<TabsList className="mb-6 w-full sm:w-auto grid grid-cols-5 sm:inline-flex">

// Agregar tab después de "configuracion"
<TabsTrigger value="fichajes" className="gap-2">
  <UserPlus className="w-4 h-4" />
  <span className="hidden sm:inline">Fichajes</span>
</TabsTrigger>

// Agregar TabsContent
<TabsContent value="fichajes">
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Historial de Fichajes</h2>
        <p className="text-sm text-muted-foreground">
          Registro de inscripciones y evidencias de pago
        </p>
      </div>
      <Button onClick={() => navigate('/fichajes/terminal')} className="gap-2">
        <UserPlus className="w-4 h-4" />
        <span className="hidden sm:inline">Nuevo Fichaje</span>
      </Button>
    </div>
    <IntakeHistory />
  </div>
</TabsContent>
```

---

### 2. EntrenadorDashboard.tsx

**Estado actual:** 3 tabs (Asistencia, Partidos, Jugadores) + botón en header

**Cambios:**

```tsx
// Agregar import (ya tiene useNavigate y UserPlus)
import { IntakeHistory } from '@/components/fichajes/IntakeHistory';

// Cambiar grid a 4 columnas
<TabsList className="w-full grid grid-cols-4 mb-4 h-12">

// Agregar tab después de "jugadores"
<TabsTrigger value="fichajes" className="gap-1.5 text-xs sm:text-sm">
  <UserPlus className="w-4 h-4" />
  <span className="hidden sm:inline">Fichajes</span>
</TabsTrigger>

// Agregar TabsContent
<TabsContent value="fichajes" className="mt-0">
  <div className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-lg font-display font-semibold">Mis Fichajes</h2>
      <Button onClick={() => navigate('/fichajes/terminal')} size="sm" className="gap-1.5">
        <UserPlus className="w-4 h-4" />
        <span className="hidden sm:inline">Nuevo</span>
      </Button>
    </div>
    <IntakeHistory />
  </div>
</TabsContent>
```

**Nota:** El botón de header se mantiene para acceso rápido.

---

### 3. DirectorDeportivoDashboard.tsx

**Estado actual:** 7 tabs + botones en header (sin tab integrado)

**Cambios:**

```tsx
// Agregar import
import { IntakeHistory } from '@/components/fichajes/IntakeHistory';

// Agregar tab en TabsList (después de "reportes")
<TabsTrigger value="fichajes" className="gap-2">
  <UserPlus className="w-4 h-4" />
  Fichajes
</TabsTrigger>

// Agregar TabsContent
<TabsContent value="fichajes">
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Historial de Fichajes</h2>
        <p className="text-sm text-muted-foreground">
          Todos los fichajes de la academia
        </p>
      </div>
      <Button onClick={() => navigate('/fichajes/terminal')} className="gap-2">
        <UserPlus className="w-4 h-4" />
        Nuevo Fichaje
      </Button>
    </div>
    <IntakeHistory />
  </div>
</TabsContent>
```

**Nota:** Los botones del header se pueden mantener o remover (ya que el tab ofrece la misma funcionalidad).

---

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/dashboard/AdministrativoDashboard.tsx` | +imports, +navigate, +tab Fichajes, grid 5 cols |
| `src/pages/dashboard/EntrenadorDashboard.tsx` | +import IntakeHistory, +tab Fichajes, grid 4 cols |
| `src/pages/dashboard/DirectorDeportivoDashboard.tsx` | +import IntakeHistory, +tab Fichajes |

---

## Resultado Visual

### Administrativo (5 tabs)
```
[ $ Finanzas ] [ Jugadores ] [ Planes ] [ Cobranza ] [ Fichajes ]
```

### Entrenador (4 tabs)
```
[ Lista ] [ Partidos ] [ Jugadores ] [ Fichajes ]
```

### Director Deportivo (8 tabs)
```
[ Jugadores ] [ Categorías ] [ Sedes ] [ Finanzas ] [ Partidos ] [ Entrenadores ] [ Reportes ] [ Fichajes ]
```

---

## Consideraciones Mobile

- En móvil, los tabs de Administrativo usan iconos sin texto (grid 5 cols)
- En móvil, los tabs de Entrenador mantienen diseño compacto (grid 4 cols, 12px altura)
- Director Deportivo ya usa `flex-wrap` que funciona bien en móvil

---

## Comportamiento RLS

El componente `IntakeHistory` ya respeta RLS:
- **Entrenador**: Ve solo fichajes que él creó
- **Administrativo/Director**: Ven todos los fichajes de la organización

No se requieren cambios adicionales de permisos.

