import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { WelcomeStep } from './WelcomeStep';
import { OperationalModelStep } from './OperationalModelStep';
import { ActivationStep } from './ActivationStep';
import { ConfirmationStep } from './ConfirmationStep';
import { Logo } from '@/components/brand/Logo';
import { motion } from 'framer-motion';

export function OnboardingWizard() {
  const navigate = useNavigate();
  const { activeRole, isLoading: authLoading } = useAuth();
  const {
    currentStep,
    isCompleted,
    isLoading,
    categoriesCreated,
    playersCreated,
    nextStep,
    prevStep,
    completeOnboarding,
    refetch,
  } = useOnboarding();

  // Redirect if already completed
  useEffect(() => {
    if (!isLoading && !authLoading && isCompleted) {
      const dashboardPath = activeRole 
        ? `/dashboard/${activeRole.replace('_', '-')}`
        : '/dashboard/org-owner';
      navigate(dashboardPath, { replace: true });
    }
  }, [isCompleted, isLoading, authLoading, activeRole, navigate]);

  const handleComplete = async () => {
    const success = await completeOnboarding();
    if (success) {
      const dashboardPath = activeRole 
        ? `/dashboard/${activeRole.replace('_', '-')}`
        : '/dashboard/org-owner';
      navigate(dashboardPath, { replace: true });
    }
  };

  if (isLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground font-body">Cargando...</p>
        </div>
      </div>
    );
  }

  const steps = ['welcome', 'model', 'activation', 'confirmation'];
  const currentIndex = steps.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-background">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-muted z-50">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Header */}
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm border-b border-border z-40">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <Logo className="h-6" />
          <span className="text-sm text-muted-foreground">
            Configuración inicial
          </span>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto max-w-3xl py-8">
        {currentStep === 'welcome' && (
          <WelcomeStep onNext={nextStep} />
        )}
        {currentStep === 'model' && (
          <OperationalModelStep onNext={nextStep} onPrev={prevStep} />
        )}
        {currentStep === 'activation' && (
          <ActivationStep
            onNext={nextStep}
            onPrev={prevStep}
            categoriesCreated={categoriesCreated}
            playersCreated={playersCreated}
            onRefetch={refetch}
          />
        )}
        {currentStep === 'confirmation' && (
          <ConfirmationStep
            onComplete={handleComplete}
            categoriesCreated={categoriesCreated}
            playersCreated={playersCreated}
          />
        )}
      </main>
    </div>
  );
}
