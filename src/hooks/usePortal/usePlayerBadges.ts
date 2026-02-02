import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePortalAuth } from '@/contexts/PortalAuthContext';
import type { StrykBadge, PlayerBadge, BadgeCriteria, BadgeRarity } from '@/types/stryk-way';

interface EarnedBadge {
  id: string;
  badge: StrykBadge;
  earned_at: string;
}

export function usePlayerBadges(playerId: string | null) {
  const { organizationId, linkedPlayers } = usePortalAuth();
  const isLinked = linkedPlayers.some(p => p.id === playerId);

  // Fetch earned badges
  const { data: earnedBadges = [], isLoading: loadingEarned } = useQuery({
    queryKey: ['player-badges-earned', playerId, organizationId],
    queryFn: async (): Promise<EarnedBadge[]> => {
      if (!playerId || !organizationId || !isLinked) return [];

      const { data, error } = await supabase
        .from('player_badges')
        .select(`
          id,
          earned_at,
          badge:stryk_badges(*)
        `)
        .eq('organization_id', organizationId)
        .eq('player_id', playerId)
        .order('earned_at', { ascending: false });

      if (error) {
        console.error('Error fetching earned badges:', error);
        return [];
      }

      return (data || [])
        .filter(pb => pb.badge)
        .map(pb => ({
          id: pb.id,
          earned_at: pb.earned_at,
          badge: {
            ...(pb.badge as any),
            criteria: (pb.badge as any).criteria as BadgeCriteria,
            rarity: (pb.badge as any).rarity as BadgeRarity,
          } as StrykBadge,
        }));
    },
    enabled: !!playerId && !!organizationId && isLinked,
  });

  // Fetch all available badges (to show locked ones)
  const { data: allBadges = [], isLoading: loadingAll } = useQuery({
    queryKey: ['available-badges', organizationId],
    queryFn: async (): Promise<StrykBadge[]> => {
      if (!organizationId) return [];

      const { data, error } = await supabase
        .from('stryk_badges')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching available badges:', error);
        return [];
      }

      return (data || []).map(b => ({
        ...b,
        criteria: b.criteria as unknown as BadgeCriteria,
        rarity: b.rarity as BadgeRarity,
      }));
    },
    enabled: !!organizationId,
  });

  // Separate earned and locked badges
  const earnedBadgeIds = new Set(earnedBadges.map(eb => eb.badge.id));
  const lockedBadges = allBadges.filter(b => !earnedBadgeIds.has(b.id));

  return {
    earnedBadges,
    lockedBadges,
    allBadges,
    isLoading: loadingEarned || loadingAll,
    earnedCount: earnedBadges.length,
    totalCount: allBadges.length,
  };
}
