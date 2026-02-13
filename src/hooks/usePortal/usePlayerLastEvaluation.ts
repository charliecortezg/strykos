import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import type { StatKey } from '@/types/evaluations';

export interface LastEvaluation {
  id: string;
  period: string;
  overall_score: number | null;
  previous_overall: number | null;
  age_group: string;
  closed_at: string | null;
  scores: Record<StatKey, number>;
}

export function usePlayerLastEvaluation(playerId: string | null) {
  const { organizationId, linkedPlayers } = usePortalAuth();
  const isLinked = linkedPlayers.some(p => p.id === playerId);

  const { data: lastEvaluation, isLoading } = useQuery({
    queryKey: ['player-last-evaluation', playerId, organizationId],
    queryFn: async (): Promise<LastEvaluation | null> => {
      if (!playerId || !organizationId) return null;

      const { data: evaluation, error } = await supabase
        .from('evaluations')
        .select('id, period, overall_score, previous_overall, age_group, closed_at')
        .eq('organization_id', organizationId)
        .eq('player_id', playerId)
        .eq('status', 'closed')
        .order('period', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !evaluation) return null;

      // Get scores
      const { data: scoresData } = await supabase
        .from('evaluation_scores')
        .select('stat_key, score')
        .eq('evaluation_id', evaluation.id);

      const scores = {} as Record<StatKey, number>;
      scoresData?.forEach(s => { scores[s.stat_key as StatKey] = s.score; });

      return { ...evaluation, scores } as LastEvaluation;
    },
    enabled: !!playerId && !!organizationId && isLinked,
  });

  return { lastEvaluation, isLoading };
}
