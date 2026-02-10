import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_WEIGHTS, type EvaluationWeights } from '@/types/evaluations';

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

  const getWeightsForAgeGroup = (ageGroup: string) => {
    const found = weights.find(w => w.age_group === ageGroup);
    return found?.weights || DEFAULT_WEIGHTS[ageGroup] || DEFAULT_WEIGHTS['8-9'];
  };

  const getAllWeightsMap = (): Record<string, { mentalidad: number; tecnica: number; juego: number }> => {
    const map: Record<string, { mentalidad: number; tecnica: number; juego: number }> = {};
    for (const ag of ['6-7', '8-9', '10-11']) {
      map[ag] = getWeightsForAgeGroup(ag);
    }
    return map;
  };

  return { weights, isLoading, getWeightsForAgeGroup, getAllWeightsMap };
}
