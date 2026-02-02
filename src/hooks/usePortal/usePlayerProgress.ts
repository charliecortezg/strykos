import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import type { PlayerProgress, RadarAttributes } from '@/types/stryk-way';

interface PlayerProgressWithDetails extends PlayerProgress {
  player_name: string;
  category_name: string | null;
}

export function usePlayerProgress(playerId: string | null) {
  const { organizationId, linkedPlayers } = usePortalAuth();

  // Verify player is linked to this guardian
  const isLinked = linkedPlayers.some(p => p.id === playerId);

  const { data: progress, isLoading, refetch } = useQuery({
    queryKey: ['player-progress', playerId, organizationId],
    queryFn: async (): Promise<PlayerProgressWithDetails | null> => {
      if (!playerId || !organizationId || !isLinked) return null;

      const { data, error } = await supabase
        .from('player_progress')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('player_id', playerId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching player progress:', error);
        return null;
      }

      // Get player details
      const player = linkedPlayers.find(p => p.id === playerId);

      if (!data) {
        // Return default progress if none exists
        return {
          organization_id: organizationId,
          player_id: playerId,
          xp_total: 0,
          level: 1,
          streak: 0,
          ovr: 50,
          radar: {
            tecnica: 50,
            tactica: 50,
            fisica: 50,
            mental: 50,
            social: 50,
            disciplina: 50,
          },
          last_event_at: null,
          updated_at: new Date().toISOString(),
          player_name: player?.full_name || 'Jugador',
          category_name: player?.category_name || null,
        };
      }

      return {
        ...data,
        radar: data.radar as unknown as RadarAttributes,
        player_name: player?.full_name || 'Jugador',
        category_name: player?.category_name || null,
      };
    },
    enabled: !!playerId && !!organizationId && isLinked,
  });

  // Calculate XP for next level
  const xpPerLevel = 100; // From default ruleset
  const xpForCurrentLevel = progress ? (progress.level - 1) * xpPerLevel : 0;
  const xpForNextLevel = progress ? progress.level * xpPerLevel : xpPerLevel;
  const xpProgress = progress ? progress.xp_total - xpForCurrentLevel : 0;
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const xpPercentage = Math.min(100, Math.round((xpProgress / xpNeeded) * 100));

  return {
    progress,
    isLoading,
    refetch,
    xpProgress,
    xpNeeded,
    xpPercentage,
    isLinked,
  };
}
