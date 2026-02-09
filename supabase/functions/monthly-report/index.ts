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

    // === Parallel queries ===
    const [
      newPlayersRes,
      churnedPlayersRes,
      totalActiveRes,
      paymentsRes,
      expensesRes,
      attendanceRes,
      totalPlayersForBillingRes,
    ] = await Promise.all([
      // New players (onboarded_at in the month)
      supabase
        .from("players")
        .select("id, full_name, category_id, category:categories(name)")
        .eq("organization_id", orgId)
        .gte("onboarded_at", monthStart)
        .lt("onboarded_at", monthEnd),

      // Churned players (offboarded_at in the month)
      supabase
        .from("players")
        .select("id, full_name, category_id, category:categories(name)")
        .eq("organization_id", orgId)
        .gte("offboarded_at", monthStart)
        .lt("offboarded_at", monthEnd),

      // Total active at end of month
      supabase
        .from("players")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", orgId)
        .eq("is_active", true),

      // Payments (Ingresos) for the month
      supabase
        .from("payments")
        .select("amount")
        .eq("organization_id", orgId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd),

      // Expenses (Egresos) for the month
      supabase
        .from("expenses")
        .select("amount")
        .eq("organization_id", orgId)
        .gte("expense_date", monthStart)
        .lt("expense_date", monthEnd),

      // Attendance for the month
      supabase
        .from("attendance")
        .select("status")
        .eq("organization_id", orgId)
        .gte("date", monthStart)
        .lt("date", monthEnd),

      // Total active non-scholarship players (for cobranza %)
      supabase
        .from("players")
        .select("id, payment_status", { count: "exact" })
        .eq("organization_id", orgId)
        .eq("is_active", true)
        .eq("is_scholarship", false),
    ]);

    const newPlayers = newPlayersRes.data || [];
    const churnedPlayers = churnedPlayersRes.data || [];
    const totalActive = totalActiveRes.count || 0;

    const newCount = newPlayers.length;
    const churnedCount = churnedPlayers.length;
    const netGrowth = newCount - churnedCount;

    // --- Ingresos ---
    const totalIngresos = (paymentsRes.data || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);

    // --- Egresos ---
    const totalEgresos = (expensesRes.data || []).reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

    // --- Churn rate ---
    // churn % = churned / (totalActive + churned) * 100  (beginning-of-period base)
    const churnBase = totalActive + churnedCount;
    const churnRate = churnBase > 0 ? Math.round((churnedCount / churnBase) * 100) : 0;

    // --- % Asistencia ---
    const attendanceRecords = attendanceRes.data || [];
    const totalAttendance = attendanceRecords.length;
    const presentCount = attendanceRecords.filter((a: any) => a.status === "presente").length;
    const attendanceRate = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    // --- % Cobranza ---
    const billablePlayers = totalPlayersForBillingRes.data || [];
    const totalBillable = billablePlayers.length;
    const paidPlayers = billablePlayers.filter((p: any) => p.payment_status === "al_dia").length;
    const collectionRate = totalBillable > 0 ? Math.round((paidPlayers / totalBillable) * 100) : 0;

    // Breakdown by category
    const categoryBreakdown: Record<string, { new: number; churned: number; name: string }> = {};
    for (const p of newPlayers) {
      const catId = p.category_id || "sin_categoria";
      const catName = (p.category as any)?.name || "Sin categoría";
      if (!categoryBreakdown[catId]) categoryBreakdown[catId] = { new: 0, churned: 0, name: catName };
      categoryBreakdown[catId].new++;
    }
    for (const p of churnedPlayers) {
      const catId = p.category_id || "sin_categoria";
      const catName = (p.category as any)?.name || "Sin categoría";
      if (!categoryBreakdown[catId]) categoryBreakdown[catId] = { new: 0, churned: 0, name: catName };
      categoryBreakdown[catId].churned++;
    }

    const snapshot = {
      month,
      new_players: newPlayers.map((p) => ({ id: p.id, name: p.full_name })),
      churned_players: churnedPlayers.map((p) => ({ id: p.id, name: p.full_name })),
      total_active: totalActive,
      net_growth: netGrowth,
      total_ingresos: totalIngresos,
      total_egresos: totalEgresos,
      churn_rate: churnRate,
      attendance_rate: attendanceRate,
      collection_rate: collectionRate,
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
