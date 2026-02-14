import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PILAR_TECNICO_KEYS = ['control_conduccion', 'pase_recepcion', 'decision_juego'];
const PILAR_MENTALIDAD_KEYS = ['actitud_esfuerzo', 'disciplina_constancia', 'autonomia_liderazgo'];
const MENTALIDAD_THRESHOLD = 12;

const STAT_LABELS: Record<string, string> = {
  actitud_esfuerzo: 'Actitud y Esfuerzo',
  disciplina_constancia: 'Disciplina y Constancia',
  autonomia_liderazgo: 'Autonomía y Liderazgo',
  control_conduccion: 'Control y Conducción',
  pase_recepcion: 'Pase y Recepción',
  decision_juego: 'Decisión y Juego Colectivo',
};

interface ProcessIDPRequest {
  organization_id: string;
  category_id: string;
  period: string;
}

async function generateAIRecommendations(
  playerName: string,
  ageGroup: string,
  scoresMap: Record<string, number>,
  focusAreas: { stat_key: string; score: number; focus_type: string }[],
  mentalidadLow: { stat_key: string; score: number }[],
  rubrics: { stat_key: string; band_min: number; band_max: number; bullets: string[] }[],
): Promise<{ ai_comment: string; ai_recommendations: string[]; ai_weekly_plan: string }> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('[process-idp] No LOVABLE_API_KEY, using static fallback');
    return {
      ai_comment: `${playerName} muestra un perfil de desarrollo interesante para su grupo de edad (${ageGroup}).`,
      ai_recommendations: [
        'Practicar ejercicios de control de balón 15 minutos diarios',
        'Realizar circuitos de pase corto con cambio de dirección',
        'Jugar partidos reducidos enfocándose en la toma de decisiones',
      ],
      ai_weekly_plan: 'Lunes y Miércoles: Ejercicios técnicos individuales (20 min). Viernes: Partido reducido con enfoque táctico.',
    };
  }

  const scoresText = Object.entries(scoresMap)
    .map(([k, v]) => `${STAT_LABELS[k] || k}: ${v}/20`)
    .join(', ');

  const focusText = focusAreas
    .map(fa => `${STAT_LABELS[fa.stat_key]} (${fa.score}/20, ${fa.focus_type === 'strengthen' ? 'POTENCIAR' : 'MEJORAR'})`)
    .join('; ');

  const mentalidadText = mentalidadLow.length > 0
    ? mentalidadLow.map(m => `${STAT_LABELS[m.stat_key]}: ${m.score}/20`).join(', ')
    : 'Todos los stats de mentalidad están en nivel aceptable.';

  const rubricsText = rubrics.length > 0
    ? rubrics.map(r => `${STAT_LABELS[r.stat_key] || r.stat_key} (${r.band_min}-${r.band_max}): ${(r.bullets as string[]).join('; ')}`).join('\n')
    : '';

  const prompt = `Eres un Director Deportivo de una academia de fútbol formativo. Genera un reporte personalizado para un jugador.

JUGADOR: ${playerName}
GRUPO DE EDAD: ${ageGroup}
SCORES: ${scoresText}
ÁREAS DE ENFOQUE TÉCNICO: ${focusText}
MENTALIDAD (stats bajos): ${mentalidadText}
${rubricsText ? `RÚBRICAS DEL NIVEL:\n${rubricsText}` : ''}

Genera:
1. Un comentario general sobre el jugador (2-3 oraciones, positivo pero realista, en español)
2. 3 recomendaciones específicas y accionables para las próximas semanas (en español)
3. Un plan semanal concreto de 3 días con actividades específicas (en español)

Sé específico con ejercicios reales de fútbol. No uses lenguaje genérico.`;

  try {
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'Eres un experto en desarrollo deportivo juvenil de fútbol. Responde siempre en español.' },
          { role: 'user', content: prompt },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'generate_idp_report',
            description: 'Generate personalized IDP report for a youth soccer player',
            parameters: {
              type: 'object',
              properties: {
                ai_comment: { type: 'string', description: 'General comment about the player (2-3 sentences in Spanish)' },
                ai_recommendations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of 3 specific actionable recommendations in Spanish',
                },
                ai_weekly_plan: { type: 'string', description: 'Concrete weekly plan with 3 training days in Spanish' },
              },
              required: ['ai_comment', 'ai_recommendations', 'ai_weekly_plan'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'generate_idp_report' } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[process-idp] AI gateway error:', response.status, errText);
      throw new Error('AI gateway error');
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      const parsed = JSON.parse(toolCall.function.arguments);
      return {
        ai_comment: parsed.ai_comment || '',
        ai_recommendations: parsed.ai_recommendations || [],
        ai_weekly_plan: parsed.ai_weekly_plan || '',
      };
    }
    throw new Error('No tool call in AI response');
  } catch (err) {
    console.error('[process-idp] AI generation failed, using fallback:', err);
    return {
      ai_comment: `${playerName} muestra un perfil de desarrollo interesante para su grupo de edad (${ageGroup}).`,
      ai_recommendations: [
        'Practicar ejercicios de control de balón 15 minutos diarios',
        'Realizar circuitos de pase corto con cambio de dirección',
        'Jugar partidos reducidos enfocándose en la toma de decisiones',
      ],
      ai_weekly_plan: 'Lunes y Miércoles: Ejercicios técnicos individuales (20 min). Viernes: Partido reducido con enfoque táctico.',
    };
  }
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { organization_id, category_id, period }: ProcessIDPRequest = await req.json();

    if (!organization_id || !category_id || !period) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get closed evaluations for this batch
    const { data: evaluations, error: evalError } = await supabaseAdmin
      .from('evaluations')
      .select('id, player_id, age_group')
      .eq('organization_id', organization_id)
      .eq('category_id', category_id)
      .eq('period', period)
      .eq('status', 'closed');

    if (evalError) throw evalError;
    if (!evaluations || evaluations.length === 0) {
      return new Response(JSON.stringify({ processed: 0, message: 'No closed evaluations found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get player names
    const playerIds = evaluations.map(e => e.player_id);
    const { data: players } = await supabaseAdmin
      .from('players')
      .select('id, full_name')
      .in('id', playerIds);
    const playerNames: Record<string, string> = {};
    players?.forEach(p => { playerNames[p.id] = p.full_name; });

    // Get rubrics for the age groups involved
    const ageGroups = [...new Set(evaluations.map(e => e.age_group))];
    const { data: rubrics } = await supabaseAdmin
      .from('evaluation_rubrics')
      .select('age_group, stat_key, band_min, band_max, bullets')
      .in('age_group', ageGroups);

    let processed = 0;
    let created = 0;
    let updated = 0;

    for (const evaluation of evaluations) {
      // Get scores for this evaluation
      const { data: scores } = await supabaseAdmin
        .from('evaluation_scores')
        .select('stat_key, score')
        .eq('evaluation_id', evaluation.id);

      if (!scores || scores.length < 6) continue;

      const scoresMap: Record<string, number> = {};
      scores.forEach(s => { scoresMap[s.stat_key] = s.score; });

      // === PILAR TECNICO: Focus Areas ===
      const tecnicoScores = PILAR_TECNICO_KEYS
        .map(key => ({ stat_key: key, score: scoresMap[key] || 0 }))
        .sort((a, b) => b.score - a.score);

      const focusAreas = [
        { ...tecnicoScores[0], focus_type: 'strengthen' as const },
        { ...tecnicoScores[1], focus_type: 'strengthen' as const },
        { ...tecnicoScores[2], focus_type: 'improve' as const },
      ];

      // === PILAR MENTALIDAD: Low stats ===
      const mentalidadLow = PILAR_MENTALIDAD_KEYS
        .filter(key => (scoresMap[key] || 0) < MENTALIDAD_THRESHOLD)
        .map(key => ({ stat_key: key, score: scoresMap[key] || 0 }));

      // Get relevant rubrics for this player's scores
      const playerRubrics = (rubrics || [])
        .filter(r => r.age_group === evaluation.age_group)
        .filter(r => {
          const score = scoresMap[r.stat_key];
          return score !== undefined && score >= r.band_min && score <= r.band_max;
        })
        .map(r => ({
          stat_key: r.stat_key,
          band_min: r.band_min,
          band_max: r.band_max,
          bullets: (r.bullets as unknown as string[]) || [],
        }));

      // Generate AI recommendations
      const playerName = playerNames[evaluation.player_id] || 'Jugador';
      const aiResult = await generateAIRecommendations(
        playerName, evaluation.age_group, scoresMap,
        focusAreas, mentalidadLow, playerRubrics,
      );

      // Build mentalidad actions with AI-generated content if available
      const mentalidadActions = PILAR_MENTALIDAD_KEYS
        .filter(key => (scoresMap[key] || 0) < MENTALIDAD_THRESHOLD)
        .map(key => ({
          stat_key: key,
          stat_label: STAT_LABELS[key],
          score: scoresMap[key] || 0,
          actions: getDefaultMentalidadActions(key),
          duration_days: 30,
        }));

      // Check for existing active IDP
      const { data: existingIDP } = await supabaseAdmin
        .from('idp_cycles')
        .select('id, starts_at')
        .eq('organization_id', organization_id)
        .eq('player_id', evaluation.player_id)
        .eq('status', 'active')
        .maybeSingle();

      const today = new Date().toISOString().slice(0, 10);

      if (existingIDP) {
        const startDate = new Date(existingIDP.starts_at);
        const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        let stage = '0_30';
        if (daysSinceStart > 60) stage = '61_90';
        else if (daysSinceStart > 30) stage = '31_60';

        await supabaseAdmin
          .from('idp_cycles')
          .update({
            latest_evaluation_id: evaluation.id,
            stage,
            plan_json: buildPlanJSON(focusAreas, mentalidadActions, scoresMap, aiResult),
          })
          .eq('id', existingIDP.id);

        await supabaseAdmin.from('stryk_events').insert({
          organization_id,
          player_id: evaluation.player_id,
          source_type: 'idp_updated',
          source_id: existingIDP.id,
          xp_delta: 0,
        }).then(() => {});

        updated++;
      } else {
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + 90);

        const planJSON = buildPlanJSON(focusAreas, mentalidadActions, scoresMap, aiResult);
        const planText = buildPlanText(focusAreas, mentalidadActions, aiResult);

        const { data: newIDP, error: insertError } = await supabaseAdmin
          .from('idp_cycles')
          .insert({
            organization_id,
            player_id: evaluation.player_id,
            status: 'active',
            starts_at: today,
            ends_at: endsAt.toISOString().slice(0, 10),
            stage: '0_30',
            initial_evaluation_id: evaluation.id,
            latest_evaluation_id: evaluation.id,
            plan_json: planJSON,
            plan_text: planText,
          })
          .select('id')
          .single();

        if (insertError) {
          console.error(`[process-idp] Error creating IDP for player ${evaluation.player_id}:`, insertError);
          continue;
        }

        const focusRows = focusAreas.map(fa => ({
          organization_id,
          idp_cycle_id: newIDP.id,
          stat_key: fa.stat_key,
          focus_type: fa.focus_type,
          initial_score: fa.score,
          target_score: fa.focus_type === 'strengthen'
            ? Math.min(20, fa.score + 2)
            : Math.min(20, fa.score + 3),
        }));

        await supabaseAdmin.from('idp_focus_areas').insert(focusRows);

        await supabaseAdmin.from('stryk_events').insert({
          organization_id,
          player_id: evaluation.player_id,
          source_type: 'idp_started',
          source_id: newIDP.id,
          xp_delta: 0,
        }).then(() => {});

        created++;
      }

      processed++;
    }

    // Trigger email reports
    try {
      await fetch(`${supabaseUrl}/functions/v1/send-idp-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ organization_id, player_ids: playerIds, period }),
      });
    } catch (emailErr) {
      console.error('[process-idp] Email trigger failed (non-blocking):', emailErr);
    }

    return new Response(JSON.stringify({ processed, created, updated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[process-idp] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function getDefaultMentalidadActions(statKey: string): string[] {
  const map: Record<string, string[]> = {
    actitud_esfuerzo: [
      'Llegar 10 minutos antes al entrenamiento',
      'Dar 3 palabras de ánimo a compañeros por sesión',
      'Completar todos los ejercicios sin quejarse',
    ],
    disciplina_constancia: [
      'Preparar su mochila la noche anterior',
      'Cumplir con la rutina de calentamiento en casa',
      'Registrar en una libreta qué practicó cada día',
    ],
    autonomia_liderazgo: [
      'Elegir 1 ejercicio y liderarlo en grupo',
      'Proponer una jugada nueva al equipo por semana',
      'Organizar el material al inicio y final del entrenamiento',
    ],
  };
  return map[statKey] || [];
}

function buildPlanJSON(
  focusAreas: { stat_key: string; score: number; focus_type: 'strengthen' | 'improve' }[],
  mentalidadActions: { stat_key: string; stat_label: string; score: number; actions: string[]; duration_days: number }[],
  _scoresMap: Record<string, number>,
  aiResult: { ai_comment: string; ai_recommendations: string[]; ai_weekly_plan: string },
) {
  return {
    focus_areas: focusAreas.map(fa => ({
      stat_key: fa.stat_key,
      stat_label: STAT_LABELS[fa.stat_key] || fa.stat_key,
      type: fa.focus_type,
      initial: fa.score,
      target: fa.focus_type === 'strengthen'
        ? Math.min(20, fa.score + 2)
        : Math.min(20, fa.score + 3),
    })),
    mentalidad_actions: mentalidadActions,
    weekly_plan: {
      description: aiResult.ai_weekly_plan || 'Practica 2-3 veces por semana enfocándote en tus áreas de desarrollo.',
      sessions_per_week: 3,
      focus_rotation: focusAreas.map(fa => STAT_LABELS[fa.stat_key] || fa.stat_key),
    },
    ai_comment: aiResult.ai_comment,
    ai_recommendations: aiResult.ai_recommendations,
  };
}

function buildPlanText(
  focusAreas: { stat_key: string; score: number; focus_type: 'strengthen' | 'improve' }[],
  mentalidadActions: { stat_key: string; stat_label: string; score: number; actions: string[]; duration_days: number }[],
  aiResult: { ai_comment: string; ai_recommendations: string[]; ai_weekly_plan: string },
): string {
  let text = '🎯 Plan de Desarrollo Individual (90 días)\n\n';

  if (aiResult.ai_comment) {
    text += `💬 ${aiResult.ai_comment}\n\n`;
  }

  text += '📊 Enfoque Técnico:\n';
  for (const fa of focusAreas) {
    const label = STAT_LABELS[fa.stat_key] || fa.stat_key;
    const tag = fa.focus_type === 'strengthen' ? '🟢 Potenciar' : '🟡 Mejorar';
    const target = fa.focus_type === 'strengthen' ? Math.min(20, fa.score + 2) : Math.min(20, fa.score + 3);
    text += `  ${tag} ${label}: ${fa.score} → ${target}\n`;
  }

  if (aiResult.ai_recommendations?.length > 0) {
    text += '\n📋 Recomendaciones:\n';
    for (const rec of aiResult.ai_recommendations) {
      text += `  • ${rec}\n`;
    }
  }

  if (mentalidadActions.length > 0) {
    text += '\n🧠 Indicaciones de Mentalidad:\n';
    for (const ma of mentalidadActions) {
      text += `  ${ma.stat_label} (${ma.score}/20):\n`;
      for (const action of ma.actions) {
        text += `    • ${action}\n`;
      }
    }
  }

  if (aiResult.ai_weekly_plan) {
    text += `\n📅 Plan semanal: ${aiResult.ai_weekly_plan}`;
  }

  return text;
}
