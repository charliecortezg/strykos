# Actualizar tallas y medidas del pedido de uniformes

## Qué cambia para los papás
En el paso "4. Talla" del pedido, la lista de tallas se reemplaza por la tabla nueva (Ancho y Largo en cm):

INFANTIL
- 2-4: Ancho 29 · Largo 44
- 6-8: Ancho 31 · Largo 52
- 10-12: Ancho 33 · Largo 57
- 14-16: Ancho 36 · Largo 60

ADULTO
- S/36: Ancho 50 · Largo 70
- M/38: Ancho 52 · Largo 72
- L/40: Ancho 57 · Largo 75
- XL/42: Ancho 57 · Largo 77
- XXL/44: Ancho 58 · Largo 80
- XXXL/46: Ancho 62 · Largo 80
- 4XL: Ancho 67 · Largo 82

- Se quitan las tallas sueltas viejas (4, 6, 8... 16), el grupo "Masculino" y el grupo "Femenino", ya que tu tabla no los incluye.
- El texto cambia de "Alto" a "Largo", con Ancho primero, como en tu tabla.
- Los pedidos que ya se hicieron conservan la talla que eligieron; no se modifica nada guardado.

## Detalles técnicos
- `src/pages/uniforms/UniformOrderPage.tsx`: reemplazar `SIZE_OPTIONS` (grupos INFANTIL / ADULTO, valores `2-4`, `6-8`, `10-12`, `14-16`, `S`, `M`, `L`, `XL`, `XXL`, `XXXL`, `4XL`; campos `ancho`, `largo`) y actualizar las etiquetas del select y el resumen.
- `supabase/functions/uniform-campaign/index.ts`: actualizar `VALID_SIZES` con los mismos valores y volver a desplegar la función.
- Hace falta publicar para que los papás lo vean.
