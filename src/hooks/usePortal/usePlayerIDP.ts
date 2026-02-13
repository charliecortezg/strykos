import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import { useToast } from '@/hooks/use-toast';
import type { IDPCycle, IDPFocusArea, IDPSession, IDPPlanJSON } from '@/types/idp';
import { IDP_SESSION_XP } from '@/types/idp';

export function usePlayerIDP(playerId: string | null) {
  const { organizationId, linkedPlayers } = usePortalAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isLinked = linkedPlayers.some(p => p.id === playerId);

  // Fetch active/overdue IDP cycle
  const { data: idpCycle, isLoading: loadingCycle } = useQuery({
    queryKey: ['idp-cycle', playerId, organizationId],
    queryFn: async (): Promise<IDPCycle | null> => {
      if (!playerId || !organizationId) return null;
      const { data, error } = await supabase
        .from('idp_cycles')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('player_id', playerId)
        .in('status', ['active', 'overdue'])
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) { console.error('IDP cycle fetch error:', error); return null; }
      if (!data) return null;
      return {
        ...data,
        plan_json: data.plan_json as unknown as IDPPlanJSON | null,
      } as IDPCycle;
    },
    enabled: !!playerId && !!organizationId && isLinked,
  });

  // Fetch focus areas
  const { data: focusAreas = [], isLoading: loadingFocus } = useQuery({
    queryKey: ['idp-focus-areas', idpCycle?.id],
    queryFn: async (): Promise<IDPFocusArea[]> => {
      if (!idpCycle?.id) return [];
      const { data, error } = await supabase
        .from('idp_focus_areas')
        .select('*')
        .eq('idp_cycle_id', idpCycle.id);
      if (error) { console.error('IDP focus areas fetch error:', error); return []; }
      return (data || []) as IDPFocusArea[];
    },
    enabled: !!idpCycle?.id,
  });

  // Fetch sessions
  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['idp-sessions', idpCycle?.id],
    queryFn: async (): Promise<IDPSession[]> => {
      if (!idpCycle?.id) return [];
      const { data, error } = await supabase
        .from('idp_sessions')
        .select('*')
        .eq('idp_cycle_id', idpCycle.id)
        .order('session_number', { ascending: true });
      if (error) { console.error('IDP sessions fetch error:', error); return []; }
      return (data || []) as IDPSession[];
    },
    enabled: !!idpCycle?.id,
  });

  // Check if session already registered today
  const todayStr = new Date().toISOString().slice(0, 10);
  const hasSessionToday = sessions.some(s => s.completed_at.slice(0, 10) === todayStr);

  // Accept IDP
  const acceptIDP = useMutation({
    mutationFn: async () => {
      if (!idpCycle?.id) throw new Error('No active IDP');
      const { error } = await supabase
        .from('idp_cycles')
        .update({ accepted_at: new Date().toISOString(), accepted_by: 'parent' })
        .eq('id', idpCycle.id);
      if (error) throw error;

      // Register acceptance event
      if (organizationId && playerId) {
        await supabase.from('stryk_events').insert({
          organization_id: organizationId,
          player_id: playerId,
          source_type: 'idp_accepted',
          source_id: idpCycle.id,
          xp_delta: 0,
        }).then(() => {});
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idp-cycle'] });
      toast({ title: 'Plan aceptado', description: '¡Gracias por tu compromiso!' });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  // Register session
  const registerSession = useMutation({
    mutationFn: async () => {
      if (!idpCycle?.id || !playerId || !organizationId) throw new Error('Missing data');
      if (hasSessionToday) throw new Error('Ya registraste una sesión hoy');

      const sessionNumber = sessions.length + 1;

      // Insert session
      const { error: sessionError } = await supabase
        .from('idp_sessions')
        .insert({
          organization_id: organizationId,
          idp_cycle_id: idpCycle.id,
          player_id: playerId,
          session_number: sessionNumber,
          xp_awarded: IDP_SESSION_XP,
        });
      if (sessionError) throw sessionError;

      // Insert XP event
      await supabase.from('stryk_events').insert({
        organization_id: organizationId,
        player_id: playerId,
        source_type: 'idp_session',
        source_id: idpCycle.id,
        xp_delta: IDP_SESSION_XP,
        metadata: { idp_cycle_id: idpCycle.id, session_number: sessionNumber },
      }).then(() => {});

      // Update player_progress XP + streak
      const { data: progress } = await supabase
        .from('player_progress')
        .select('xp_total, level, idp_streak_current, idp_streak_best, idp_last_session_at')
        .eq('organization_id', organizationId)
        .eq('player_id', playerId)
        .maybeSingle();

      const now = new Date();
      let newStreak = 1;
      if (progress?.idp_last_session_at) {
        const lastDate = new Date(progress.idp_last_session_at).toISOString().slice(0, 10);
        const yesterday = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
        if (lastDate === yesterday) {
          newStreak = (progress.idp_streak_current || 0) + 1;
        } else if (lastDate === todayStr) {
          newStreak = progress.idp_streak_current || 1;
        }
      }

      const newXp = (progress?.xp_total || 0) + IDP_SESSION_XP;
      const newLevel = Math.max(1, Math.floor(newXp / 100) + 1);
      const newBest = Math.max(newStreak, progress?.idp_streak_best || 0);

      await supabase
        .from('player_progress')
        .upsert({
          organization_id: organizationId,
          player_id: playerId,
          xp_total: newXp,
          level: newLevel,
          idp_streak_current: newStreak,
          idp_streak_best: newBest,
          idp_last_session_at: now.toISOString(),
          last_event_at: now.toISOString(),
        }, { onConflict: 'organization_id,player_id' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['idp-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['player-progress'] });
      toast({ title: '¡Sesión registrada!', description: `+${IDP_SESSION_XP} XP` });
    },
    onError: (err: any) => {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    },
  });

  return {
    idpCycle,
    focusAreas,
    sessions,
    isLoading: loadingCycle || loadingFocus || loadingSessions,
    hasSessionToday,
    acceptIDP,
    registerSession,
  };
}
