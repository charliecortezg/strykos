import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { corsHeaders } from "../_shared/cors.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const MAX_CONTEXT_CHARS = 15000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verify user and get org
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      return new Response(JSON.stringify({ error: "Sin organización" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orgId = profile.organization_id;

    // Verify role (org_owner or director_deportivo)
    const { data: roles } = await supabase
      .from("user_org_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", orgId);

    const allowedRoles = ["org_owner", "director_deportivo"];
    const hasAccess = roles?.some((r) => allowedRoles.includes(r.role));
    if (!hasAccess) {
      return new Response(JSON.stringify({ error: "Sin permisos" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!messages || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "Mensajes requeridos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for data fetching
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch academy data in parallel
    const [playersRes, categoriesRes, evaluationsRes, attendanceRes, paymentsRes, coachesRes, matchNotesRes] =
      await Promise.all([
        serviceClient
          .from("players")
          .select("id, name, category_id, is_active, created_at")
          .eq("organization_id", orgId)
          .limit(200),
        serviceClient
          .from("categories")
          .select("id, name, age_group, trainer_id, is_active")
          .eq("organization_id", orgId),
        serviceClient
          .from("evaluations")
          .select("id, player_id, category_id, period, age_group, overall_score, previous_overall, status, created_at")
          .eq("organization_id", orgId)
          .gte("created_at", ninetyDaysAgo)
          .order("created_at", { ascending: false })
          .limit(200),
        serviceClient
          .from("attendance")
          .select("player_id, date, status, performance_status, category_id")
          .eq("organization_id", orgId)
          .gte("date", ninetyDaysAgo.split("T")[0])
          .order("date", { ascending: false })
          .limit(200),
        serviceClient
          .from("payments")
          .select("id, player_id, amount, payment_method, payment_month, concept, notes, created_at")
          .eq("organization_id", orgId)
          .gte("created_at", ninetyDaysAgo)
          .order("created_at", { ascending: false })
          .limit(200),
        serviceClient
          .from("profiles")
          .select("id, full_name, email")
          .eq("organization_id", orgId)
          .eq("is_active", true),
        serviceClient
          .from("match_players")
          .select("player_id, note, match_id, goals, assists, performance, created_at")
          .eq("organization_id", orgId)
          .not("note", "is", null)
          .gte("created_at", ninetyDaysAgo)
          .order("created_at", { ascending: false })
          .limit(100),
      ]);

    // Get evaluation scores for recent evaluations
    const evalIds = (evaluationsRes.data || []).map((e) => e.id);
    let scoresData: any[] = [];
    if (evalIds.length > 0) {
      const { data } = await serviceClient
        .from("evaluation_scores")
        .select("evaluation_id, stat_key, score")
        .in("evaluation_id", evalIds.slice(0, 50));
      scoresData = data || [];
    }

    // Get coach role mappings
    const coachRoles = await serviceClient
      .from("user_org_roles")
      .select("user_id, role")
      .eq("organization_id", orgId)
      .in("role", ["entrenador", "director_deportivo"]);

    const coachIds = new Set(
      (coachRoles.data || [])
        .filter((r) => r.role === "entrenador")
        .map((r) => r.user_id)
    );

    const coaches = (coachesRes.data || []).filter((p) => coachIds.has(p.id));

    // Build context payload
    const contextPayload: Record<string, any> = {
      jugadores: (playersRes.data || []).map((p) => ({
        id: p.id,
        nombre: p.name,
        categoria_id: p.category_id,
        activo: p.is_active,
        fecha_registro: p.created_at,
      })),
      categorias: categoriesRes.data || [],
      evaluaciones: (evaluationsRes.data || []).map((e) => ({
        ...e,
        scores: scoresData.filter((s) => s.evaluation_id === e.id),
      })),
      asistencia: attendanceRes.data || [],
      pagos: paymentsRes.data || [],
      entrenadores: coaches.map((c) => ({
        id: c.id,
        nombre: c.full_name,
        email: c.email,
      })),
      notas_partidos: matchNotesRes.data || [],
    };

    let contextJson = JSON.stringify(contextPayload);
    let truncated = false;

    // Truncate if too large
    if (contextJson.length > MAX_CONTEXT_CHARS) {
      truncated = true;
      // Remove older attendance and payment records first
      contextPayload.asistencia = (contextPayload.asistencia as any[]).slice(0, 50);
      contextPayload.pagos = (contextPayload.pagos as any[]).slice(0, 50);
      contextPayload.notas_partidos = (contextPayload.notas_partidos as any[]).slice(0, 30);
      contextJson = JSON.stringify(contextPayload);

      if (contextJson.length > MAX_CONTEXT_CHARS) {
        contextPayload.evaluaciones = (contextPayload.evaluaciones as any[]).slice(0, 30);
        contextJson = JSON.stringify(contextPayload);
      }
    }

    const systemPrompt = `Eres el Copiloto IA de STRYK, el sistema de gestión de academias deportivas.
Tu función es ser el asistente privado del fundador de la academia.

Tienes acceso completo y en tiempo real a los datos de la academia:
- Jugadores activos e inactivos, sus categorías y fechas de registro
- Evaluaciones con puntuación en 6 pilares: Técnica, Táctica, Física, Mental, Social, Disciplina
- Entrenadores, sus categorías asignadas
- Asistencia por jugador y por sesión
- Estado de pagos
- Notas de partidos por jugador

Aquí están los datos actuales de la academia:
<academy_data>
${contextJson}
</academy_data>
${truncated ? "\n⚠️ Datos limitados a los más recientes por capacidad.\n" : ""}

Cuando el fundador haga preguntas:
1. Responde siempre en español
2. Sé directo y ejecutivo — el fundador quiere insights, no descripciones
3. Usa listas, tablas markdown o formatos claros cuando tengas múltiples datos que comparar
4. Cuando detectes anomalías (caída en rendimiento, pagos vencidos, baja asistencia), señálalos proactivamente con un ⚠️
5. Si el fundador pide una acción (agendar evaluación, enviar mensaje a un coach, registrar nota), confirma los detalles antes de ejecutar
6. Si no tienes suficientes datos para responder algo, dilo claramente en lugar de inventar
7. Cuando hagas referencias a jugadores o entrenadores, usa sus nombres, no IDs
8. Cruza datos entre categorías cuando sea útil (ej: categoría con más ausentismo + pagos pendientes)`;

    // Call AI gateway
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableApiKey) {
      return new Response(JSON.stringify({ error: "AI no configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResponse = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        temperature: 0.4,
        max_tokens: 2000,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(
        JSON.stringify({ error: "Error del servicio de IA", details: errText }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await aiResponse.json();
    const assistantMessage =
      aiData.choices?.[0]?.message?.content || "No pude generar una respuesta.";

    return new Response(
      JSON.stringify({ message: assistantMessage }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Copilot error:", err);
    return new Response(
      JSON.stringify({ error: "Error interno del copiloto" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
