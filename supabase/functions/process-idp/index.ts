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

interface InsightsJSON {
  fortalezas: string[];
  debilidades: string[];
  habitos: string[];
  riesgo: string;
  palabras_clave: string[];
}

async function generateAIRecommendations(
  playerName: string,
  ageGroup: string,
  categoryName: string,
  scoresMap: Record<string, number>,
  focusAreas: { stat_key: string; score: number; focus_type: string }[],
  mentalidadLow: { stat_key: string; score: number }[],
  rubrics: { stat_key: string; band_min: number; band_max: number; bullets: string[] }[],
  insights: InsightsJSON | null,
  deltaScores: Record<string, number> | null,
  attendanceContext: { presente: number; total: number; pct: number } | null,
): Promise<{
  ai_comment: string;
  ai_recommendations: string[];
  ai_weekly_plan: string;
  diagnostico: string;
  foco_conductual: string | null;
}> {
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
      diagnostico: `${playerName} presenta un nivel en desarrollo para su grupo de edad.`,
      foco_conductual: null,
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

  // Build delta text
  let deltaText = 'Primera evaluación (sin datos anteriores).';
  if (deltaScores) {
    deltaText = Object.entries(deltaScores)
      .map(([k, v]) => `${STAT_LABELS[k] || k}: ${v > 0 ? '+' : ''}${v}`)
      .join(', ');
  }

  // Build insights text
  let insightsText = 'Sin comentarios del entrenador.';
  if (insights) {
    insightsText = `Fortalezas: ${insights.fortalezas.join(', ')}
  Debilidades: ${insights.debilidades.join(', ')}
  Hábitos observados: ${insights.habitos.join(', ')}
  Nivel de riesgo: ${insights.riesgo}`;
  }

  // Build attendance text
  let attendanceText = 'Sin datos de asistencia.';
  if (attendanceContext && attendanceContext.total > 0) {
    attendanceText = `${attendanceContext.presente}/${attendanceContext.total} (${attendanceContext.pct}%)`;
  }

  const prompt = `Eres un Director Deportivo experto en fútbol formativo. Genera un plan de desarrollo personalizado.

JUGADOR: ${playerName}
CATEGORÍA: ${categoryName}
GRUPO DE EDAD: ${ageGroup}

SCORES ACTUALES: ${scoresText}
ÁREAS DE ENFOQUE TÉCNICO: ${focusText}
MENTALIDAD (stats bajos): ${mentalidadText}
DELTA VS ANTERIOR: ${deltaText}

INSIGHTS DEL ENTRENADOR:
  ${insightsText}

ASISTENCIA (30 días): ${attendanceText}

${rubricsText ? `RÚBRICAS DEL NIVEL:\n${rubricsText}` : ''}

Genera:
1. DIAGNÓSTICO SINTÉTICO: 2-3 oraciones que crucen números + comentario del entrenador + asistencia. Si la asistencia es baja (<70%), mencionarlo como factor limitante.
2. COMENTARIO GENERAL: 2-3 oraciones positivas pero realistas sobre el jugador.
3. FOCO TÉCNICO: 3 recomendaciones específicas y accionables priorizando stats débiles + debilidades del entrenador + delta negativo.
4. FOCO CONDUCTUAL: Si los insights del entrenador indican hábitos problemáticos o riesgo medio/alto, escribir 1-2 oraciones sobre rutina y consistencia. Si no aplica, dejar vacío.
5. PLAN SEMANAL: Plan concreto de 3 días con actividades específicas de fútbol.

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
                diagnostico: { type: 'string', description: 'Synthetic diagnosis crossing numbers + comments + attendance (2-3 sentences in Spanish)' },
                ai_comment: { type: 'string', description: 'General positive comment about the player (2-3 sentences in Spanish)' },
                ai_recommendations: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Array of 3 specific actionable recommendations in Spanish',
                },
                ai_weekly_plan: { type: 'string', description: 'Concrete weekly plan with 3 training days in Spanish' },
                foco_conductual: { type: 'string', description: 'Behavioral focus if applicable, or empty string if not needed' },
              },
              required: ['diagnostico', 'ai_comment', 'ai_recommendations', 'ai_weekly_plan', 'foco_conductual'],
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
        diagnostico: parsed.diagnostico || '',
        ai_comment: parsed.ai_comment || '',
        ai_recommendations: parsed.ai_recommendations || [],
        ai_weekly_plan: parsed.ai_weekly_plan || '',
        foco_conductual: parsed.foco_conductual || null,
      };
    }
    throw new Error('No tool call in AI response');
  } catch (err) {
    console.error('[process-idp] AI generation failed, using fallback:', err);
    return {
      diagnostico: `${playerName} presenta un nivel en desarrollo para su grupo de edad (${ageGroup}).`,
      ai_comment: `${playerName} muestra un perfil de desarrollo interesante para su grupo de edad (${ageGroup}).`,
      ai_recommendations: [
        'Practicar ejercicios de control de balón 15 minutos diarios',
        'Realizar circuitos de pase corto con cambio de dirección',
        'Jugar partidos reducidos enfocándose en la toma de decisiones',
      ],
      ai_weekly_plan: 'Lunes y Miércoles: Ejercicios técnicos individuales (20 min). Viernes: Partido reducido con enfoque táctico.',
      foco_conductual: null,
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

    // Get category name and age_group
    const { data: categoryData } = await supabaseAdmin
      .from('categories')
      .select('name, age_group')
      .eq('id', category_id)
      .single();
    const categoryName = categoryData?.name || 'Categoría';
    const categoryAgeGroup = categoryData?.age_group || '8-9';

    // Get closed evaluations for this batch
    const { data: evaluations, error: evalError } = await supabaseAdmin
      .from('evaluations')
      .select('id, player_id, age_group, insights_json')
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
    const ageGroups = [...new Set(evaluations.map(e => e.age_group || categoryAgeGroup))];
    const { data: rubrics } = await supabaseAdmin
      .from('evaluation_rubrics')
      .select('age_group, stat_key, band_min, band_max, bullets')
      .in('age_group', ageGroups);

    // Get previous period scores for delta calculation
    const [prevYear, prevMonth] = period.split('-').map(Number);
    const prevPeriod = prevMonth === 1 ? `${prevYear - 1}-12` : `${prevYear}-${String(prevMonth - 1).padStart(2, '0')}`;
    
    const { data: prevEvals } = await supabaseAdmin
      .from('evaluations')
      .select('id, player_id')
      .eq('organization_id', organization_id)
      .eq('category_id', category_id)
      .eq('period', prevPeriod)
      .eq('status', 'closed');

    const prevEvalIds = prevEvals?.map(e => e.id) || [];
    const prevEvalPlayerMap = new Map(prevEvals?.map(e => [e.id, e.player_id]) || []);
    let prevScoresMap = new Map<string, Record<string, number>>();
    if (prevEvalIds.length > 0) {
      const { data: prevScoresData } = await supabaseAdmin
        .from('evaluation_scores')
        .select('evaluation_id, stat_key, score')
        .in('evaluation_id', prevEvalIds);
      if (prevScoresData) {
        prevScoresData.forEach(s => {
          const pid = prevEvalPlayerMap.get(s.evaluation_id);
          if (!pid) return;
          if (!prevScoresMap.has(pid)) prevScoresMap.set(pid, {});
          prevScoresMap.get(pid)![s.stat_key] = s.score;
        });
      }
    }

    // Get attendance for last 30 days for all players
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: attendanceData } = await supabaseAdmin
      .from('attendance')
      .select('player_id, status')
      .eq('organization_id', organization_id)
      .eq('category_id', category_id)
      .in('player_id', playerIds)
      .gte('date', thirtyDaysAgo.toISOString().slice(0, 10));

    const attendanceMap = new Map<string, { presente: number; total: number }>();
    attendanceData?.forEach(a => {
      if (!attendanceMap.has(a.player_id)) attendanceMap.set(a.player_id, { presente: 0, total: 0 });
      const entry = attendanceMap.get(a.player_id)!;
      entry.total++;
      if (a.status === 'presente') entry.presente++;
    });

    // Get comments for insights generation
    const evalIds = evaluations.map(e => e.id);
    const { data: allComments } = await supabaseAdmin
      .from('evaluation_comments')
      .select('evaluation_id, comment')
      .in('evaluation_id', evalIds);

    // Generate insights for evaluations that don't have them yet
    for (const evaluation of evaluations) {
      if (!evaluation.insights_json) {
        const evalComments = (allComments || [])
          .filter(c => c.evaluation_id === evaluation.id)
          .map(c => c.comment);
        
        if (evalComments.length > 0) {
          try {
            const insightsResponse = await fetch(`${supabaseUrl}/functions/v1/generate-insights`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
              },
              body: JSON.stringify({
                evaluation_id: evaluation.id,
                comments: evalComments,
                scores: {},
                age_group: evaluation.age_group || categoryAgeGroup,
              }),
            });
            if (insightsResponse.ok) {
              const insightsResult = await insightsResponse.json();
              evaluation.insights_json = insightsResult.insights;
            }
          } catch (err) {
            console.error(`[process-idp] Insights generation failed for eval ${evaluation.id}:`, err);
          }
        }
      }
    }

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

      // Calculate delta vs previous
      const prevScores = prevScoresMap.get(evaluation.player_id);
      let deltaScores: Record<string, number> | null = null;
      if (prevScores) {
        deltaScores = {};
        for (const [key, value] of Object.entries(scoresMap)) {
          if (prevScores[key] !== undefined) {
            deltaScores[key] = value - prevScores[key];
          }
        }
      }

      // Attendance context
      const att = attendanceMap.get(evaluation.player_id);
      const attendanceContext = att && att.total > 0
        ? { presente: att.presente, total: att.total, pct: Math.round((att.presente / att.total) * 100) }
        : null;

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

      // Get relevant rubrics
      const evalAgeGroup = evaluation.age_group || categoryAgeGroup;
      const playerRubrics = (rubrics || [])
        .filter(r => r.age_group === evalAgeGroup)
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

      // Generate AI recommendations with enriched context
      const playerName = playerNames[evaluation.player_id] || 'Jugador';
      const insights = evaluation.insights_json as InsightsJSON | null;
      const aiResult = await generateAIRecommendations(
        playerName, evalAgeGroup, categoryName, scoresMap,
        focusAreas, mentalidadLow, playerRubrics,
        insights, deltaScores, attendanceContext,
      );

      // Build mentalidad actions
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

        // If more than 90 days, close old and create new
        if (daysSinceStart > 90) {
          await supabaseAdmin
            .from('idp_cycles')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', existingIDP.id);

          // Create new IDP below
        } else {
          // Update existing IDP
          let stage = '0_30';
          if (daysSinceStart > 60) stage = '61_90';
          else if (daysSinceStart > 30) stage = '31_60';

          await supabaseAdmin
            .from('idp_cycles')
            .update({
              latest_evaluation_id: evaluation.id,
              stage,
              plan_json: buildPlanJSON(focusAreas, mentalidadActions, scoresMap, aiResult, insights, attendanceContext),
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
          processed++;
          continue;
        }
      }

      // Create new IDP
      const endsAt = new Date();
      endsAt.setDate(endsAt.getDate() + 90);

      const planJSON = buildPlanJSON(focusAreas, mentalidadActions, scoresMap, aiResult, insights, attendanceContext);
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

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[process-idp] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
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
  aiResult: { ai_comment: string; ai_recommendations: string[]; ai_weekly_plan: string; diagnostico: string; foco_conductual: string | null },
  insights: InsightsJSON | null,
  attendanceContext: { presente: number; total: number; pct: number } | null,
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
    diagnostico: aiResult.diagnostico,
    foco_conductual: aiResult.foco_conductual || null,
    insights: insights || null,
    attendance_context: attendanceContext || null,
  };
}

function buildPlanText(
  focusAreas: { stat_key: string; score: number; focus_type: 'strengthen' | 'improve' }[],
  mentalidadActions: { stat_key: string; stat_label: string; score: number; actions: string[]; duration_days: number }[],
  aiResult: { ai_comment: string; ai_recommendations: string[]; ai_weekly_plan: string; diagnostico: string; foco_conductual: string | null },
): string {
  let text = '🎯 Plan de Desarrollo Individual (90 días)\n\n';

  if (aiResult.diagnostico) {
    text += `📊 Diagnóstico: ${aiResult.diagnostico}\n\n`;
  }

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

  if (aiResult.foco_conductual) {
    text += `\n🧠 Foco Conductual: ${aiResult.foco_conductual}\n`;
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
