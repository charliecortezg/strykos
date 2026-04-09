import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_WEIGHTS, WL_DEFAULT_WEIGHTS, type EvaluationWeights } from '@/types/evaluations';

export function useEvaluationWeights() {
  const { organization } = useAuth();
  const orgId = organization?.id;

  const { data: weights = [], isLoading } = useQuery({
    queryKey: ['evaluation_weights', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('evaluation_weights')
        .select('*')
        .eq('organization_id', orgId);
      if (error) throw error;
      return data as EvaluationWeights[];
    },
    enabled: !!orgId,
  });

  const getWeightsForAgeGroup = (ageGroup: string): Record<string, number> => {
    const found = weights.find(w => w.age_group === ageGroup);
    if (found?.weights) return found.weights;
    // Fallback: try legacy age-group defaults, then WL defaults
    return DEFAULT_WEIGHTS[ageGroup] || WL_DEFAULT_WEIGHTS['default'] || DEFAULT_WEIGHTS['8-9'];
  };

  const getAllWeightsMap = (): Record<string, Record<string, number>> => {
    const map: Record<string, Record<string, number>> = {};
    for (const ag of ['6-7', '8-9', '10-11', '12-13']) {
      map[ag] = getWeightsForAgeGroup(ag);
    }
    return map;
  };

  return { weights, isLoading, getWeightsForAgeGroup, getAllWeightsMap };
}