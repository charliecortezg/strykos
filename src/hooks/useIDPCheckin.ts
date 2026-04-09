import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface IDPCheckin {
  id: string;
  organization_id: string;
  idp_cycle_id: string;
  player_id: string;
  check_in_number: number;
  check_in_date: string;
  evaluation_event_id: string | null;
  scores_snapshot: Record<string, number>;
  dimension_changes: Record<string, {
    from: number;
    to: number;
    changed: boolean;
    initial_score: number;
    current_score: number;
  }>;
  coach_message: string | null;
  exercises_updated: boolean;
  created_at: string;
}

interface PerformCheckinParams {
  organization_id: string;
  player_id: string;
  idp_cycle_id: string;
  evaluation_event_id: string;
  check_in_number: number;
}

export function useIDPCheckin(idpCycleId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: checkins = [], isLoading } = useQuery({
    queryKey: ['idp-checkins', idpCycleId],
    queryFn: async (): Promise<IDPCheckin[]> => {
      if (!idpCycleId) return [];
      const { data, error } = await supabase
        .from('idp_monthly_checkins')
        .select('*')
        .eq('idp_cycle_id', idpCycleId)
        .order('check_in_number', { ascending: true });
      if (error) { console.error('Checkins fetch error:', error); return []; }
      return (data || []) as unknown as IDPCheckin[];
    },
    enabled: !!idpCycleId,
  });

  const performCheckin = useMutation({
    mutationFn: async (params: PerformCheckinParams) => {
      const { data, error } = await supabase.functions.invoke('process-idp', {
        body: {
          mode: 'checkin',
          ...params,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['idp-checkins'] });
      queryClient.invalidateQueries({ queryKey: ['idp-cycle'] });
      toast({
        title: `Check-in #${data.check_in_number} completado`,
        description: data.improved_dimensions?.length > 0
          ? `¡Mejoras en ${data.improved_dimensions.length} dimensión(es)!`
          : 'Progreso registrado correctamente.',
      });
    },
    onError: (err: any) => {
      toast({ title: 'Error en check-in', description: err.message, variant: 'destructive' });
    },
  });

  return {
    checkins,
    isLoading,
    performCheckin,
    isPerformingCheckin: performCheckin.isPending,
  };
}
