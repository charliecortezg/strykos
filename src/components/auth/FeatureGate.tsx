import { ReactNode } from 'react';
import { useOrgFeatures } from '@/hooks/useOrgFeatures';
import type { FeatureKey } from '@/lib/feature-profiles';

interface FeatureGateProps {
  featureKey: FeatureKey;
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Inline gate for tabs, buttons, sections.
 * Renders children only when the flag is enabled for the active org.
 */
export function FeatureGate({ featureKey, children, fallback = null }: FeatureGateProps) {
  const { isEnabled } = useOrgFeatures();
  return <>{isEnabled(featureKey) ? children : fallback}</>;
}
