import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/contexts/PortalAuthContext';

interface ActivityEvent {
  id: string;
  source_type: 'attendance' | 'match' | 'manual' | 'challenge';
  xp_delta: number;
  created_at: string;
  description: string;
}

export function usePlayerActivity(playerId: string | null, limit = 10) {
  const { organizationId, linkedPlayers } = usePortalAuth();
  const isLinked = linkedPlayers.some(p => p.id === playerId);

  const { data: events = [], isLoading, refetch } = useQuery({
    queryKey: ['player-activity', playerId, organizationId, limit],
    queryFn: async (): Promise<ActivityEvent[]> => {
      if (!playerId || !organizationId || !isLinked) return [];

      const { data, error } = await supabase
        .from('stryk_events')
        .select('id, source_type, xp_delta, created_at')
        .eq('organization_id', organizationId)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching player activity:', error);
        return [];
      }

      return (data || []).map(event => ({
        ...event,
        source_type: event.source_type as ActivityEvent['source_type'],
        description: getEventDescription(event.source_type as ActivityEvent['source_type'], event.xp_delta),
      }));
    },
    enabled: !!playerId && !!organizationId && isLinked,
  });

  return {
    events,
    isLoading,
    refetch,
  };
}

function getEventDescription(sourceType: ActivityEvent['source_type'], xpDelta: number): string {
  switch (sourceType) {
    case 'attendance':
      return `Asistencia registrada (+${xpDelta} XP)`;
    case 'match':
      return `Partido jugado (+${xpDelta} XP)`;
    case 'challenge':
      return `Reto completado (+${xpDelta} XP)`;
    case 'manual':
      return `XP otorgado manualmente (+${xpDelta} XP)`;
    default:
      return `Evento (+${xpDelta} XP)`;
  }
}
