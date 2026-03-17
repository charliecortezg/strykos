import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export function useUniformCampaigns() {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const qc = useQueryClient();

  const campaigns = useQuery({
    queryKey: ['uniform-campaigns', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uniform_campaigns')
        .select('*')
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createCampaign = useMutation({
    mutationFn: async (payload: { name: string; deadline?: string; notes?: string }) => {
      const { data, error } = await supabase
        .from('uniform_campaigns')
        .insert({ ...payload, org_id: orgId! })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uniform-campaigns'] });
      toast.success('Campaña creada');
    },
    onError: () => toast.error('Error al crear campaña'),
  });

  const closeCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('uniform_campaigns')
        .update({ status: 'closed' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uniform-campaigns'] });
      toast.success('Campaña cerrada');
    },
  });

  return { campaigns, createCampaign, closeCampaign };
}

export function useUniformOrders(campaignId: string | null) {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const qc = useQueryClient();

  const orders = useQuery({
    queryKey: ['uniform-orders', campaignId],
    enabled: !!campaignId && !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uniform_orders')
        .select('*')
        .eq('campaign_id', campaignId!)
        .eq('org_id', orgId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const updateOrder = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { error } = await supabase
        .from('uniform_orders')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['uniform-orders'] }),
  });

  const confirmNumber = useMutation({
    mutationFn: async (orderId: string) => {
      // Re-check availability before confirming
      const { data: order } = await supabase
        .from('uniform_orders')
        .select('*')
        .eq('id', orderId)
        .single();

      if (!order) throw new Error('Orden no encontrada');

      // Check conflicts
      const { data: conflicts } = await supabase
        .from('uniform_orders')
        .select('id')
        .eq('org_id', order.org_id)
        .eq('category_id', order.category_id)
        .eq('assigned_number', order.assigned_number)
        .eq('number_status', 'confirmed')
        .neq('id', orderId);

      if (conflicts && conflicts.length > 0) {
        throw new Error('Número ya confirmado en otra orden');
      }

      const { error } = await supabase
        .from('uniform_orders')
        .update({ number_status: 'confirmed' })
        .eq('id', orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uniform-orders'] });
      toast.success('Número confirmado');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteOrder = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('uniform_orders')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['uniform-orders'] });
      toast.success('Orden eliminada');
    },
  });

  return { orders, updateOrder, confirmNumber, deleteOrder };
}

export function useBlockedNumbers() {
  const { organization } = useAuth();
  const orgId = organization?.id;
  const qc = useQueryClient();

  const blocked = useQuery({
    queryKey: ['uniform-blocked-numbers', orgId],
    enabled: !!orgId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('uniform_blocked_numbers')
        .select('*')
        .eq('org_id', orgId!)
        .order('category_name');
      if (error) throw error;
      return data;
    },
  });

  const importCSV = useMutation({
    mutationFn: async (rows: { category: string; player: string; number: number }[]) => {
      // Get categories for this org
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name')
        .eq('organization_id', orgId!)
        .eq('is_active', true);

      if (!categories) throw new Error('No se pudieron cargar categorías');

      const results = { updated: 0, blocked: 0, warnings: [] as string[] };

      for (const row of rows) {
        const cat = categories.find(
          (c) => c.name.toLowerCase().trim() === row.category.toLowerCase().trim()
        );
        if (!cat) {
          results.warnings.push(`Categoría "${row.category}" no encontrada`);
          continue;
        }

        // Try to find player match
        const { data: players } = await supabase
          .from('players')
          .select('id, full_name')
          .eq('organization_id', orgId!)
          .eq('category_id', cat.id)
          .eq('is_active', true);

        const normalizedRowName = row.player.toLowerCase().trim();
        const matchedPlayer = players?.find(
          (p) => p.full_name.toLowerCase().trim() === normalizedRowName
        );

        if (matchedPlayer) {
          await supabase
            .from('players')
            .update({ jersey_number: row.number })
            .eq('id', matchedPlayer.id);
          results.updated++;
        } else {
          results.warnings.push(`Jugador "${row.player}" no encontrado en ${cat.name}`);
        }

        // Insert blocked number regardless
        const { error } = await supabase
          .from('uniform_blocked_numbers')
          .upsert(
            {
              org_id: orgId!,
              category_id: cat.id,
              category_name: cat.name,
              player_name: row.player,
              player_id: matchedPlayer?.id || null,
              number: row.number,
            },
            { onConflict: 'org_id,category_id,number' }
          );

        if (!error) results.blocked++;
      }

      return results;
    },
    onSuccess: (results) => {
      qc.invalidateQueries({ queryKey: ['uniform-blocked-numbers'] });
      toast.success(
        `${results.updated} actualizados · ${results.blocked} bloqueados · ${results.warnings.length} advertencias`
      );
    },
    onError: () => toast.error('Error en importación'),
  });

  return { blocked, importCSV };
}
