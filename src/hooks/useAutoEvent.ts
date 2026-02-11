import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { EvaluationEvent, EvaluationEventPlayer } from '@/types/assessment';

export function useAutoEvent(assessmentLabOrgId: string | null) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get or create auto event for current month
  const { data: autoEvent, isLoading: eventLoading } = useQuery({
    queryKey: ['auto_event', assessmentLabOrgId],
    queryFn: async () => {
      if (!assessmentLabOrgId) return null;
      const { data, error } = await supabase
        .rpc('get_or_create_monthly_event', { p_org_id: assessmentLabOrgId });
      if (error) throw error;
      return (data as any)?.[0] as EvaluationEvent | null;
    },
    enabled: !!assessmentLabOrgId,
  });

  // Get event players
  const { data: eventPlayers = [], isLoading: playersLoading } = useQuery({
    queryKey: ['auto_event_players', autoEvent?.id],
    queryFn: async () => {
      if (!autoEvent?.id) return [];
      const { data, error } = await supabase
        .from('evaluation_event_players')
        .select('*, player:players(id, full_name, parent_email, parent_phone, date_of_birth)')
        .eq('event_id', autoEvent.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as EvaluationEventPlayer[];
    },
    enabled: !!autoEvent?.id,
  });

  const pendingPlayers = eventPlayers.filter(p => p.status === 'pending');
  const completedPlayers = eventPlayers.filter(p => p.status === 'completed');

  // Add player to event
  const addPlayerToEvent = useMutation({
    mutationFn: async (playerId: string) => {
      if (!autoEvent?.id || !assessmentLabOrgId) throw new Error('No event');
      const { error } = await supabase
        .from('evaluation_event_players')
        .insert({
          event_id: autoEvent.id,
          player_id: playerId,
          organization_id: assessmentLabOrgId,
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto_event_players', autoEvent?.id] });
    },
  });

  // Close event
  const closeEvent = useMutation({
    mutationFn: async () => {
      if (!autoEvent?.id) throw new Error('No event');
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from('evaluation_events')
        .update({ status: 'closed', closed_by: userId, closed_at: new Date().toISOString() })
        .eq('id', autoEvent.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto_event', assessmentLabOrgId] });
      queryClient.invalidateQueries({ queryKey: ['auto_event_players'] });
      toast({ title: 'Evento cerrado exitosamente' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  // Notify coaches in assessment lab org
  const notifyCoaches = useMutation({
    mutationFn: async (payload: { event_id: string; player_name: string; month: string }) => {
      if (!assessmentLabOrgId) throw new Error('No org');
      // Get coaches in assessment lab org
      const { data: coaches, error: coachError } = await supabase
        .from('user_org_roles')
        .select('user_id')
        .eq('organization_id', assessmentLabOrgId)
        .eq('role', 'entrenador');
      if (coachError) throw coachError;

      if (!coaches || coaches.length === 0) return;

      const notifications = coaches.map(c => ({
        organization_id: assessmentLabOrgId,
        user_id: c.user_id,
        type: 'evaluation_ready',
        payload: payload as any,
      }));

      const { error } = await supabase
        .from('coach_notifications')
        .insert(notifications);
      if (error) throw error;
    },
  });

  return {
    autoEvent,
    eventPlayers,
    pendingPlayers,
    completedPlayers,
    isLoading: eventLoading || playersLoading,
    addPlayerToEvent,
    closeEvent,
    notifyCoaches,
  };
}
