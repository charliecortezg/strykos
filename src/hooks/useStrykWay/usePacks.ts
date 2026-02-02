import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { StrykPack, StrykRuleset } from '@/types/stryk-way';

export function usePacks() {
  const { organization, user } = useAuth();
  const queryClient = useQueryClient();
  const orgId = organization?.id;

  const { data: packs, isLoading } = useQuery({
    queryKey: ['stryk-packs', orgId],
    queryFn: async () => {
      if (!orgId) return [];
      const { data, error } = await supabase
        .from('stryk_packs')
        .select('*')
        .eq('organization_id', orgId)
        .order('version', { ascending: false });
      
      if (error) throw error;
      return data as unknown as StrykPack[];
    },
    enabled: !!orgId,
  });

  const { data: publishedPack } = useQuery({
    queryKey: ['stryk-pack-published', orgId],
    queryFn: async () => {
      if (!orgId) return null;
      const { data, error } = await supabase
        .from('stryk_packs')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'published')
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as StrykPack | null;
    },
    enabled: !!orgId,
  });

  const { data: ruleset } = useQuery({
    queryKey: ['stryk-ruleset', publishedPack?.id],
    queryFn: async () => {
      if (!publishedPack?.id) return null;
      const { data, error } = await supabase
        .from('stryk_rulesets')
        .select('*')
        .eq('pack_id', publishedPack.id)
        .maybeSingle();
      
      if (error) throw error;
      return data as unknown as StrykRuleset | null;
    },
    enabled: !!publishedPack?.id,
  });

  const publishPack = useMutation({
    mutationFn: async (packId: string) => {
      if (!orgId || !user?.id) throw new Error('No organization or user');

      // Archive current published pack
      await supabase
        .from('stryk_packs')
        .update({ status: 'archived' })
        .eq('organization_id', orgId)
        .eq('status', 'published');

      // Publish the selected pack
      const { error } = await supabase
        .from('stryk_packs')
        .update({ 
          status: 'published',
          published_at: new Date().toISOString(),
          published_by: user.id,
        })
        .eq('id', packId);

      if (error) throw error;

      // Log audit
      await supabase.from('stryk_audit_logs').insert({
        organization_id: orgId,
        actor_user_id: user.id,
        action: 'pack_published',
        entity_type: 'stryk_pack',
        entity_id: packId,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stryk-packs'] });
      queryClient.invalidateQueries({ queryKey: ['stryk-pack-published'] });
      toast.success('Pack publicado correctamente');
    },
    onError: (error) => {
      toast.error('Error al publicar pack: ' + error.message);
    },
  });

  return {
    packs: packs ?? [],
    publishedPack,
    ruleset,
    isLoading,
    publishPack: publishPack.mutate,
    isPublishing: publishPack.isPending,
  };
}
