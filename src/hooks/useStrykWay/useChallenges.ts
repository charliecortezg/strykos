import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { StrykChallenge, ChallengeFormData } from '@/types/stryk-way';

export function useChallenges(packId: string | null) {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const { data: challenges, isLoading } = useQuery({
    queryKey: ['stryk-challenges', packId],
    queryFn: async () => {
      if (!packId) return [];
      const { data, error } = await supabase
        .from('stryk_challenges')
        .select('*')
        .eq('pack_id', packId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as unknown as StrykChallenge[];
    },
    enabled: !!packId,
  });

  const createChallenge = useMutation({
    mutationFn: async (formData: ChallengeFormData) => {
      if (!orgId || !packId || !user?.id) throw new Error('Missing required data');

      const { error } = await supabase.from('stryk_challenges').insert({
        organization_id: orgId,
        pack_id: packId,
        key: formData.key,
        name: formData.name,
        description: formData.description || null,
        xp_reward: formData.xp_reward,
        criteria: {
          type: formData.criteria_type,
          threshold: formData.criteria_threshold,
        },
        start_at: formData.start_at || null,
        end_at: formData.end_at || null,
        is_active: formData.is_active,
        created_by: user.id,
      });

      if (error) throw error;

      // Log audit
      await supabase.from('stryk_audit_logs').insert({
        organization_id: orgId,
        actor_user_id: user.id,
        action: 'challenge_created',
        entity_type: 'stryk_challenge',
        meta: { name: formData.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stryk-challenges', packId] });
      toast.success('Reto creado correctamente');
    },
    onError: (error) => {
      toast.error('Error al crear reto: ' + error.message);
    },
  });

  const updateChallenge = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: ChallengeFormData }) => {
      if (!orgId || !user?.id) throw new Error('Missing required data');

      const { error } = await supabase
        .from('stryk_challenges')
        .update({
          key: formData.key,
          name: formData.name,
          description: formData.description || null,
          xp_reward: formData.xp_reward,
          criteria: {
            type: formData.criteria_type,
            threshold: formData.criteria_threshold,
          },
          start_at: formData.start_at || null,
          end_at: formData.end_at || null,
          is_active: formData.is_active,
        })
        .eq('id', id);

      if (error) throw error;

      // Log audit
      await supabase.from('stryk_audit_logs').insert({
        organization_id: orgId,
        actor_user_id: user.id,
        action: 'challenge_updated',
        entity_type: 'stryk_challenge',
        entity_id: id,
        meta: { name: formData.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stryk-challenges', packId] });
      toast.success('Reto actualizado correctamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar reto: ' + error.message);
    },
  });

  const deleteChallenge = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId || !user?.id) throw new Error('Missing required data');

      const { error } = await supabase
        .from('stryk_challenges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit
      await supabase.from('stryk_audit_logs').insert({
        organization_id: orgId,
        actor_user_id: user.id,
        action: 'challenge_deleted',
        entity_type: 'stryk_challenge',
        entity_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stryk-challenges', packId] });
      toast.success('Reto eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar reto: ' + error.message);
    },
  });

  return {
    challenges: challenges ?? [],
    isLoading,
    createChallenge: createChallenge.mutate,
    updateChallenge: updateChallenge.mutate,
    deleteChallenge: deleteChallenge.mutate,
    isCreating: createChallenge.isPending,
    isUpdating: updateChallenge.isPending,
    isDeleting: deleteChallenge.isPending,
  };
}
