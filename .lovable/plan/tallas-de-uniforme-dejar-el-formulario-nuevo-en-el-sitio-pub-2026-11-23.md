# Tallas de uniforme: dejar el formulario nuevo en el sitio publicado

## Qué está pasando
La captura muestra la lista vieja (solo "INFANTIL CORTE RECTO", "MASCULINO", "FEMENINO", que son encabezados y no se pueden elegir). La versión corregida ya está en el proyecto: muestra las 11 tallas como botones con ancho y largo en cm, y sí se pueden elegir. El sitio que usan los papás todavía tiene la versión vieja porque no se ha publicado.

## Pasos
1. Publicar el proyecto.
2. Revisar el sitio publicado en tamaño de celular: elegir jugador, una talla y un número, y comprobar que el botón de enviar se active (sin mandar un pedido real).
3. Si el sitio publicado sigue mostrando la lista vieja, cerrar la pestaña y abrirla de nuevo (o en incógnito) para que el celular no use la copia guardada.

## Detalle técnico
- El formulario ya usa botones por grupo desde `src/lib/uniform-sizes.ts`; no hace falta cambiar código.
- La verificación se hará con Playwright en https://strykos.lovable.app con pantalla de 384x683.
