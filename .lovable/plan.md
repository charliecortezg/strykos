

# Plan: Usar dominio publicado para links de uniformes

## Problema

El link generado con `window.location.origin` apunta al preview URL (`0846f2f6-...lovableproject.com`), que pasa por el auth-bridge de Lovable y pide cuenta. Los padres no pueden acceder.

## Solución

Reemplazar `window.location.origin` por el dominio publicado `https://strykos.lovable.app` en los 3 archivos que generan el link público:

| Archivo | Cambio |
|---|---|
| `src/components/uniforms/CreateCampaignModal.tsx` | Usar `https://strykos.lovable.app` en `publicUrl` |
| `src/components/uniforms/CampaignDetail.tsx` | Igual |
| `src/components/uniforms/CampaignsList.tsx` | Igual |

Extraeré la URL base a una constante compartida para mantenerlo DRY. Si en el futuro conectas un dominio custom, solo se cambia en un lugar.

