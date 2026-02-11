import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useCoachNotifications(assessmentLabOrgId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['coach_notifications_unread', user?.id, assessmentLabOrgId],
    queryFn: async () => {
      if (!user?.id || !assessmentLabOrgId) return 0;
      const { count, error } = await supabase
        .from('coach_notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('organization_id', assessmentLabOrgId)
        .is('read_at', null);
      if (error) return 0;
      return count || 0;
    },
    enabled: !!user?.id && !!assessmentLabOrgId,
  });

  const markAllRead = useMutation({
    mutationFn: async () => {
      if (!user?.id || !assessmentLabOrgId) return;
      const { error } = await supabase
        .from('coach_notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('organization_id', assessmentLabOrgId)
        .is('read_at', null);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['coach_notifications_unread'] });
    },
  });

  return { unreadCount, markAllRead };
}
