# Panel de grupo para indicadores técnicos y tácticos (Evaluación Mensual WL)

## Objetivo
En la pestaña "Grupo" de la Evaluación Mensual WL, agregar —además de la batería— una vista del % del grupo por indicador del mes (técnico y táctico), para detectar brechas colectivas y tomar acciones correctivas.

## Qué verá el entrenador
Debajo de "Batería del grupo", una nueva sección "Indicadores del mes — nivel del grupo" con una tarjeta por indicador (Ind. 1 y Ind. 2):

- Nombre del indicador y su dimensión (Técnico / Táctico), tomados de la configuración del mes.
- Distribución del grupo en niveles: barra apilada con % en Nivel 1, Nivel 2 y Nivel 3 (colores: rojo / dorado / verde), con conteos (ej. 3/10 en N1).
- % de consolidación del grupo: % de jugadores en Nivel 3 (nivel objetivo).
- Alerta correctiva: si menos del 50% del grupo alcanza Nivel 3, se muestra aviso: "El grupo no consolidó este indicador — repetir el foco el mes siguiente con otro ejercicio, no con más exigencia" (mismo criterio visual que la alerta de la batería).
- Si un mes no tiene indicadores configurados (ej. diciembre), la sección simplemente no aparece.

## Cambios técnicos

1. **Nuevo componente** `src/components/wl/WLGroupIndicatorsPanel.tsx`
   - Props: `monthConfig: WLMonthlyIndicator | null`, `evaluations: WLMonthlyEvaluation[]`.
   - Para cada indicador con nombre configurado: calcula distribución de `nivel_ind1` / `nivel_ind2` (1, 2, 3) sobre las evaluaciones que tengan ese nivel capturado.
   - Barra apilada N1/N2/N3 + badge con % en Nivel 3 + alerta si < 50%.

2. **`src/components/wl/WLMonthlyEvaluationModule.tsx`**
   - En la pestaña "Grupo", renderizar `WLGroupIndicatorsPanel` arriba de `WLGroupBatteryPanel`, pasando `monthConfig` y `evaluations` (ya disponibles vía `useWLMonthly`).

Sin cambios en base de datos ni en captura: solo se agrega la vista de grupo con datos que ya existen.

## Verificación
- Vista previa en móvil: pestaña Grupo de Estrellita, septiembre — se ven ambas tarjetas con distribución real y la alerta cuando aplique.
