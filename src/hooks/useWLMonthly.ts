import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { WLCategoryKey, WLMonthKey, WLMonthlyIndicator, WLBatteryItem, WLMonthlyEvaluation, WLMethodologyCategory } from '@/types/wl';

export function useHasWLMethodology() {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { data, isLoading } = useQuery({
    queryKey: ['wl_methodology', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('wl_methodology_categories')
        .select('*')
        .eq('org_id', orgId);
      if (error) throw error;
      return data as WLMethodologyCategory[];
    },
    enabled: !!orgId,
    staleTime: 10 * 60 * 1000,
  });
  return { wlCategories: data || [], hasWLMethodology: (data?.length || 0) > 0, isLoading };
}

export function useWLMonthly(categoryId: string | null, categoryKey: WLCategoryKey | null, monthKey: WLMonthKey, season: string) {
  const { organization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const { data: monthConfig, isLoading: loadingConfig } = useQuery({
    queryKey: ['wl_month_indicator', orgId, categoryKey, monthKey],
    queryFn: async () => {
      if (!orgId || !categoryKey) return null;
      const { data, error } = await supabase
        .from('wl_monthly_indicators')
        .select('*')
        .eq('org_id', orgId)
        .eq('category_key', categoryKey)
        .eq('month_key', monthKey)
        .maybeSingle();
      if (error) throw error;
      return data as WLMonthlyIndicator | null;
    },
    enabled: !!orgId && !!categoryKey,
  });

  const { data: batteryItems = [], isLoading: loadingBattery } = useQuery({
    queryKey: ['wl_battery_items', orgId, categoryKey],
    queryFn: async () => {
      if (!orgId || !categoryKey) return [];
      const { data, error } = await supabase
        .from('wl_battery_items')
        .select('*')
        .eq('org_id', orgId)
        .eq('category_key', categoryKey)
        .order('item_number');
      if (error) throw error;
      return data as WLBatteryItem[];
    },
    enabled: !!orgId && !!categoryKey,
    staleTime: 10 * 60 * 1000,
  });

  const { data: evaluations = [], isLoading: loadingEvals } = useQuery({
    queryKey: ['wl_monthly_evaluations', orgId, categoryId, monthKey, season],
    queryFn: async () => {
      if (!orgId || !categoryId) return [];
      const { data, error } = await supabase
        .from('wl_monthly_evaluations')
        .select('*')
        .eq('org_id', orgId)
        .eq('category_id', categoryId)
        .eq('month_key', monthKey)
        .eq('season', season);
      if (error) throw error;
      return data as WLMonthlyEvaluation[];
    },
    enabled: !!orgId && !!categoryId,
  });

  const saveEvaluation = useMutation({
    mutationFn: async (payload: {
      playerId: string;
      nivelInd1: 1 | 2 | 3 | null;
      nivelInd2: 1 | 2 | 3 | null;
      batteryResults: Record<string, boolean>;
      coachNote: string | null;
    }) => {
      if (!orgId || !categoryId || !categoryKey) throw new Error('Faltan datos de contexto');
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase.from('wl_monthly_evaluations').upsert(
        {
          org_id: orgId,
          category_id: categoryId,
          player_id: payload.playerId,
          category_key: categoryKey,
          month_key: monthKey,
          season,
          nivel_ind1: payload.nivelInd1,
          nivel_ind2: payload.nivelInd2,
          battery_results: payload.batteryResults,
          coach_note: payload.coachNote,
          recorded_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'org_id,player_id,month_key,season' }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wl_monthly_evaluations'] });
    },
    onError: (error) => {
      toast({ title: 'Error al guardar', description: (error as Error).message, variant: 'destructive' });
    },
  });

  return {
    monthConfig,
    batteryItems,
    evaluations,
    isLoading: loadingConfig || loadingBattery || loadingEvals,
    saveEvaluation,
  };
}
