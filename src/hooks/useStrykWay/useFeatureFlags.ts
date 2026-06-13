import { useAuth } from '@/contexts/AuthContext';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import type { StrykFeatureFlags } from '@/types/stryk-way';

/**
 * Legacy API kept for backwards compatibility.
 * Delegates to useOrgFeatures (feature profiles) so all call sites stay in sync.
 */
export function useFeatureFlags(): StrykFeatureFlags & { isLoading: boolean } {
  const { organization, isLoading } = useAuth();
  const { isEnabled } = useOrgFeatures();

  return {
    feature_stryk_way_enabled: isEnabled('stryk_way'),
    feature_portal_familiar_enabled: isEnabled('family_portal'),
    feature_evaluations_enabled: isEnabled('evaluations'),
    // Legacy keys not covered by feature_profile yet — read raw column.
    feature_studio_pro_enabled: (organization as any)?.feature_studio_pro_enabled ?? false,
    feature_analytics_enabled: (organization as any)?.feature_analytics_enabled ?? false,
    isLoading,
  };
}
