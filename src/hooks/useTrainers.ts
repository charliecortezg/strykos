import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Trainer {
  id: string;
  full_name: string;
  email: string;
}

export function useTrainers() {
  const { organization } = useAuth();
  const [trainers, setTrainers] = useState<Trainer[]>([]);
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

      // Get profiles for those users
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', userIds)
        .eq('is_active', true)
        .order('full_name');

      if (profilesError) {
        console.error('Error fetching trainer profiles:', profilesError);
        return;
      }

      setTrainers((profiles || []) as Trainer[]);
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
