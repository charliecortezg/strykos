// STRYK Intake Catalogs Hooks
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useIntakeSports(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['intake_sports', organizationId],
    queryFn: async () => {
      // Get system sports and organization-specific sports
      const { data, error } = await supabase
        .from('sports')
        .select('*')
        .or(`is_system.eq.true,organization_id.is.null${organizationId ? `,organization_id.eq.${organizationId}` : ''}`)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: true,
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useIntakeCategories(organizationId: string | undefined, sportId?: string) {
  return useQuery({
    queryKey: ['intake_categories', organizationId, sportId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('categories')
        .select(`
          *,
          venues(id, name),
          profiles!categories_trainer_id_fkey(id, full_name)
        `)
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      
      if (sportId) {
        query = query.eq('sport_id', sportId);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}

export function useIntakePlans(organizationId: string | undefined, sportId?: string) {
  return useQuery({
    queryKey: ['intake_plans', organizationId, sportId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      let query = supabase
        .from('plans')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);
      
      if (sportId) {
        query = query.or(`sport_id.eq.${sportId},sport_id.is.null`);
      }
      
      const { data, error } = await query.order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}

export function useIntakeVenues(organizationId: string | undefined) {
  return useQuery({
    queryKey: ['intake_venues', organizationId],
    queryFn: async () => {
      if (!organizationId) return [];
      
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!organizationId,
  });
}
