import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import type { StatKey, EvaluationRubric } from '@/types/evaluations';

export interface LastEvaluation {
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

      // Fetch scores, comments, and rubrics in parallel
      const [scoresRes, commentsRes, rubricsRes] = await Promise.all([
        supabase
          .from('evaluation_scores')
          .select('stat_key, score')
          .eq('evaluation_id', evaluation.id),
        supabase
          .from('evaluation_comments')
          .select('comment')
          .eq('evaluation_id', evaluation.id),
        supabase
          .from('evaluation_rubrics')
          .select('id, age_group, stat_key, band_min, band_max, bullets')
          .eq('age_group', evaluation.age_group),
      ]);

      const scores = {} as Record<StatKey, number>;
      scoresRes.data?.forEach(s => { scores[s.stat_key as StatKey] = s.score; });

      const comments = (commentsRes.data || []).map(c => c.comment);

      // Filter rubrics to match player's actual score bands
      const rubrics: EvaluationRubric[] = (rubricsRes.data || [])
        .filter(r => {
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

      return { ...evaluation, scores, comments, rubrics } as LastEvaluation;
    },
    enabled: !!playerId && !!organizationId && isLinked,
  });

  return { lastEvaluation, isLoading };
}
