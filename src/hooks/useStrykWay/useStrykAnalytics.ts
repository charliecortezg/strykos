import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface AnalyticsData {
  totalPlayers: number;
  activePlayers: number;
  totalXp: number;
  averageLevel: number;
  averageStreak: number;
  levelDistribution: { level: number; count: number }[];
  topPlayers: { id: string; name: string; xp: number; level: number }[];
  badgesEarned: number;
  challengesCompleted: number;
}

export function useStrykAnalytics() {
  const { organization } = useAuth();

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['stryk-analytics', organization?.id],
    queryFn: async (): Promise<AnalyticsData> => {
      if (!organization?.id) {
        return getEmptyAnalytics();
      }

      // Fetch player progress stats
      const { data: progressData, error: progressError } = await supabase
        .from('player_progress')
        .select('player_id, xp_total, level, streak')
        .eq('organization_id', organization.id);

      if (progressError) {
        console.error('Error fetching progress:', progressError);
        return getEmptyAnalytics();
      }

      const progress = progressData || [];

      // Fetch total players count
      const { count: totalPlayers } = await supabase
        .from('players')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      // Fetch player names for top players
      const topPlayerIds = progress
        .sort((a, b) => b.xp_total - a.xp_total)
        .slice(0, 5)
        .map(p => p.player_id);

      const { data: playersData } = await supabase
        .from('players')
        .select('id, full_name')
        .in('id', topPlayerIds);

      const playerNames = new Map((playersData || []).map(p => [p.id, p.full_name]));

      // Fetch badges earned count
      const { count: badgesEarned } = await supabase
        .from('player_badges')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization.id);

      // Fetch challenges completed count
      const { count: challengesCompleted } = await supabase
        .from('player_challenges')
        .select('id', { count: 'exact', head: true })
        .eq('organization_id', organization.id)
        .not('completed_at', 'is', null);

      // Calculate stats
      const totalXp = progress.reduce((sum, p) => sum + p.xp_total, 0);
      const averageLevel = progress.length > 0 
        ? progress.reduce((sum, p) => sum + p.level, 0) / progress.length 
        : 0;
      const averageStreak = progress.length > 0 
        ? progress.reduce((sum, p) => sum + p.streak, 0) / progress.length 
        : 0;

      // Level distribution
      const levelCounts = new Map<number, number>();
      progress.forEach(p => {
        levelCounts.set(p.level, (levelCounts.get(p.level) || 0) + 1);
      });
      const levelDistribution = Array.from(levelCounts.entries())
        .map(([level, count]) => ({ level, count }))
        .sort((a, b) => a.level - b.level);

      // Top players
      const topPlayers = progress
        .sort((a, b) => b.xp_total - a.xp_total)
        .slice(0, 5)
        .map(p => ({
          id: p.player_id,
          name: playerNames.get(p.player_id) || 'Jugador',
          xp: p.xp_total,
          level: p.level,
        }));

      return {
        totalPlayers: totalPlayers || 0,
        activePlayers: progress.length,
        totalXp,
        averageLevel: Math.round(averageLevel * 10) / 10,
        averageStreak: Math.round(averageStreak * 10) / 10,
        levelDistribution,
        topPlayers,
        badgesEarned: badgesEarned || 0,
        challengesCompleted: challengesCompleted || 0,
      };
    },
    enabled: !!organization?.id,
  });

  return {
    analytics: analytics || getEmptyAnalytics(),
    isLoading,
    refetch,
  };
}

function getEmptyAnalytics(): AnalyticsData {
  return {
    totalPlayers: 0,
    activePlayers: 0,
    totalXp: 0,
    averageLevel: 0,
    averageStreak: 0,
    levelDistribution: [],
    topPlayers: [],
    badgesEarned: 0,
    challengesCompleted: 0,
  };
}
