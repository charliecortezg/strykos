import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type {
  SessionPlan,
  SessionPlanWithRelations,
  CreateSessionPlanData,
  UpdateSessionPlanData,
} from '@/types/session-plans';

export function useSessionPlans(categoryId?: string) {
  const { user, organization } = useAuth();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['session-plans', user?.id, organization?.id, categoryId],
    queryFn: async () => {
      if (!user?.id || !organization?.id) return [];

      let query = supabase
        .from('session_plans')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('trainer_id', user.id)
        .order('session_date', { ascending: false });

      if (categoryId) {
        query = query.eq('category_id', categoryId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SessionPlan[];
    },
    enabled: !!user?.id && !!organization?.id,
  });

  return { sessions, isLoading };
}

export function useSessionPlanById(id: string) {
  const { organization } = useAuth();

  const { data: session, isLoading } = useQuery({
    queryKey: ['session-plan', id],
    queryFn: async () => {
      if (!id) return null;

      const { data, error } = await supabase
        .from('session_plans')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      return data as SessionPlan | null;
    },
    enabled: !!id && !!organization?.id,
  });

  return { session, isLoading };
}

export function useCreateSessionPlan() {
  const { user, organization } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateSessionPlanData) => {
      if (!user?.id || !organization?.id) throw new Error('No auth context');

      const { data: result, error } = await supabase
        .from('session_plans')
        .insert({
          ...data,
          organization_id: organization.id,
          trainer_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result as SessionPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-plans'] });
    },
  });
}

export function useUpdateSessionPlan() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdateSessionPlanData;
    }) => {
      const { data: result, error } = await supabase
        .from('session_plans')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return result as SessionPlan;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['session-plans'] });
      queryClient.invalidateQueries({
        queryKey: ['session-plan', variables.id],
      });
    },
  });
}

export function useAllSessionPlans() {
  const { organization } = useAuth();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ['all-session-plans', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return [];

      const { data, error } = await supabase
        .from('session_plans')
        .select(`
          *,
          trainer:profiles!session_plans_trainer_id_fkey(id, full_name),
          category:categories!session_plans_category_id_fkey(id, name)
        `)
        .eq('organization_id', organization.id)
        .order('session_date', { ascending: false });

      if (error) throw error;
      return data as SessionPlanWithRelations[];
    },
    enabled: !!organization?.id,
  });

  return { sessions, isLoading };
}
