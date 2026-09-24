import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PERMANENT_BLOCKS = [67, 69];
const MIN_NUMBER = 1;
const MAX_NUMBER = 99;
const PRICES: Record<string, number> = {
  manga_corta: 500,
  solo_camisa: 350,
};

const VALID_SIZES = [
  "4", "6", "8", "10", "12", "14", "16",
  "S", "M", "L", "XL", "XXL",
  "S-F", "M-F", "L-F", "XL-F",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return json({ error: "Token requerido" }, 400);
  }

  // Fetch campaign by token
  const { data: campaign, error: campErr } = await supabase
    .from("uniform_campaigns")
    .select("id, org_id, name, deadline, status")
    .eq("public_token", token)
    .single();

  if (campErr || !campaign) {
    return json({ error: "Link inválido" }, 404);
  }

  if (campaign.status === "closed") {
    return json({ error: "El período de pedidos ha cerrado" }, 409);
  }

  // GET — campaign info
  if (req.method === "GET") {
    const action = url.searchParams.get("action");

    if (action === "available-numbers") {
      const categoryId = url.searchParams.get("category_id");
      if (!categoryId) return json({ error: "category_id requerido" }, 400);

      const playerId = url.searchParams.get("player_id");
      if (!playerId) return json({ error: "player_id requerido" }, 400);

      const player = await getCampaignPlayer(
        supabase,
        campaign.org_id,
        categoryId,
        playerId
      );
      if (!player) return json({ error: "Jugador inválido" }, 400);

      const occupied = await getOccupiedNumbers(
        supabase,
        campaign.org_id,
        categoryId,
        player.id,
        player.full_name
      );
      return json({ occupied, min: MIN_NUMBER, max: MAX_NUMBER });
    }

    if (action === "players") {
      const categoryId = url.searchParams.get("category_id");
      if (!categoryId) return json({ error: "category_id requerido" }, 400);

      const { data: category } = await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .eq("organization_id", campaign.org_id)
        .eq("is_active", true)
        .maybeSingle();

      if (!category) return json({ error: "Categoría inválida" }, 400);

      const { data: players, error: playersErr } = await supabase
        .from("players")
        .select("id, full_name")
        .eq("organization_id", campaign.org_id)
        .eq("category_id", categoryId)
        .eq("is_active", true)
        .order("full_name");

      if (playersErr) return json({ error: "Error al consultar jugadores" }, 500);
      return json({ players: players || [] });
    }

    // Default: return campaign data + categories
    const { data: categories } = await supabase
      .from("categories")
      .select("id, name")
      .eq("organization_id", campaign.org_id)
      .eq("is_active", true)
      .order("name");

    return json({
      campaign_id: campaign.id,
      campaign_name: campaign.name,
      deadline: campaign.deadline,
      categories: categories || [],
    });
  }

  // POST — create order
  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Body inválido" }, 400);
    }

    const {
      player_name,
      player_id,
      category_id,
      category_name,
      uniform_type,
      jersey_size,
      name_on_jersey,
      requested_number,
      notes,
    } = body;

    // Validations
    if (!player_id) return json({ error: "Jugador requerido" }, 400);
    if (!category_id) return json({ error: "Categoría requerida" }, 400);

    // Verify category belongs to org
    const { data: cat } = await supabase
      .from("categories")
      .select("id, name")
      .eq("id", category_id)
      .eq("organization_id", campaign.org_id)
      .single();

    if (!cat) return json({ error: "Categoría inválida" }, 400);

    const player = await getCampaignPlayer(
      supabase,
      campaign.org_id,
      category_id,
      player_id
    );
    if (!player) return json({ error: "Selecciona un jugador válido" }, 400);

    if (!uniform_type || !PRICES[uniform_type])
      return json({ error: "Tipo de uniforme inválido" }, 400);

    if (!jersey_size || !VALID_SIZES.includes(jersey_size))
      return json({ error: "Talla inválida" }, 400);

    if (!name_on_jersey?.trim() || name_on_jersey.trim().length > 12)
      return json({ error: "Nombre en camiseta inválido (máx 12 caracteres)" }, 400);

    const num = Number(requested_number);
    if (!Number.isInteger(num) || num < MIN_NUMBER || num > MAX_NUMBER)
      return json({ error: "Número debe ser entre 1 y 99" }, 400);

    if (PERMANENT_BLOCKS.includes(num))
      return json({ success: false, message: "Número no disponible. Elige otro." }, 409);

    // Check occupied (excluye el número si ya pertenece al mismo jugador)
    const occupied = await getOccupiedNumbers(
      supabase,
      campaign.org_id,
      category_id,
      player.id,
      player.full_name
    );

    if (occupied.includes(num)) {
      return json(
        { success: false, message: "Número no disponible. Elige otro." },
        409
      );
    }

    // Insert order
    const price = PRICES[uniform_type];
    const { data: order, error: insertErr } = await supabase
      .from("uniform_orders")
      .insert({
        org_id: campaign.org_id,
        campaign_id: campaign.id,
        player_id: player.id,
        player_name: player.full_name,
        category_id,
        category_name: category_name || cat.name,
        uniform_type,
        jersey_size,
        name_on_jersey: name_on_jersey.trim().toUpperCase(),
        requested_number: num,
        assigned_number: num,
        number_status: "submitted",
        price,
        notes: notes?.trim() ? notes.trim().slice(0, 500) : null,
      })
      .select()
      .single();

    if (insertErr) {
      // Unique constraint violation
      if (insertErr.code === "23505") {
        return json(
          { success: false, message: "Número no disponible. Elige otro." },
          409
        );
      }
      console.error("Insert error:", insertErr);
      return json({ error: "Error al crear pedido" }, 500);
    }

    return json({
      success: true,
      data: {
        player_name: order.player_name,
        category_name: order.category_name,
        uniform_type: order.uniform_type,
        jersey_size: order.jersey_size,
        name_on_jersey: order.name_on_jersey,
        assigned_number: order.assigned_number,
        price: order.price,
      },
    });
  }

  return json({ error: "Método no permitido" }, 405);
});

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

async function getCampaignPlayer(
  supabase: any,
  orgId: string,
  categoryId: string,
  playerId: string
): Promise<{ id: string; full_name: string } | null> {
  const { data } = await supabase
    .from("players")
    .select("id, full_name")
    .eq("id", playerId)
    .eq("organization_id", orgId)
    .eq("category_id", categoryId)
    .eq("is_active", true)
    .maybeSingle();

  return data || null;
}

async function getOccupiedNumbers(
  supabase: any,
  orgId: string,
  categoryId: string,
  playerId: string,
  playerName: string
): Promise<number[]> {
  const occupied = new Set<number>(PERMANENT_BLOCKS);
  const requester = normalizeName(playerName);

  // Players with jersey_number in this category
  const { data: players } = await supabase
    .from("players")
    .select("id, jersey_number, full_name")
    .eq("organization_id", orgId)
    .eq("category_id", categoryId)
    .not("jersey_number", "is", null);

  players?.forEach((p: any) => {
    // El jugador conserva su propio número: no se bloquea para sí mismo
    if (p.id === playerId) return;
    occupied.add(p.jersey_number);
  });

  // Blocked numbers
  const { data: blocked } = await supabase
    .from("uniform_blocked_numbers")
    .select("number, player_id, player_name")
    .eq("org_id", orgId)
    .eq("category_id", categoryId);

  blocked?.forEach((b: any) => {
    // Misma excepción: el número bloqueado a nombre de este jugador queda libre para él
    if (b.player_id === playerId) return;
    if (!b.player_id && b.player_name && normalizeName(b.player_name) === requester) return;
    occupied.add(b.number);
  });

  // Orders (submitted or confirmed)
  const { data: orders } = await supabase
    .from("uniform_orders")
    .select("assigned_number, player_id, player_name")
    .eq("org_id", orgId)
    .eq("category_id", categoryId)
    .in("number_status", ["submitted", "confirmed"]);

  orders?.forEach((o: any) => {
    if (o.player_id === playerId) return;
    if (!o.player_id && normalizeName(o.player_name) === requester) return;
    if (o.assigned_number) occupied.add(o.assigned_number);
  });

  return Array.from(occupied).sort((a, b) => a - b);
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
