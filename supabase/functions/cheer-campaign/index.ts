import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

const VALID_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
type Size = (typeof VALID_SIZES)[number];

interface OrderItemInput {
  name_on_jersey?: unknown;
  number_on_jersey?: unknown;
  size?: unknown;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  try {
    const url = new URL(req.url);

    // ===========================
    // GET — fetch campaign by token
    // ===========================
    if (req.method === 'GET') {
      const token = url.searchParams.get('token');
      if (!token) {
        return jsonResponse({ error: 'Token requerido' }, 400);
      }

      const { data: campaign, error } = await supabase
        .from('cheer_campaigns')
        .select('id, name, deadline, notes, status, price_per_item, org_id')
        .eq('public_token', token)
        .maybeSingle();

      if (error) {
        console.error('Error fetching campaign:', error);
        return jsonResponse({ error: 'Error al consultar campaña' }, 500);
      }
      if (!campaign) {
        return jsonResponse({ error: 'Campaña no encontrada' }, 404);
      }

      return jsonResponse({ campaign });
    }

    // ===========================
    // POST — create order with items
    // ===========================
    if (req.method === 'POST') {
      const body = await req.json().catch(() => null);
      if (!body || typeof body !== 'object') {
        return jsonResponse({ error: 'Body inválido' }, 400);
      }

      const {
        token,
        buyer_name,
        buyer_whatsapp,
        items,
      } = body as {
        token?: string;
        buyer_name?: string;
        buyer_whatsapp?: string;
        items?: OrderItemInput[];
      };

      // --- Required fields
      if (!token || typeof token !== 'string') {
        return jsonResponse({ error: 'Token requerido' }, 400);
      }
      if (!buyer_name || typeof buyer_name !== 'string' || !buyer_name.trim()) {
        return jsonResponse({ error: 'Nombre del comprador requerido' }, 400);
      }
      if (
        !buyer_whatsapp ||
        typeof buyer_whatsapp !== 'string' ||
        !buyer_whatsapp.trim()
      ) {
        return jsonResponse({ error: 'WhatsApp requerido' }, 400);
      }
      if (!Array.isArray(items) || items.length < 1 || items.length > 5) {
        return jsonResponse(
          { error: 'Debes incluir entre 1 y 5 camisetas' },
          400,
        );
      }

      // --- Validate campaign
      const { data: campaign, error: campErr } = await supabase
        .from('cheer_campaigns')
        .select('id, org_id, status, deadline, price_per_item')
        .eq('public_token', token)
        .maybeSingle();

      if (campErr) {
        console.error('Campaign lookup error:', campErr);
        return jsonResponse({ error: 'Error al consultar campaña' }, 500);
      }
      if (!campaign) {
        return jsonResponse({ error: 'Campaña no encontrada' }, 404);
      }
      if (campaign.status !== 'open') {
        return jsonResponse({ error: 'Esta campaña ya está cerrada' }, 400);
      }
      if (campaign.deadline) {
        const deadline = new Date(campaign.deadline + 'T23:59:59');
        if (Date.now() > deadline.getTime()) {
          return jsonResponse(
            { error: 'La fecha límite de esta campaña ya pasó' },
            400,
          );
        }
      }

      // --- Validate each item
      const cleanItems: {
        name_on_jersey: string;
        number_on_jersey: number | null;
        size: Size;
        item_price: number;
      }[] = [];

      const price = Number(campaign.price_per_item) || 350;

      for (let i = 0; i < items.length; i++) {
        const it = items[i];
        const name =
          typeof it.name_on_jersey === 'string'
            ? it.name_on_jersey.trim().toUpperCase()
            : '';
        if (!name) {
          return jsonResponse(
            { error: `Camiseta #${i + 1}: nombre requerido` },
            400,
          );
        }
        if (name.length > 12) {
          return jsonResponse(
            { error: `Camiseta #${i + 1}: nombre máximo 12 caracteres` },
            400,
          );
        }
        const size = it.size as Size;
        if (!VALID_SIZES.includes(size)) {
          return jsonResponse(
            { error: `Camiseta #${i + 1}: talla inválida` },
            400,
          );
        }
        let num: number | null = null;
        if (
          it.number_on_jersey !== null &&
          it.number_on_jersey !== undefined &&
          it.number_on_jersey !== ''
        ) {
          const n = Number(it.number_on_jersey);
          if (!Number.isInteger(n) || n < 1 || n > 99) {
            return jsonResponse(
              { error: `Camiseta #${i + 1}: número debe estar entre 1 y 99` },
              400,
            );
          }
          num = n;
        }
        cleanItems.push({
          name_on_jersey: name,
          number_on_jersey: num,
          size,
          item_price: price,
        });
      }

      const totalItems = cleanItems.length;
      const totalPrice = cleanItems.reduce((s, it) => s + it.item_price, 0);

      // --- Insert order
      const { data: order, error: orderErr } = await supabase
        .from('cheer_orders')
        .insert({
          org_id: campaign.org_id,
          campaign_id: campaign.id,
          buyer_name: buyer_name.trim().slice(0, 200),
          buyer_whatsapp: buyer_whatsapp.trim().slice(0, 30),
          total_items: totalItems,
          total_price: totalPrice,
        })
        .select('id, created_at')
        .single();

      if (orderErr || !order) {
        console.error('Insert order error:', orderErr);
        return jsonResponse({ error: 'Error al crear pedido' }, 500);
      }

      // --- Insert items
      const itemsRows = cleanItems.map((it) => ({
        order_id: order.id,
        org_id: campaign.org_id,
        campaign_id: campaign.id,
        ...it,
      }));

      const { data: insertedItems, error: itemsErr } = await supabase
        .from('cheer_order_items')
        .insert(itemsRows)
        .select('id, name_on_jersey, number_on_jersey, size, item_price');

      if (itemsErr) {
        console.error('Insert items error:', itemsErr);
        // Best-effort cleanup
        await supabase.from('cheer_orders').delete().eq('id', order.id);
        return jsonResponse({ error: 'Error al guardar camisetas' }, 500);
      }

      return jsonResponse({
        success: true,
        order: {
          id: order.id,
          buyer_name: buyer_name.trim(),
          buyer_whatsapp: buyer_whatsapp.trim(),
          total_items: totalItems,
          total_price: totalPrice,
          items: insertedItems,
        },
      });
    }

    return jsonResponse({ error: 'Método no permitido' }, 405);
  } catch (err) {
    console.error('Unexpected error:', err);
    return jsonResponse({ error: 'Error inesperado' }, 500);
  }
});
