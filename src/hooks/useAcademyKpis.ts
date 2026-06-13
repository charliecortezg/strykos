import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AcademyKpis {
  ingresos_mes: number;
  monto_pendiente: number;
  pct_cobranza: number;
  pct_asistencia_mes: number;
  jugadores_activos: number;
  jugadores_inactivos: number;
  mora_1_mes: number;
  mora_2_plus: number;
  nuevos_mes: number;
  bajas_mes: number;
  computed_at: string;
}

const EMPTY: AcademyKpis = {
  ingresos_mes: 0,
  monto_pendiente: 0,
  pct_cobranza: 0,
  pct_asistencia_mes: 0,
  jugadores_activos: 0,
  jugadores_inactivos: 0,
  mora_1_mes: 0,
  mora_2_plus: 0,
  nuevos_mes: 0,
  bajas_mes: 0,
  computed_at: '',
};

/**
 * Fuente ÚNICA de verdad para indicadores de la academia.
 * Llama al RPC get_academy_kpis(org_id) que centraliza definiciones canónicas.
 */
export function useAcademyKpis(orgId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['academy-kpis', orgId],
    queryFn: async (): Promise<AcademyKpis> => {
      if (!orgId) return EMPTY;
      const { data, error } = await supabase.rpc('get_academy_kpis' as any, {
        p_org_id: orgId,
      });
      if (error) throw error;
      return { ...EMPTY, ...(data as any) };
    },
    enabled: !!orgId,
    staleTime: 60_000,
  });

  return {
    kpis: query.data ?? EMPTY,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    // Regla canónica: "Sin atrasados" SOLO si no hay mora ni monto pendiente.
    sinAtrasados:
      (query.data?.mora_1_mes ?? 0) === 0 &&
      (query.data?.mora_2_plus ?? 0) === 0 &&
      (query.data?.monto_pendiente ?? 0) === 0,
  };
}
