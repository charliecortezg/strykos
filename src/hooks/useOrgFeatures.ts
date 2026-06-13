import { useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  resolveFeature,
  resolveProfile,
  type FeatureKey,
  type FeatureProfile,
  type OrgFeatureSource,
} from '@/lib/feature-profiles';

interface UseOrgFeaturesResult {
  profile: FeatureProfile;
  isEnabled: (key: FeatureKey) => boolean;
  isLoading: boolean;
}

export function useOrgFeatures(): UseOrgFeaturesResult {
  const { organization, isLoading } = useAuth();

  return useMemo(() => {
    const org = organization as OrgFeatureSource | null;
    return {
      profile: resolveProfile(org),
      isEnabled: (key: FeatureKey) => resolveFeature(org, key),
      isLoading,
    };
  }, [organization, isLoading]);
}
