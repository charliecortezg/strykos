import { useState } from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { useAuth } from '@/contexts/AuthContext';
import { UpgradePlanModal } from './UpgradePlanModal';

interface PlanLimitBannerProps {
  type: 'categories' | 'players' | 'users';
  className?: string;
}

export function PlanLimitBanner({ type, className = '' }: PlanLimitBannerProps) {
  const { organization } = useAuth();
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const { 
    limits, 
    usage, 
    isAtCategoryLimit, 
    isAtPlayerLimit, 
    isAtUserLimit,
    isNearCategoryLimit,
    isNearPlayerLimit,
    isLoading 
  } = usePlanLimits();

  if (isLoading || !limits) return null;

  const isAtLimit = type === 'categories' ? isAtCategoryLimit 
    : type === 'players' ? isAtPlayerLimit 
    : isAtUserLimit;

  const isNearLimit = type === 'categories' ? isNearCategoryLimit 
    : type === 'players' ? isNearPlayerLimit 
    : false;

  if (!isAtLimit && !isNearLimit) return null;

  const getMax = () => {
    switch (type) {
      case 'categories': return limits.max_categories;
      case 'players': return limits.max_players;
      case 'users': return limits.max_users;
    }
  };

  const getCurrent = () => {
    switch (type) {
      case 'categories': return usage.categories;
      case 'players': return usage.players;
      case 'users': return usage.users;
    }
  };

  const getLabel = () => {
    switch (type) {
      case 'categories': return 'categorías';
      case 'players': return 'jugadores';
      case 'users': return 'usuarios';
    }
  };

  const max = getMax();
  const current = getCurrent();

  if (isAtLimit) {
    return (
      <>
        <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-4 ${className}`}>
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-destructive">
                Límite de {getLabel()} alcanzado
              </h4>
              <p className="text-sm text-muted-foreground mt-1">
                Tu plan <span className="font-medium capitalize">{organization?.plan || 'freemium'}</span> permite 
                hasta {max} {getLabel()}. Actualmente tienes {current}.
              </p>
              <Button 
                size="sm" 
                className="mt-3" 
                variant="default"
                onClick={() => setUpgradeModalOpen(true)}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Mejorar plan
              </Button>
            </div>
          </div>
        </div>
        <UpgradePlanModal 
          open={upgradeModalOpen} 
          onOpenChange={setUpgradeModalOpen} 
        />
      </>
    );
  }

  // Near limit warning
  return (
    <>
      <div className={`bg-warning/10 border border-warning/20 rounded-lg p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-warning" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-warning">
              Cerca del límite de {getLabel()}
            </h4>
            <p className="text-sm text-muted-foreground mt-1">
              Tienes {current} de {max} {getLabel()} permitidos en tu plan {organization?.plan || 'freemium'}.
            </p>
            <Button 
              size="sm" 
              className="mt-3" 
              variant="outline"
              onClick={() => setUpgradeModalOpen(true)}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Ver planes
            </Button>
          </div>
        </div>
      </div>
      <UpgradePlanModal 
        open={upgradeModalOpen} 
        onOpenChange={setUpgradeModalOpen} 
      />
    </>
  );
}
