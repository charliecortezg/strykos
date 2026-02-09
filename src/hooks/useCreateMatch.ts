import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { MatchImportance } from '@/types/matches';

interface CreateMatchData {
  category_id: string;
  venue_id: string | null;
  match_date: string;
  rival_name: string;
  match_type: 'liga' | 'torneo' | 'amistoso';
  status: 'programado' | 'terminado';
  goals_for: number;
  goals_against: number;
  notes?: string;
  importance?: MatchImportance;
  xp_multiplier?: number;
  players: {
    player_id: string;
    attended: boolean;
    goals: number;
    assists: number;
    points: number;
    position?: string | null;
    is_guest?: boolean;
  }[];
}

export function useCreateMatch() {
  const { user, organization } = useAuth();
  const queryClient = useQueryClient();

  const createMatch = useMutation({
    mutationFn: async (data: CreateMatchData) => {
      if (!organization?.id || !user?.id) {
        throw new Error('No organization or user');
      }

      // Create the match
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .insert({
          organization_id: organization.id,
          category_id: data.category_id,
          trainer_id: user.id,
          venue_id: data.venue_id,
          match_date: data.match_date,
          rival_name: data.rival_name,
          match_type: data.match_type,
          status: data.status,
          goals_for: data.goals_for,
          goals_against: data.goals_against,
          notes: data.notes,
          importance: data.importance || 'regular',
          xp_multiplier: data.xp_multiplier || 1.0,
          created_by: user.id,
        })
        .select()
        .single();

      if (matchError) throw matchError;

      // Create match players records
      if (data.players.length > 0) {
        const matchPlayers = data.players.map(p => ({
          match_id: match.id,
          player_id: p.player_id,
          organization_id: organization.id,
          attended: p.attended,
          goals: p.goals,
          assists: p.assists,
          points: p.points,
          position: p.position || null,
          is_guest: p.is_guest || false,
        }));

        const { error: playersError } = await supabase
          .from('match_players')
          .insert(matchPlayers);

        if (playersError) throw playersError;
      }

      return match;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matches'] });
      queryClient.invalidateQueries({ queryKey: ['trainer-matches'] });
      toast.success('Partido registrado correctamente');
    },
    onError: (error) => {
      console.error('Error creating match:', error);
      toast.error('Error al registrar el partido');
    },
  });

  return { createMatch };
}
