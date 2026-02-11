import { useAuth } from '@/contexts/AuthContext';
import type { StrykFeatureFlags } from '@/types/stryk-way';

export function useFeatureFlags(): StrykFeatureFlags & { isLoading: boolean } {
  const { organization, isLoading } = useAuth();

  return {
    feature_stryk_way_enabled: (organization as any)?.feature_stryk_way_enabled ?? false,
    feature_portal_familiar_enabled: (organization as any)?.feature_portal_familiar_enabled ?? false,
    feature_studio_pro_enabled: (organization as any)?.feature_studio_pro_enabled ?? false,
    feature_analytics_enabled: (organization as any)?.feature_analytics_enabled ?? false,
    feature_evaluations_enabled: (organization as any)?.feature_evaluations_enabled ?? false,
    isLoading,
  };
}
