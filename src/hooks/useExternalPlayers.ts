import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { CreateExternalPlayerData, AgeGroup } from '@/types/assessment';

function ageGroupToBirthDate(ageGroup: AgeGroup): string {
  const now = new Date();
  const midAge = ageGroup === '6-7' ? 7 : ageGroup === '8-9' ? 9 : 11;
  const year = now.getFullYear() - midAge;
  return `${year}-01-01`;
}

export function useExternalPlayers() {
  const { organization } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const createExternalPlayer = useMutation({
    mutationFn: async (data: CreateExternalPlayerData) => {
      if (!orgId) throw new Error('No org');
      const { data: player, error } = await supabase
        .from('players')
        .insert({
          organization_id: orgId,
          full_name: data.full_name,
          date_of_birth: ageGroupToBirthDate(data.age_group),
          parent_email: data.parent_email,
          parent_phone: data.parent_phone || null,
          player_type: 'external',
          payment_status: 'al_dia',
          is_active: true,
          is_scholarship: false,
          is_trial: false,
        })
        .select()
        .single();
      if (error) throw error;
      return player;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event_players'] });
      toast({ title: 'Jugador externo agregado' });
    },
    onError: (e) => toast({ title: 'Error', description: e.message, variant: 'destructive' }),
  });

  return { createExternalPlayer };
}
