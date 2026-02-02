import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { StrykBadge, BadgeFormData } from '@/types/stryk-way';

export function useBadges(packId: string | null) {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const { data: badges, isLoading } = useQuery({
    queryKey: ['stryk-badges', packId],
    queryFn: async () => {
      if (!packId) return [];
      const { data, error } = await supabase
        .from('stryk_badges')
        .select('*')
        .eq('pack_id', packId)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as unknown as StrykBadge[];
    },
    enabled: !!packId,
  });

  const createBadge = useMutation({
    mutationFn: async (formData: BadgeFormData) => {
      if (!orgId || !packId || !user?.id) throw new Error('Missing required data');

      const { error } = await supabase.from('stryk_badges').insert({
        organization_id: orgId,
        pack_id: packId,
        key: formData.key,
        name: formData.name,
        description: formData.description || null,
        icon: formData.icon,
        rarity: formData.rarity,
        criteria: {
          type: formData.criteria_type,
          threshold: formData.criteria_threshold,
        },
        is_active: formData.is_active,
        created_by: user.id,
      });

      if (error) throw error;

      // Log audit
      await supabase.from('stryk_audit_logs').insert({
        organization_id: orgId,
        actor_user_id: user.id,
        action: 'badge_created',
        entity_type: 'stryk_badge',
        meta: { name: formData.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stryk-badges', packId] });
      toast.success('Badge creado correctamente');
    },
    onError: (error) => {
      toast.error('Error al crear badge: ' + error.message);
    },
  });

  const updateBadge = useMutation({
    mutationFn: async ({ id, formData }: { id: string; formData: BadgeFormData }) => {
      if (!orgId || !user?.id) throw new Error('Missing required data');

      const { error } = await supabase
        .from('stryk_badges')
        .update({
          key: formData.key,
          name: formData.name,
          description: formData.description || null,
          icon: formData.icon,
          rarity: formData.rarity,
          criteria: {
            type: formData.criteria_type,
            threshold: formData.criteria_threshold,
          },
          is_active: formData.is_active,
        })
        .eq('id', id);

      if (error) throw error;

      // Log audit
      await supabase.from('stryk_audit_logs').insert({
        organization_id: orgId,
        actor_user_id: user.id,
        action: 'badge_updated',
        entity_type: 'stryk_badge',
        entity_id: id,
        meta: { name: formData.name },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stryk-badges', packId] });
      toast.success('Badge actualizado correctamente');
    },
    onError: (error) => {
      toast.error('Error al actualizar badge: ' + error.message);
    },
  });

  const deleteBadge = useMutation({
    mutationFn: async (id: string) => {
      if (!orgId || !user?.id) throw new Error('Missing required data');

      const { error } = await supabase
        .from('stryk_badges')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log audit
      await supabase.from('stryk_audit_logs').insert({
        organization_id: orgId,
        actor_user_id: user.id,
        action: 'badge_deleted',
        entity_type: 'stryk_badge',
        entity_id: id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stryk-badges', packId] });
      toast.success('Badge eliminado');
    },
    onError: (error) => {
      toast.error('Error al eliminar badge: ' + error.message);
    },
  });

  return {
    badges: badges ?? [],
    isLoading,
    createBadge: createBadge.mutate,
    updateBadge: updateBadge.mutate,
    deleteBadge: deleteBadge.mutate,
    isCreating: createBadge.isPending,
    isUpdating: updateBadge.isPending,
    isDeleting: deleteBadge.isPending,
  };
}
