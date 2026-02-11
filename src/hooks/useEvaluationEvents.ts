import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { EvaluationEvent, EvaluationEventPlayer, EventStatus } from '@/types/assessment';

export function useEvaluationEvents() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['evaluation_events', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('evaluation_events')
        .select('*')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as EvaluationEvent[];
    },
    enabled: !!orgId,
  });

  const createEvent = useMutation({
    mutationFn: async ({ title, eventDate }: { title: string; eventDate?: string }) => {
      if (!orgId) throw new Error('No org');
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from('evaluation_events')
        .insert({
          organization_id: orgId,
          title,
          event_date: eventDate || null,
          status: 'draft',
          created_by: userId,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation_events'] });
      toast({ title: 'Evento creado' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const updateEventStatus = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: EventStatus }) => {
      const updates: any = { status };
      if (status === 'closed') {
        const userId = (await supabase.auth.getUser()).data.user?.id;
        updates.closed_by = userId;
        updates.closed_at = new Date().toISOString();
      }
      const { error } = await supabase
        .from('evaluation_events')
        .update(updates)
        .eq('id', eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['evaluation_events'] });
      toast({ title: 'Estado del evento actualizado' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { events, isLoading, createEvent, updateEventStatus };
}

export function useEventPlayers(eventId: string | null) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const orgId = organization?.id;

  const { data: eventPlayers = [], isLoading } = useQuery({
    queryKey: ['event_players', eventId],
    queryFn: async () => {
      if (!eventId || !orgId) return [];
      const { data, error } = await supabase
        .from('evaluation_event_players')
        .select('*, player:players(id, full_name, parent_email, parent_phone, date_of_birth)')
        .eq('event_id', eventId)
        .eq('organization_id', orgId);
      if (error) throw error;
      return data as EvaluationEventPlayer[];
    },
    enabled: !!eventId && !!orgId,
  });

  const addPlayerToEvent = useMutation({
    mutationFn: async (playerId: string) => {
      if (!eventId || !orgId) throw new Error('Missing');
      const { error } = await supabase
        .from('evaluation_event_players')
        .insert({
          event_id: eventId,
          player_id: playerId,
          organization_id: orgId,
          status: 'pending',
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event_players', eventId] });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  const markPlayerCompleted = useMutation({
    mutationFn: async (eventPlayerId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { error } = await supabase
        .from('evaluation_event_players')
        .update({
          status: 'completed',
          evaluated_by: userId,
          evaluated_at: new Date().toISOString(),
        })
        .eq('id', eventPlayerId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event_players', eventId] });
    },
  });

  const pendingPlayers = eventPlayers.filter(ep => ep.status === 'pending');
  const completedPlayers = eventPlayers.filter(ep => ep.status === 'completed');

  return {
    eventPlayers,
    pendingPlayers,
    completedPlayers,
    isLoading,
    addPlayerToEvent,
    markPlayerCompleted,
  };
}
