import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrainerWithCategories {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  categories: {
    id: string;
    name: string;
  }[];
}

export function useTrainersWithCategories() {
  const { organization } = useAuth();
  const [trainers, setTrainers] = useState<TrainerWithCategories[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrainers = useCallback(async () => {
    if (!organization) return;

    setIsLoading(true);

    try {
      // Get all users with entrenador role in this organization
      const { data: roles, error: rolesError } = await supabase
        .from('user_org_roles')
        .select('user_id')
        .eq('organization_id', organization.id)
        .eq('role', 'entrenador');

      if (rolesError) {
        console.error('Error fetching trainer roles:', rolesError);
        return;
      }

      if (!roles || roles.length === 0) {
        setTrainers([]);
        setIsLoading(false);
        return;
      }

      const userIds = roles.map(r => r.user_id);

      // Get profiles for those users (including inactive ones for full view)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email, is_active')
        .in('id', userIds)
        .order('full_name');

      if (profilesError) {
        console.error('Error fetching trainer profiles:', profilesError);
        return;
      }

      // Get categories assigned to these trainers
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, trainer_id')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .in('trainer_id', userIds);

      if (categoriesError) {
        console.error('Error fetching trainer categories:', categoriesError);
      }

      // Map profiles with their categories
      const trainersWithCategories: TrainerWithCategories[] = (profiles || []).map(profile => ({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        is_active: profile.is_active ?? true,
        categories: (categories || [])
          .filter(cat => cat.trainer_id === profile.id)
          .map(cat => ({ id: cat.id, name: cat.name })),
      }));

      setTrainers(trainersWithCategories);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organization]);

  useEffect(() => {
    fetchTrainers();
  }, [fetchTrainers]);

  return {
    trainers,
    isLoading,
    refetch: fetchTrainers,
  };
}
