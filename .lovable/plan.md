

# Plan: 3 Cambios en Terminal de Fichaje y Email

## Cambio 1: Email - Reemplazar "Guia para Padres" con el PDF adjunto

La imagen subida (`guia_padres_demo.jpg`) se copiara a `public/images/guia-padres.png` (reemplazando el archivo existente). El boton en el email ya apunta a `https://strykos.lovable.app/images/guia-padres.png`, asi que solo necesitamos asegurar que la imagen correcta este ahi.

**Archivo:** `public/images/guia-padres.png` - Reemplazar con la imagen subida

## Cambio 2: Email - Reemplazar seccion de Nutricion con Portal Familiar

En `supabase/functions/send-intake-receipt/index.ts`, reemplazar el bloque "Guia de Nutricion" (lineas 332-342) por un boton que lleve al Portal Familiar de STRYK:

- Texto: "Accede al portal para ver el progreso y estadisticas de tu jugador"
- Boton: "VER PORTAL FAMILIAR"
- URL: `https://strykos.lovable.app/portal/login`
- Estilo: degradado azul (consistente con branding STRYK)

## Cambio 3: Boton Back - Navegar al dashboard correcto

En `src/pages/fichajes/TerminalPage.tsx`, el boton back usa `navigate(-1)` que puede fallar si no hay historial. Se cambiara para navegar al dashboard del rol activo del usuario usando la funcion `getDashboardPath` de `src/lib/auth-routing.ts`.

Ademas, se usara el contexto de auth para obtener `activeRole` y `roles` y construir la ruta correcta.

---

## Archivos a modificar

| Archivo | Cambio |
|---------|--------|
| `public/images/guia-padres.png` | Reemplazar con imagen subida |
| `supabase/functions/send-intake-receipt/index.ts` | Reemplazar seccion nutricion por boton Portal Familiar |
| `src/pages/fichajes/TerminalPage.tsx` | Back button navega al dashboard del rol activo |

## Detalles tecnicos

### Email (lineas 332-342 de send-intake-receipt)
Reemplazar:
```
DESCARGAR GUÍA DE NUTRICIÓN → href="#"
```
Por:
```
VER PORTAL FAMILIAR → href="https://strykos.lovable.app/portal/login"
```

### Back button (TerminalPage.tsx)
```typescript
// Antes
navigate(-1);

// Despues
import { getDashboardPath } from '@/lib/auth-routing';
const { activeRole, roles } = useAuth();
navigate(getDashboardPath(activeRole, roles));
```

