import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { EvaluationRubric, StatKey } from '@/types/evaluations';

export function useEvaluationRubrics() {
  const { data: rubrics = [], isLoading } = useQuery({
    queryKey: ['evaluation_rubrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('evaluation_rubrics')
        .select('*')
        .order('band_min', { ascending: true });
      if (error) throw error;
      return data as EvaluationRubric[];
    },
  });

  const getRubric = (ageGroup: string, statKey: StatKey, score: number): string[] => {
    const match = rubrics.find(
      r => r.age_group === ageGroup && r.stat_key === statKey && score >= r.band_min && score <= r.band_max
    );
    return match?.bullets || [];
  };

  return { rubrics, isLoading, getRubric };
}
