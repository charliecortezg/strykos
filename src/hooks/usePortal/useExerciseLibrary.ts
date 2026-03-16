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

  const { data: subscription, isLoading: loadingSub } = useQuery({
    queryKey: ['exercise-subscription', guardian?.id, organizationId],
    queryFn: async () => {
      if (!guardian?.id || !organizationId) return null;
      const { data, error } = await supabase
        .from('exercise_addon_subscriptions')
        .select('*')
        .eq('guardian_id', guardian.id)
        .eq('organization_id', organizationId)
        .eq('status', 'active')
        .maybeSingle();
      if (error) { console.error('Sub check error:', error); return null; }
      return data;
    },
    enabled: !!guardian?.id && !!organizationId,
  });

  const hasActiveSubscription = !!subscription && (
    !subscription.current_period_end || new Date(subscription.current_period_end) > new Date()
  );

  return {
    exercises,
    hasActiveSubscription,
    isLoading: loadingExercises || loadingSub,
  };
}
