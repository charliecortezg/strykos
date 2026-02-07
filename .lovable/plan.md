

# Agregar Botones de Redes Sociales al Footer

## Cambio

Actualizar el componente `FooterMinimal.tsx` para incluir iconos de Facebook e Instagram con enlaces a las cuentas oficiales de White Lions FC.

## Enlaces

| Red Social | URL |
|-----------|-----|
| Facebook | `https://www.facebook.com/share/1RfV3uK5BU/` |
| Instagram | `https://www.instagram.com/whitelions.fc?igsh=MWlzdHltbnloeHFqYQ==` |

## Diseno

El footer mantendrá su estructura actual de 3 columnas en pantallas grandes:
- **Izquierda**: Logo (ya existe)
- **Centro**: Iconos de redes sociales (nuevo)
- **Derecha**: Copyright (ya existe)

Los iconos usarán los iconos `Facebook` e `Instagram` de lucide-react con estilo `stryk-silver/50` y hover en `stryk-gold` para mantener la identidad visual Athletic Premium del landing.

## Detalles Técnicos

### Archivo a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/landing/FooterMinimal.tsx` | Agregar iconos de redes sociales con enlaces |

### Implementacion

- Importar iconos `Facebook` e `Instagram` de `lucide-react`
- Agregar una seccion central con los dos iconos como enlaces (`<a>` con `target="_blank"` y `rel="noopener noreferrer"`)
- Estilo: color base `text-stryk-silver/50`, hover `text-stryk-gold`, transicion suave
- Tamano de iconos: 20px para mantener proporcion con el footer minimalista

