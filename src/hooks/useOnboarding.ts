import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type OnboardingStep = 'welcome' | 'model' | 'activation' | 'confirmation';

interface OnboardingState {
  currentStep: OnboardingStep;
  isCompleted: boolean;
  categoriesCreated: number;
  playersCreated: number;
  isLoading: boolean;
}

export function useOnboarding() {
  const { organization } = useAuth();
  const [state, setState] = useState<OnboardingState>({
    currentStep: 'welcome',
    isCompleted: false,
    categoriesCreated: 0,
    playersCreated: 0,
    isLoading: true,
  });

  const fetchOnboardingStatus = useCallback(async () => {
    if (!organization?.id) return;

    try {
      // Check categories count
      const { count: categoriesCount } = await supabase
        .from('categories')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      // Check players count
      const { count: playersCount } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .eq('is_trial', false);

      // Fetch organization onboarding status
      const { data: orgData } = await supabase
        .from('organizations')
        .select('onboarding_completed')
        .eq('id', organization.id)
        .single();

      setState(prev => ({
        ...prev,
        categoriesCreated: categoriesCount || 0,
        playersCreated: playersCount || 0,
        isCompleted: orgData?.onboarding_completed || false,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error fetching onboarding status:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [organization?.id]);

  useEffect(() => {
    fetchOnboardingStatus();
  }, [fetchOnboardingStatus]);

  const setStep = (step: OnboardingStep) => {
    setState(prev => ({ ...prev, currentStep: step }));
  };

  const nextStep = () => {
    const steps: OnboardingStep[] = ['welcome', 'model', 'activation', 'confirmation'];
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex < steps.length - 1) {
      setState(prev => ({ ...prev, currentStep: steps[currentIndex + 1] }));
    }
  };

  const prevStep = () => {
    const steps: OnboardingStep[] = ['welcome', 'model', 'activation', 'confirmation'];
    const currentIndex = steps.indexOf(state.currentStep);
    if (currentIndex > 0) {
      setState(prev => ({ ...prev, currentStep: steps[currentIndex - 1] }));
    }
  };

  const completeOnboarding = async () => {
    if (!organization?.id) return false;

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ onboarding_completed: true })
        .eq('id', organization.id);

      if (error) throw error;

      setState(prev => ({ ...prev, isCompleted: true }));
      return true;
    } catch (error) {
      console.error('Error completing onboarding:', error);
      return false;
    }
  };

  const canProceedToPlayers = state.categoriesCreated >= 1;
  const canComplete = state.categoriesCreated >= 1 && state.playersCreated >= 1;

  return {
    ...state,
    setStep,
    nextStep,
    prevStep,
    completeOnboarding,
    refetch: fetchOnboardingStatus,
    canProceedToPlayers,
    canComplete,
  };
}
