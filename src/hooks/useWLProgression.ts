import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { WLCategoryKey, WLMonthlyEvaluation, WLMonthlyIndicator } from '@/types/wl';

/** All evaluations of one player in a season (for the timeline). */
export function useWLPlayerSeason(playerId: string | null, season: string) {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { data = [], isLoading } = useQuery({
    queryKey: ['wl_player_season', orgId, playerId, season],
    queryFn: async () => {
      if (!orgId || !playerId) return [];
      const { data, error } = await supabase
        .from('wl_monthly_evaluations')
        .select('*')
        .eq('org_id', orgId)
        .eq('player_id', playerId)
        .eq('season', season);
      if (error) throw error;
      return data as WLMonthlyEvaluation[];
    },
    enabled: !!orgId && !!playerId,
  });
  return { seasonEvals: data, isLoading };
}

/** All month configs of a category (to resolve indicator names + family phrases per month). */
export function useWLCategoryIndicators(categoryKey: WLCategoryKey | null) {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const { data = [], isLoading } = useQuery({
    queryKey: ['wl_category_indicators', orgId, categoryKey],
    queryFn: async () => {
      if (!orgId || !categoryKey) return [];
      const { data, error } = await supabase
        .from('wl_monthly_indicators')
        .select('*')
        .eq('org_id', orgId)
        .eq('category_key', categoryKey)
        .order('month_order');
      if (error) throw error;
      return data as WLMonthlyIndicator[];
    },
    enabled: !!orgId && !!categoryKey,
    staleTime: 10 * 60 * 1000,
  });
  return { monthConfigs: data, isLoading };
}

/** Resolve the family phrase for a given month config + indicator slot + nivel. */
export function wlFamilyPhrase(cfg: WLMonthlyIndicator | undefined, slot: 1 | 2, nivel: 1 | 2 | 3 | null): string | null {
  if (!cfg || !nivel) return null;
  const key = `ind${slot}_frase${nivel}` as keyof WLMonthlyIndicator;
  return (cfg[key] as string) || null;
}
