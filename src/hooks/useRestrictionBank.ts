import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { RestrictionBankItem } from '@/types/session-plans';

export function useRestrictionBank(fundamento: string, ageGroup: string) {
  const { organization } = useAuth();

  const { data: restrictions = [], isLoading } = useQuery({
    queryKey: ['restriction-bank', organization?.id, fundamento, ageGroup],
    queryFn: async () => {
      if (!fundamento || !ageGroup) return [];

      const { data, error } = await supabase
        .from('restriction_bank')
        .select('*')
        .eq('fundamento', fundamento)
        .eq('age_group', ageGroup)
        .or(`organization_id.is.null,organization_id.eq.${organization?.id}`)
        .order('es_recomendada', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as RestrictionBankItem[];
    },
    enabled: !!fundamento && !!ageGroup && !!organization?.id,
  });

  return { restrictions, isLoading };
}

export function useRecentRestrictions(categoryId: string) {
  const { organization } = useAuth();

  const { data: recentRestrictions = [], isLoading } = useQuery({
    queryKey: ['recent-restrictions', organization?.id, categoryId],
    queryFn: async () => {
      if (!categoryId || !organization?.id) return [];

      const { data, error } = await supabase
        .from('session_plans')
        .select('restriccion_rondo, session_date')
        .eq('organization_id', organization.id)
        .eq('category_id', categoryId)
        .not('restriccion_rondo', 'is', null)
        .order('session_date', { ascending: false })
        .limit(3);

      if (error) throw error;
      return data.map((r) => r.restriccion_rondo as string);
    },
    enabled: !!categoryId && !!organization?.id,
  });

  return { recentRestrictions, isLoading };
}
