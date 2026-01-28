// STRYK Intake History Hook
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { IntakeRequestWithRelations } from '../types/intake.types';

interface UseIntakeHistoryParams {
  organizationId: string | undefined;
  status?: string;
  sportId?: string;
  limit?: number;
}

export function useIntakeHistory({ 
  organizationId, 
  status, 
  sportId, 
  limit = 50 
}: UseIntakeHistoryParams) {
  return useQuery({
    queryKey: ['intake_requests', organizationId, status, sportId, limit],
    queryFn: async () => {
      if (!organizationId) throw new Error('No organization ID');
      
      let query = supabase
        .from('intake_requests')
        .select(`
          *,
          sports(name),
          categories(name),
          venues(name),
          plans(name)
        `)
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }
      
      if (sportId && sportId !== 'all') {
        query = query.eq('sport_id', sportId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as IntakeRequestWithRelations[];
    },
    enabled: !!organizationId,
  });
}
