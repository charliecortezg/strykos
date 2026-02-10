

# Fix: Warning de Tooltip ref en PlayerEvaluationSheet

## Problema

En `src/components/evaluations/PlayerEvaluationSheet.tsx` (linea ~80), el componente `TooltipTrigger` usa `asChild` y envuelve directamente un `<Info>` de lucide-react. Lucide icons no soportan `forwardRef` de forma compatible con Radix, lo que genera un warning en consola.

Codigo actual:
```tsx
<TooltipTrigger asChild>
  <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
</TooltipTrigger>
```

## Solucion

Envolver el icono en un `<span>` nativo que recibe el ref correctamente:

```tsx
<TooltipTrigger asChild>
  <span className="inline-flex cursor-help">
    <Info className="w-3.5 h-3.5 text-muted-foreground" />
  </span>
</TooltipTrigger>
```

## Archivo a modificar

| Archivo | Cambio |
|---------|--------|
| `src/components/evaluations/PlayerEvaluationSheet.tsx` | Envolver `<Info>` en `<span>` dentro de `TooltipTrigger` |

Cambio de 2 lineas. Sin impacto funcional ni visual.
