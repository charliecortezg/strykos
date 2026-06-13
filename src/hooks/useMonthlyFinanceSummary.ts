import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAcademyKpis } from '@/hooks/useAcademyKpis';

/**
 * Resumen financiero del mes en curso para la academia.
 *
 * Fuente única:
 *  - `ingresos`: viene del RPC `get_academy_kpis` (mismo valor que el resto
 *     de la app — NO recalcular para evitar desfases de corte).
 *  - `gastos`: suma de `expenses.amount` con `expense_date` dentro del MISMO
 *     mes calendario en curso, alineado con la definición canónica del RPC
 *     (mes calendario natural en zona horaria del cliente).
 *
 * `delta = ingresos − gastos`. Nunca lo llames "utilidad neta": el dueño
 * no registra todos sus gastos en STRYK; sería engañoso.
 */
export function useMonthlyFinanceSummary(orgId: string | null | undefined) {
  const { kpis, isLoading: kpisLoading } = useAcademyKpis(orgId);

  const { data: gastos = 0, isLoading: expLoading } = useQuery({
    queryKey: ['monthly-expenses-sum', orgId],
    queryFn: async (): Promise<number> => {
      if (!orgId) return 0;
      const now = new Date();
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .slice(0, 10);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .slice(0, 10);
      const { data, error } = await supabase
        .from('expenses')
        .select('amount')
        .eq('organization_id', orgId)
        .gte('expense_date', first)
        .lte('expense_date', last);
      if (error) throw error;
      return (data || []).reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  const ingresos = kpis.ingresos_mes;
  const delta = ingresos - gastos;

  return {
    ingresos,
    gastos,
    delta,
    isLoading: kpisLoading || expLoading,
  };
}
