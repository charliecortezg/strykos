import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface TrainerCategory {
  id: string;
  name: string;
  sport_id: string | null;
  venue_id: string | null;
  sport?: {
    id: string;
    name: string;
  } | null;
  venue?: {
    id: string;
    name: string;
  } | null;
}

export function useTrainerCategories() {
  const { user, organization } = useAuth();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['trainer-categories', user?.id, organization?.id],
    queryFn: async () => {
      if (!user?.id || !organization?.id) return [];

      const { data, error } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          sport_id,
          venue_id,
          sport:sports(id, name),
          venue:venues(id, name)
        `)
        .eq('organization_id', organization.id)
        .eq('trainer_id', user.id)
        .eq('is_active', true);

      if (error) throw error;
      return data as TrainerCategory[];
    },
    enabled: !!user?.id && !!organization?.id,
  });

  return {
    categories,
    isLoading,
    hasCategories: categories.length > 0,
  };
}
