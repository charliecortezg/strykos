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

const MENTALIDAD_ACTION_MAP: Record<string, string[]> = {
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

interface ProcessIDPRequest {
  organization_id: string;
  category_id: string;
  period: string;
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
        .sort((a, b) => b.score - a.score); // DESC

      const focusAreas = [
        { ...tecnicoScores[0], focus_type: 'strengthen' as const }, // highest
        { ...tecnicoScores[1], focus_type: 'strengthen' as const }, // 2nd highest
        { ...tecnicoScores[2], focus_type: 'improve' as const },   // lowest
      ];

      // === PILAR MENTALIDAD: Actions ===
      const mentalidadActions = PILAR_MENTALIDAD_KEYS
        .filter(key => (scoresMap[key] || 0) < MENTALIDAD_THRESHOLD)
        .map(key => ({
          stat_key: key,
          stat_label: STAT_LABELS[key],
          score: scoresMap[key] || 0,
          actions: MENTALIDAD_ACTION_MAP[key] || [],
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
        // Update existing IDP
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
            plan_json: buildPlanJSON(focusAreas, mentalidadActions, scoresMap),
          })
          .eq('id', existingIDP.id);

        // Register update event
        await supabaseAdmin.from('stryk_events').insert({
          organization_id,
          player_id: evaluation.player_id,
          source_type: 'idp_updated',
          source_id: existingIDP.id,
          xp_delta: 0,
        }).then(() => {});

        updated++;
      } else {
        // Create new IDP cycle
        const endsAt = new Date();
        endsAt.setDate(endsAt.getDate() + 90);

        const planJSON = buildPlanJSON(focusAreas, mentalidadActions, scoresMap);
        const planText = buildPlanText(focusAreas, mentalidadActions);

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

        // Insert focus areas
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

        // Register start event
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

    // Trigger email reports (fire-and-forget)
    try {
      const playerIds = evaluations.map(e => e.player_id);
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

function buildPlanJSON(
  focusAreas: { stat_key: string; score: number; focus_type: 'strengthen' | 'improve' }[],
  mentalidadActions: { stat_key: string; stat_label: string; score: number; actions: string[]; duration_days: number }[],
  _scoresMap: Record<string, number>,
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
      description: 'Practica 2-3 veces por semana enfocándote en tus áreas de desarrollo. Alterna entre tus fortalezas y el área a mejorar.',
      sessions_per_week: 3,
      focus_rotation: focusAreas.map(fa => STAT_LABELS[fa.stat_key] || fa.stat_key),
    },
  };
}

function buildPlanText(
  focusAreas: { stat_key: string; score: number; focus_type: 'strengthen' | 'improve' }[],
  mentalidadActions: { stat_key: string; stat_label: string; score: number; actions: string[]; duration_days: number }[],
): string {
  let text = '🎯 Plan de Desarrollo Individual (90 días)\n\n';
  text += '📊 Enfoque Técnico:\n';
  for (const fa of focusAreas) {
    const label = STAT_LABELS[fa.stat_key] || fa.stat_key;
    const tag = fa.focus_type === 'strengthen' ? '🟢 Potenciar' : '🟡 Mejorar';
    const target = fa.focus_type === 'strengthen' ? Math.min(20, fa.score + 2) : Math.min(20, fa.score + 3);
    text += `  ${tag} ${label}: ${fa.score} → ${target}\n`;
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
  text += '\n📅 Plan semanal: Practica 2-3 veces por semana alternando entre tus fortalezas y el área a mejorar.';
  return text;
}
