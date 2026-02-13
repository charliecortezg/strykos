

# Plan: Excluir Becados del Calculo de Cobranza (Paridad Total)

## Problema

Los jugadores becados no deben afectar el porcentaje de cobranza en ningun panel, ya que no se espera que paguen. Actualmente:

- **Fundador (`useFounderKPIs.ts`)**: Usa formula de dinero (revenue / expected), lo cual ya excluye becados del denominador pero produce un % diferente al admin.
- **Administrativo (`PaymentsDashboard.tsx`)**: Usa formula de personas pero **incluye becados** en el conteo, inflando el denominador.
- **Reporte Mensual (`monthly-report/index.ts`)**: Ya excluye becados correctamente (`is_scholarship: false`).

## Solucion

Unificar ambos hooks para usar la misma formula basada en jugadores, excluyendo becados:

```
% Cobranza = jugadores al_dia (no becados) / total jugadores activos (no becados) * 100
```

## Cambios

### 1. `src/hooks/useFounderKPIs.ts` (lineas 146-158)

Reemplazar el calculo revenue-based por headcount-based:

**Antes:**
```
const collectionRate = expectedRevenue > 0 
  ? Math.round((monthlyRevenue / expectedRevenue) * 100) 
  : 0;
```

**Despues:**
```
const collectionRate = nonScholarshipPlayers.length > 0 
  ? Math.round((upToDatePlayers.length / nonScholarshipPlayers.length) * 100) 
  : 0;
```

`nonScholarshipPlayers` y `upToDatePlayers` ya existen en el codigo (lineas 146-147), solo se cambia la formula final.

### 2. `src/components/payments/PaymentsDashboard.tsx` (lineas 163-167)

Filtrar becados antes de calcular:

**Antes:**
```
const playersAlDia = relevantPlayers.filter(p => p.payment_status === 'al_dia').length;
const pendingCount = relevantPlayers.filter(p => p.payment_status !== 'al_dia').length;
const collectionRate = relevantPlayers.length > 0 
  ? Math.round((playersAlDia / relevantPlayers.length) * 100) 
  : 0;
```

**Despues:**
```
const billablePlayers = relevantPlayers.filter(p => !p.is_scholarship);
const playersAlDia = billablePlayers.filter(p => p.payment_status === 'al_dia').length;
const pendingCount = billablePlayers.filter(p => p.payment_status !== 'al_dia').length;
const collectionRate = billablePlayers.length > 0 
  ? Math.round((playersAlDia / billablePlayers.length) * 100) 
  : 0;
```

### Resultado esperado

Ambos paneles mostraran el mismo porcentaje de cobranza, calculado solo sobre jugadores que deben pagar.

### Archivos modificados
- `src/hooks/useFounderKPIs.ts`
- `src/components/payments/PaymentsDashboard.tsx`

