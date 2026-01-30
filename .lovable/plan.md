

# Plan: Integrar Fichajes en AdministrativoDashboard

## Problema Identificado

El Dashboard Administrativo (`/dashboard/administrativo`) no tiene ningún enlace ni tab para acceder al módulo de Fichajes, a pesar de que:
1. El rol `administrativo` tiene permisos para acceder a `/fichajes/terminal` y `/fichajes/historial` (configurado en App.tsx)
2. Los otros dashboards (OrgOwner, Director, Entrenador) sí tienen acceso integrado

## Solución

Agregar un **tab "Fichajes"** al Dashboard Administrativo con dos sub-opciones:
- Botón para ir a la Terminal de Fichaje
- Historial de Fichajes integrado directamente (igual que Director)

## Cambios Técnicos

### Archivo: `src/pages/dashboard/AdministrativoDashboard.tsx`

**1. Agregar imports necesarios:**
```tsx
import { UserPlus, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { IntakeHistory } from '@/components/fichajes/IntakeHistory';
```

**2. Agregar hook de navegación:**
```tsx
const navigate = useNavigate();
```

**3. Agregar nuevo tab "Fichajes" en el TabsList:**
```tsx
<TabsTrigger value="fichajes" className="gap-2">
  <UserPlus className="w-4 h-4" />
  <span className="hidden sm:inline">Fichajes</span>
</TabsTrigger>
```

**4. Agregar contenido del tab con header y historial:**
```tsx
<TabsContent value="fichajes">
  <div className="space-y-4">
    {/* Header con botón de nuevo fichaje */}
    <div className="flex items-center justify-between">
      <div>
        <h2 className="text-lg font-semibold">Historial de Fichajes</h2>
        <p className="text-sm text-muted-foreground">
          Registro de inscripciones y evidencias de pago
        </p>
      </div>
      <Button 
        onClick={() => navigate('/fichajes/terminal')}
        className="gap-2"
      >
        <UserPlus className="w-4 h-4" />
        <span className="hidden sm:inline">Nuevo Fichaje</span>
      </Button>
    </div>
    {/* Componente de historial */}
    <IntakeHistory />
  </div>
</TabsContent>
```

**5. Actualizar TabsList grid a 5 columnas:**
```tsx
<TabsList className="mb-6 w-full sm:w-auto grid grid-cols-5 sm:inline-flex">
```

## Resultado Visual

```text
┌─────────────────────────────────────────────────────────────┐
│  Panel Administrativo                                       │
│  Bienvenido, [nombre]. Control financiero de [academia].   │
├─────────────────────────────────────────────────────────────┤
│  [ $ Finanzas ] [ Jugadores ] [ Planes ] [ Cobranza ] [ Fichajes ] │
├─────────────────────────────────────────────────────────────┤
│  Historial de Fichajes          [ + Nuevo Fichaje ]        │
│  Registro de inscripciones y evidencias de pago            │
│                                                              │
│  🔍 Buscar por nombre o teléfono...    [⚙ Filtros] [↻]     │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Juan Pérez                        ✓ Completado          ││
│  │ 👤 María García  📱 555-1234                            ││
│  │ 📅 24 Ene, 10:30  💳 Efectivo                           ││
│  │                                   $1,350.00  PROMO   >  ││
│  └─────────────────────────────────────────────────────────┘│
│  ... más cards ...                                          │
└─────────────────────────────────────────────────────────────┘
```

## Comportamiento Esperado

| Acción | Resultado |
|--------|-----------|
| Click en tab "Fichajes" | Muestra historial de fichajes con filtros |
| Click en "Nuevo Fichaje" | Navega a `/fichajes/terminal` |
| Click en card de fichaje | Abre `IntakeDetailDrawer` con detalles |
| Filtrar/buscar | Actualiza lista en tiempo real |
| Click en "Ver evidencia" | Abre imagen de comprobante |
| Click en "Reenviar recibo" | Reintenta envío de email |

## Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `src/pages/dashboard/AdministrativoDashboard.tsx` | Agregar tab Fichajes + IntakeHistory |

## Notas de Implementación

- El grid pasa de 4 a 5 columnas en móvil, lo cual puede quedar apretado - considerar usar scroll horizontal o iconos solo en móvil extremo
- `IntakeHistory` ya incluye `IntakeDetailDrawer` internamente, no hay que agregarlo por separado
- Los permisos RLS ya están configurados para que `administrativo` vea todos los fichajes de su organización

