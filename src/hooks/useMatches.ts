import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Match, MatchPlayer, MatchFilters } from '@/types/matches';
import { toast } from 'sonner';

export function useMatches(filters?: Partial<MatchFilters>) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const { data: matches = [], isLoading, error } = useQuery({
    queryKey: ['matches', organization?.id, filters],
    queryFn: async () => {
      if (!organization?.id) return [];

      let query = supabase
        .from('matches')
        .select(`
          *,
          category:categories(id, name, sport_id, sports:sports(name)),
          trainer:profiles!matches_trainer_id_fkey(id, full_name),
          venue:venues(id, name),
          mvp_player:players!matches_mvp_player_id_fkey(id, full_name),
          created_by_profile:profiles!matches_created_by_fkey(full_name),
          last_edited_by_profile:profiles!matches_last_edited_by_fkey(full_name)
        `)
        .eq('organization_id', organization.id)
        .order('match_date', { ascending: false });

      // Apply filters
      if (filters?.dateFrom) {
        query = query.gte('match_date', filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte('match_date', filters.dateTo + 'T23:59:59');
      }
      if (filters?.rival) {
        query = query.ilike('rival_name', `%${filters.rival}%`);
      }
      if (filters?.categoryId) {
        query = query.eq('category_id', filters.categoryId);
      }
      if (filters?.trainerId) {
        query = query.eq('trainer_id', filters.trainerId);
      }
      if (filters?.venueId) {
        query = query.eq('venue_id', filters.venueId);
      }
      if (filters?.matchType) {
        query = query.eq('match_type', filters.matchType);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Filter by sport (needs post-processing due to nested relation)
      let filteredData = data as Match[];
      if (filters?.sportId) {
        filteredData = filteredData.filter(m => m.category?.sport_id === filters.sportId);
      }

      // Filter by result
      if (filters?.result) {
        filteredData = filteredData.filter(m => {
          if (filters.result === 'victoria') return m.goals_for > m.goals_against;
          if (filters.result === 'derrota') return m.goals_for < m.goals_against;
          if (filters.result === 'empate') return m.goals_for === m.goals_against;
          return true;
        });
      }

      return filteredData;
    },
    enabled: !!organization?.id,
  });

  const { data: totalCount = 0 } = useQuery({
    queryKey: ['matches-count', organization?.id],
    queryFn: async () => {
      if (!organization?.id) return 0;
      const { count, error } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organization.id);
      if (error) throw error;
      return count || 0;
    },
    enabled: !!organization?.id,
  });

  const updateMatch = useMutation({
    mutationFn: async (data: { 
      matchId: string; 
      updates: Partial<Match>; 
      userId: string;
    }) => {
      const { error } = await supabase
        .from('matches')
        .update({
          ...data.updates,
          last_edited_by: data.userId,
          last_edited_at: new Date().toISOString(),
        })
        .eq('id', data.matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      toast.success('Partido actualizado correctamente');
    },
    onError: (error) => {
      console.error('Error updating match:', error);
      toast.error('Error al actualizar el partido');
    },
  });

  const deleteMatch = useMutation({
    mutationFn: async (matchId: string) => {
      const { error } = await supabase
        .from('matches')
        .delete()
        .eq('id', matchId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['matches-count'] });
      toast.success('Partido eliminado correctamente');
    },
    onError: (error) => {
      console.error('Error deleting match:', error);
      toast.error('Error al eliminar el partido');
    },
  });

  return {
    matches,
    totalCount,
    isLoading,
    error,
    updateMatch,
    deleteMatch,
  };
}

export function useMatchPlayers(matchId: string | null) {
  const { organization } = useAuth();
  const queryClient = useQueryClient();

  const { data: matchPlayers = [], isLoading } = useQuery({
    queryKey: ['match-players', matchId],
    queryFn: async () => {
      if (!matchId || !organization?.id) return [];

      const { data, error } = await supabase
        .from('match_players')
        .select(`
          *,
          player:players(id, full_name, position)
        `)
        .eq('match_id', matchId)
        .eq('organization_id', organization.id);

      if (error) throw error;
      return data as MatchPlayer[];
    },
    enabled: !!matchId && !!organization?.id,
  });

  const createMatchPlayers = useMutation({
    mutationFn: async (players: {
      match_id: string;
      player_id: string;
      organization_id: string;
      attended: boolean;
      goals?: number;
      assists?: number;
      points?: number;
      performance?: string | null;
    }[]) => {
      const { error } = await supabase
        .from('match_players')
        .insert(players);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-players', matchId] });
    },
    onError: (error) => {
      console.error('Error creating match players:', error);
      toast.error('Error al registrar jugadores del partido');
    },
  });

  const updateMatchPlayers = useMutation({
    mutationFn: async (players: Partial<MatchPlayer>[]) => {
      for (const player of players) {
        if (!player.id) continue;
        const { error } = await supabase
          .from('match_players')
          .update({
            attended: player.attended,
            goals: player.goals,
            assists: player.assists,
            points: player.points,
            performance: player.performance,
          })
          .eq('id', player.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['match-players', matchId] });
      toast.success('Asistencia y estadísticas actualizadas');
    },
    onError: (error) => {
      console.error('Error updating match players:', error);
      toast.error('Error al actualizar los jugadores');
    },
  });

  return {
    matchPlayers,
    isLoading,
    createMatchPlayers,
    updateMatchPlayers,
  };
}
