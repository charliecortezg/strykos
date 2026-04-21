import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CheerCampaign {
  id: string;
  org_id: string;
  name: string;
  deadline: string | null;
  notes: string | null;
  status: 'open' | 'closed';
  public_token: string;
  price_per_item: number;
  created_at: string;
  updated_at: string;
}

export interface CheerOrderItem {
  id: string;
  order_id: string;
  org_id: string;
  campaign_id: string;
  name_on_jersey: string;
  number_on_jersey: number | null;
  size: string;
  item_price: number;
}

export interface CheerOrder {
  id: string;
  org_id: string;
  campaign_id: string;
  buyer_name: string;
  buyer_whatsapp: string;
  total_items: number;
  total_price: number;
  paid: boolean;
  delivered: boolean;
  created_at: string;
  items: CheerOrderItem[];
}

// =====================
// CAMPAIGNS
// =====================

export function useCheerCampaigns(orgId: string | undefined) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['cheer-campaigns', orgId],
    queryFn: async () => {
      if (!orgId) return [] as (CheerCampaign & { order_count: number; revenue: number })[];
      const { data, error } = await supabase
        .from('cheer_campaigns')
        .select('*, cheer_orders(total_items, total_price, paid)')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []).map((c: any) => {
        const orders = c.cheer_orders ?? [];
        const order_count = orders.reduce(
          (s: number, o: any) => s + (o.total_items ?? 0),
          0,
        );
        const revenue = orders.reduce(
          (s: number, o: any) => s + Number(o.total_price ?? 0),
          0,
        );
        const { cheer_orders, ...rest } = c;
        return { ...rest, order_count, revenue } as CheerCampaign & {
          order_count: number;
          revenue: number;
        };
      });
    },
    enabled: !!orgId,
  });

  const create = useMutation({
    mutationFn: async (input: {
      name: string;
      deadline: string | null;
      notes: string | null;
      price_per_item?: number;
    }) => {
      if (!orgId) throw new Error('Organización no encontrada');
      const { data, error } = await supabase
        .from('cheer_campaigns')
        .insert({
          org_id: orgId,
          name: input.name,
          deadline: input.deadline,
          notes: input.notes,
          price_per_item: input.price_per_item ?? 350,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheer-campaigns', orgId] });
      toast.success('Campaña creada');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error al crear campaña'),
  });

  const close = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('cheer_campaigns')
        .update({ status: 'closed' })
        .eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheer-campaigns', orgId] });
      toast.success('Campaña cerrada');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error al cerrar campaña'),
  });

  const reopen = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await supabase
        .from('cheer_campaigns')
        .update({ status: 'open' })
        .eq('id', campaignId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheer-campaigns', orgId] });
      toast.success('Campaña reabierta');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error al reabrir campaña'),
  });

  return { list, create, close, reopen };
}

// =====================
// ORDERS
// =====================

export function useCheerOrders(campaignId: string | undefined) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ['cheer-orders', campaignId],
    queryFn: async () => {
      if (!campaignId) return [] as CheerOrder[];
      const { data, error } = await supabase
        .from('cheer_orders')
        .select('*, items:cheer_order_items(*)')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as CheerOrder[];
    },
    enabled: !!campaignId,
  });

  const togglePaid = useMutation({
    mutationFn: async ({ id, paid }: { id: string; paid: boolean }) => {
      const { error } = await supabase
        .from('cheer_orders')
        .update({ paid })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheer-orders', campaignId] });
      qc.invalidateQueries({ queryKey: ['cheer-campaigns'] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error al actualizar'),
  });

  const toggleDelivered = useMutation({
    mutationFn: async ({ id, delivered }: { id: string; delivered: boolean }) => {
      const { error } = await supabase
        .from('cheer_orders')
        .update({ delivered })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheer-orders', campaignId] });
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error al actualizar'),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cheer_orders').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cheer-orders', campaignId] });
      qc.invalidateQueries({ queryKey: ['cheer-campaigns'] });
      toast.success('Pedido eliminado');
    },
    onError: (e: any) => toast.error(e?.message ?? 'Error al eliminar pedido'),
  });

  return { list, togglePaid, toggleDelivered, remove };
}
