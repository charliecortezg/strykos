import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify user
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user's organization
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "No organization" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;
    const { month } = await req.json(); // YYYY-MM

    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return new Response(JSON.stringify({ error: "Invalid month format (YYYY-MM)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthStart = `${month}-01`;
    const nextMonth = new Date(monthStart);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    const monthEnd = nextMonth.toISOString().split("T")[0];

    // New players (onboarded_at in the month)
    const { data: newPlayers } = await supabase
      .from("players")
      .select("id, full_name, category_id, category:categories(name)")
      .eq("organization_id", orgId)
      .gte("onboarded_at", monthStart)
      .lt("onboarded_at", monthEnd);

    // Churned players (offboarded_at in the month)
    const { data: churnedPlayers } = await supabase
      .from("players")
      .select("id, full_name, category_id, category:categories(name)")
      .eq("organization_id", orgId)
      .gte("offboarded_at", monthStart)
      .lt("offboarded_at", monthEnd);

    // Total active at end of month
    const { count: totalActive } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", orgId)
      .eq("is_active", true);

    const newCount = newPlayers?.length || 0;
    const churnedCount = churnedPlayers?.length || 0;
    const netGrowth = newCount - churnedCount;

    // Breakdown by category
    const categoryBreakdown: Record<string, { new: number; churned: number; name: string }> = {};
    for (const p of newPlayers || []) {
      const catId = p.category_id || "sin_categoria";
      const catName = (p.category as any)?.name || "Sin categoría";
      if (!categoryBreakdown[catId]) categoryBreakdown[catId] = { new: 0, churned: 0, name: catName };
      categoryBreakdown[catId].new++;
    }
    for (const p of churnedPlayers || []) {
      const catId = p.category_id || "sin_categoria";
      const catName = (p.category as any)?.name || "Sin categoría";
      if (!categoryBreakdown[catId]) categoryBreakdown[catId] = { new: 0, churned: 0, name: catName };
      categoryBreakdown[catId].churned++;
    }

    const snapshot = {
      month,
      new_players: (newPlayers || []).map((p) => ({ id: p.id, name: p.full_name })),
      churned_players: (churnedPlayers || []).map((p) => ({ id: p.id, name: p.full_name })),
      total_active: totalActive || 0,
      net_growth: netGrowth,
      category_breakdown: Object.values(categoryBreakdown),
    };

    // Upsert into monthly_reports
    const { data: report, error: upsertError } = await supabase
      .from("monthly_reports")
      .upsert(
        {
          organization_id: orgId,
          report_month: monthStart,
          new_players_count: newCount,
          churned_count: churnedCount,
          snapshot,
          generated_by: user.id,
        },
        { onConflict: "organization_id,report_month" }
      )
      .select()
      .single();

    if (upsertError) {
      console.error("Upsert error:", upsertError);
      return new Response(JSON.stringify({ error: upsertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, report }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
