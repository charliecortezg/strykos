

# Plan: Mejorar formulario de uniformes

## Cambios

### 1. Selector de tallas con medidas visibles
Reemplazar los grupos colapsables por un `<select>` dropdown nativo que muestre las medidas directamente en cada opción (como en la imagen de referencia):
- "Infantil corte recto: Talla 4 (Alto 41 cm, Ancho 34 cm)"
- "Masculino S (Alto 67 cm, Ancho 54 cm)"
- etc.

Más simple, menos fricción, medidas siempre visibles.

### 2. Colores STRYK
Cambiar la paleta del formulario de negro puro (#0A0A0A) + dorado (#C9A84C) a los colores oficiales STRYK:
- Fondo: Deep Navy (#0d1a33)
- Acentos: Gold (#d4a030)
- Cards/inputs: Navy más claro (#1a2a4a)
- Bordes: navy claro (#2a3a5a)

### 3. Sin autenticación
Ya está implementado así — la ruta `/uniforme/:token` es pública, la Edge Function tiene `verify_jwt = false`, y usa service role. No hay fricción de login. Sin cambios necesarios.

### 4. Información de pago visible en el formulario
Agregar una sección de datos bancarios **antes** del botón de enviar (no solo en la pantalla de confirmación), para que el padre vea a dónde transferir desde el inicio:
- Carlos Mario Cortez Gurrola
- Citibanamex
- 5256 7840 0306 7195

---

## Archivo a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/uniforms/UniformOrderPage.tsx` | Paleta STRYK, select nativo con medidas, sección de pago en formulario |

