import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import type { StatKey, EvaluationRubric } from '@/types/evaluations';

export interface EvaluationHistoryItem {
  id: string;
  period: string;
  overall_score: number | null;
  previous_overall: number | null;
  age_group: string;
  closed_at: string | null;
  scores: Record<StatKey, number>;
  comments: string[];
  rubrics: EvaluationRubric[];
}

export function usePlayerEvaluationHistory(playerId: string | null) {
  const { organizationId, linkedPlayers } = usePortalAuth();
  const isLinked = linkedPlayers.some(p => p.id === playerId);

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: ['player-evaluation-history', playerId, organizationId],
    queryFn: async (): Promise<EvaluationHistoryItem[]> => {
      if (!playerId || !organizationId) return [];

      const { data: evals, error } = await supabase
        .from('evaluations')
        .select('id, period, overall_score, previous_overall, age_group, closed_at')
        .eq('organization_id', organizationId)
        .eq('player_id', playerId)
        .eq('status', 'closed')
        .order('period', { ascending: false });

      if (error || !evals || evals.length === 0) return [];

      const evalIds = evals.map(e => e.id);
      const ageGroups = [...new Set(evals.map(e => e.age_group))];

      const [scoresRes, commentsRes, rubricsRes] = await Promise.all([
        supabase
          .from('evaluation_scores')
          .select('evaluation_id, stat_key, score')
          .in('evaluation_id', evalIds),
        supabase
          .from('evaluation_comments')
          .select('evaluation_id, comment')
          .in('evaluation_id', evalIds),
        supabase
          .from('evaluation_rubrics')
          .select('id, age_group, stat_key, band_min, band_max, bullets')
          .in('age_group', ageGroups),
      ]);

      return evals.map(ev => {
        const scores = {} as Record<StatKey, number>;
        scoresRes.data
          ?.filter(s => s.evaluation_id === ev.id)
          .forEach(s => { scores[s.stat_key as StatKey] = s.score; });

        const comments = (commentsRes.data || [])
          .filter(c => c.evaluation_id === ev.id)
          .map(c => c.comment);

        const rubrics: EvaluationRubric[] = (rubricsRes.data || [])
          .filter(r => {
            if (r.age_group !== ev.age_group) return false;
            const score = scores[r.stat_key as StatKey];
            return score !== undefined && score >= r.band_min && score <= r.band_max;
          })
          .map(r => ({
            id: r.id,
            age_group: r.age_group,
            stat_key: r.stat_key as StatKey,
            band_min: r.band_min,
            band_max: r.band_max,
            bullets: (r.bullets as unknown as string[]) || [],
          }));

        return { ...ev, scores, comments, rubrics } as EvaluationHistoryItem;
      });
    },
    enabled: !!playerId && !!organizationId && isLinked,
  });

  return { evaluations, isLoading };
}
