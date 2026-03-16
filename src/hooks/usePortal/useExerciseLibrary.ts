import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import type { Exercise } from '@/hooks/useStrykWay/useExercises';

export function useExerciseLibrary() {
  const { organizationId, guardian } = usePortalAuth();

  const { data: exercises = [], isLoading: loadingExercises } = useQuery({
    queryKey: ['portal-exercises', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      const { data, error } = await supabase
        .from('exercise_library')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as Exercise[];
    },
    enabled: !!organizationId,
  });

  return {
    exercises,
    hasActiveSubscription: true,
    isLoading: loadingExercises,
  };
}
