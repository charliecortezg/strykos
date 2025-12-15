import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Plan {
  id: string;
  organization_id: string;
  name: string;
  price: number;
  periodicity: string;
  sport_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  sport?: { id: string; name: string } | null;
}

export interface CreatePlanData {
  name: string;
  price: number;
  periodicity: string;
  sport_id?: string;
}

export const PERIODICITY_OPTIONS = [
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'semester', label: 'Semestral' },
  { value: 'annual', label: 'Anual' },
  { value: 'weekly', label: 'Semanal' },
];

export function usePlans() {
  const { organization } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlans = useCallback(async () => {
    if (!organization?.id) return;

    setIsLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('plans')
      .select(`
        *,
        sport:sports(id, name)
      `)
      .eq('organization_id', organization.id)
      .order('name');

    if (fetchError) {
      console.error('Error fetching plans:', fetchError);
      setError(fetchError.message);
    } else {
      setPlans(data as Plan[]);
    }
    setIsLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const createPlan = async (data: CreatePlanData): Promise<boolean> => {
    if (!organization?.id) return false;

    const { error } = await supabase.from('plans').insert({
      organization_id: organization.id,
      name: data.name,
      price: data.price,
      periodicity: data.periodicity,
      sport_id: data.sport_id || null,
    });

    if (error) {
      console.error('Error creating plan:', error);
      return false;
    }

    await fetchPlans();
    return true;
  };

  const updatePlan = async (id: string, data: Partial<CreatePlanData>): Promise<boolean> => {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    
    if (data.name !== undefined) updateData.name = data.name;
    if (data.price !== undefined) updateData.price = data.price;
    if (data.periodicity !== undefined) updateData.periodicity = data.periodicity;
    if (data.sport_id !== undefined) updateData.sport_id = data.sport_id || null;

    const { error } = await supabase
      .from('plans')
      .update(updateData)
      .eq('id', id);

    if (error) {
      console.error('Error updating plan:', error);
      return false;
    }

    await fetchPlans();
    return true;
  };

  const togglePlanActive = async (id: string, isActive: boolean): Promise<boolean> => {
    const { error } = await supabase
      .from('plans')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('Error toggling plan:', error);
      return false;
    }

    await fetchPlans();
    return true;
  };

  const deletePlan = async (id: string): Promise<boolean> => {
    const { error } = await supabase.from('plans').delete().eq('id', id);

    if (error) {
      console.error('Error deleting plan:', error);
      return false;
    }

    await fetchPlans();
    return true;
  };

  return {
    plans,
    isLoading,
    error,
    refetch: fetchPlans,
    createPlan,
    updatePlan,
    togglePlanActive,
    deletePlan,
  };
}
