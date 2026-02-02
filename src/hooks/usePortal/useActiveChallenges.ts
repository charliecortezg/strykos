import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import type { StrykChallenge, ChallengeCriteria } from '@/types/stryk-way';

interface ActiveChallenge extends StrykChallenge {
  progress: number;
  isCompleted: boolean;
}

export function useActiveChallenges(playerId: string | null) {
  const { organizationId, linkedPlayers } = usePortalAuth();
  const isLinked = linkedPlayers.some(p => p.id === playerId);

  const { data: challenges = [], isLoading, refetch } = useQuery({
    queryKey: ['active-challenges', playerId, organizationId],
    queryFn: async (): Promise<ActiveChallenge[]> => {
      if (!playerId || !organizationId || !isLinked) return [];

      const now = new Date().toISOString();

      // Fetch active challenges
      const { data: challengesData, error } = await supabase
        .from('stryk_challenges')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching challenges:', error);
        return [];
      }

      // Filter by date range in JS (avoiding complex OR queries)
      const activeByDate = (challengesData || []).filter(c => {
        const startOk = !c.start_at || new Date(c.start_at) <= new Date(now);
        const endOk = !c.end_at || new Date(c.end_at) >= new Date(now);
        return startOk && endOk;
      });

      // Fetch player's challenge progress
      const { data: progressData } = await supabase
        .from('player_challenges')
        .select('challenge_id, progress, completed_at')
        .eq('organization_id', organizationId)
        .eq('player_id', playerId);

      const progressMap = new Map<string, { progress: number; completed_at: string | null }>();
      (progressData || []).forEach((p: any) => {
        progressMap.set(p.challenge_id, { progress: p.progress, completed_at: p.completed_at });
      });

      return activeByDate.map(c => {
        const playerProgress = progressMap.get(c.id);
        const criteria = c.criteria as unknown as ChallengeCriteria;
        
        return {
          ...c,
          criteria,
          progress: playerProgress?.progress || 0,
          isCompleted: !!playerProgress?.completed_at,
        };
      });
    },
    enabled: !!playerId && !!organizationId && isLinked,
  });

  const activeChallenges = challenges.filter(c => !c.isCompleted);
  const completedChallenges = challenges.filter(c => c.isCompleted);

  return {
    challenges,
    activeChallenges,
    completedChallenges,
    isLoading,
    refetch,
  };
}
