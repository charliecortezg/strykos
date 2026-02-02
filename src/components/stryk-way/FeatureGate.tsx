import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { useFeatureFlags } from '@/hooks/useStrykWay';

type FeatureName = 'stryk_way' | 'portal_familiar' | 'studio_pro' | 'analytics';

interface FeatureGateProps {
  feature: FeatureName;
  children: ReactNode;
  fallback?: ReactNode;
}

const featureKeyMap: Record<FeatureName, keyof ReturnType<typeof useFeatureFlags>> = {
  stryk_way: 'feature_stryk_way_enabled',
  portal_familiar: 'feature_portal_familiar_enabled',
  studio_pro: 'feature_studio_pro_enabled',
  analytics: 'feature_analytics_enabled',
};

const featureLabels: Record<FeatureName, string> = {
  stryk_way: 'STRYK Way',
  portal_familiar: 'Portal Familiar',
  studio_pro: 'Studio Pro',
  analytics: 'Analytics',
};

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const flags = useFeatureFlags();
  const featureKey = featureKeyMap[feature];
  const isEnabled = flags[featureKey] as boolean;

  if (flags.isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isEnabled) {
    return fallback ?? (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-muted-foreground" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Función no habilitada</h2>
        <p className="text-muted-foreground text-center max-w-md">
          <span className="font-medium">{featureLabels[feature]}</span> no está disponible 
          para tu academia. Contacta a soporte para activarla.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
