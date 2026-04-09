import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// WL 4-dimension model
const WL_DIMENSIONS = ['tecnico', 'tactico', 'coordinativo', 'psicologico'] as const;

const DIMENSION_LABELS: Record<string, string> = {
  tecnico: 'Técnico',
  tactico: 'Táctico',
  coordinativo: 'Coordinativo',
  psicologico: 'Psicológico',
};

function scoreToLevel(score: number): number {
  if (score <= 7) return 1;
  if (score <= 13) return 2;
  return 3;
}

function levelLabel(level: number): string {
  if (level === 1) return 'Nivel 1 (Desarrollo)';
  if (level === 2) return 'Nivel 2 (Consolidación)';
  return 'Nivel 3 (Dominio)';
}

// ─── AI helper ─────────────────────────────────────────────────
async function callAI(prompt: string, systemPrompt: string, toolDef: any): Promise<any | null> {
  const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
  if (!LOVABLE_API_KEY) {
    console.warn('[process-idp] No LOVABLE_API_KEY');
    return null;
  }

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        tools: [toolDef],
        tool_choice: { type: 'function', function: { name: toolDef.function.name } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[process-idp] AI error:', response.status, errText);
      return null;
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      return JSON.parse(toolCall.function.arguments);
    }
    return null;
  } catch (err) {
    console.error('[process-idp] AI call failed:', err);
    return null;
  }
}

// ─── Generate mode AI ──────────────────────────────────────────
async function generatePlanAI(
  playerName: string,
  age: number,
  scoresMap: Record<string, number>,
  focusDimensions: { key: string; score: number; level: number }[],
  exerciseNames: Record<string, string[]>,
): Promise<{ coach_message: string; diagnostico: string; weekly_plan: string; recommendations: string[] }> {
  const scoresText = Object.entries(scoresMap)
    .map(([k, v]) => `${DIMENSION_LABELS[k] || k}: ${v}/20 (${levelLabel(scoreToLevel(v))})`)
    .join(', ');

  const focusText = focusDimensions
    .map(f => `${DIMENSION_LABELS[f.key]} (${f.score}/20, ${levelLabel(f.level)})`)
    .join('; ');

  const exercisesText = Object.entries(exerciseNames)
    .map(([dim, names]) => `${DIMENSION_LABELS[dim]}: ${names.join(', ')}`)
    .join('\n');

  const prompt = `JUGADOR: ${playerName}, ${age} años
SCORES: ${scoresText}
DIMENSIONES FOCO: ${focusText}
EJERCICIOS ASIGNADOS:
${exercisesText}

Genera:
1. MENSAJE MOTIVADOR para la familia (3 oraciones máximo, en español)
2. DIAGNÓSTICO SINTÉTICO (2-3 oraciones, analítico, en español)
3. PLAN SEMANAL concreto de 3 días usando los ejercicios listados
4. 3 RECOMENDACIONES accionables para casa`;

  const toolDef = {
    type: 'function',
    function: {
      name: 'generate_idp_plan',
      description: 'Generate IDP plan for a youth player',
      parameters: {
        type: 'object',
        properties: {
          coach_message: { type: 'string', description: 'Motivational message for the family (3 sentences max, Spanish)' },
          diagnostico: { type: 'string', description: 'Synthetic diagnosis (2-3 sentences, Spanish)' },
          weekly_plan: { type: 'string', description: 'Concrete 3-day weekly plan using assigned exercises (Spanish)' },
          recommendations: { type: 'array', items: { type: 'string' }, description: '3 actionable recommendations (Spanish)' },
        },
        required: ['coach_message', 'diagnostico', 'weekly_plan', 'recommendations'],
        additionalProperties: false,
      },
    },
  };

  const result = await callAI(prompt, 'Eres un experto en desarrollo deportivo juvenil. Responde siempre en español.', toolDef);

  return result || {
    coach_message: `${playerName} comenzará un plan de desarrollo de 90 días enfocado en sus áreas de mejora. ¡Contamos con el apoyo de la familia!`,
    diagnostico: `${playerName} presenta áreas claras de desarrollo en las dimensiones evaluadas.`,
    weekly_plan: 'Lunes: Ejercicios técnicos (20 min). Miércoles: Trabajo táctico (20 min). Viernes: Sesión coordinativa.',
    recommendations: ['Practicar 15 minutos diarios los ejercicios asignados', 'Registrar cada sesión de entrenamiento', 'Mantener constancia durante todo el ciclo'],
  };
}

// ─── Check-in mode AI ──────────────────────────────────────────
async function generateCheckinMessage(
  playerName: string,
  improved: string[],
  newFocus: string[],
  checkInNumber: number,
): Promise<string> {
  const improvedText = improved.length > 0
    ? `mejoraron: ${improved.map(k => DIMENSION_LABELS[k] || k).join(', ')}`
    : 'se mantuvieron estables';
  const focusText = newFocus.map(k => DIMENSION_LABELS[k] || k).join(', ');

  const prompt = `Genera un mensaje en español de máximo 3 oraciones para la familia del jugador ${playerName}. Este mes ${improvedText}. El siguiente mes trabajará en ${focusText}. Es el check-in número ${checkInNumber} de 3.`;

  const toolDef = {
    type: 'function',
    function: {
      name: 'generate_checkin_message',
      description: 'Generate check-in message for family',
      parameters: {
        type: 'object',
        properties: { message: { type: 'string' } },
        required: ['message'],
        additionalProperties: false,
      },
    },
  };

  const result = await callAI(prompt, 'Eres un entrenador deportivo positivo. Máximo 3 oraciones en español.', toolDef);
  return result?.message || `Check-in ${checkInNumber}: ${playerName} continúa su plan de desarrollo. ${improved.length > 0 ? `¡Felicidades por la mejora en ${improvedText}!` : 'Seguimos trabajando con constancia.'} El próximo mes se enfocará en ${focusText}.`;
}

// ═══════════════════════════════════════════════════════════════
// MODE A: generate — Creates a new 90-day IDP cycle
// ═══════════════════════════════════════════════════════════════
async function handleGenerate(supabaseAdmin: any, body: any): Promise<Response> {
  const { organization_id, player_id, evaluation_event_id, category_id, period } = body;

  // Support both new WL mode (player_id + evaluation_event_id) and legacy batch mode (category_id + period)
  if (category_id && period) {
    return handleLegacyGenerate(supabaseAdmin, body);
  }

  if (!organization_id || !player_id || !evaluation_event_id) {
    return new Response(JSON.stringify({ error: 'Missing: organization_id, player_id, evaluation_event_id' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Get player info
  const { data: player } = await supabaseAdmin
    .from('players')
    .select('full_name, date_of_birth')
    .eq('id', player_id)
    .single();

  if (!player) {
    return new Response(JSON.stringify({ error: 'Player not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const playerAge = player.date_of_birth
    ? Math.floor((Date.now() - new Date(player.date_of_birth).getTime()) / (365.25 * 86400000))
    : 10;

  // 2. Get evaluation scores from the event
  const { data: evaluation } = await supabaseAdmin
    .from('evaluations')
    .select('id')
    .eq('organization_id', organization_id)
    .eq('player_id', player_id)
    .eq('event_id', evaluation_event_id)
    .eq('status', 'closed')
    .maybeSingle();

  if (!evaluation) {
    return new Response(JSON.stringify({ error: 'No closed evaluation found for this player/event' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: scores } = await supabaseAdmin
    .from('evaluation_scores')
    .select('stat_key, score')
    .eq('evaluation_id', evaluation.id);

  if (!scores || scores.length === 0) {
    return new Response(JSON.stringify({ error: 'No scores found' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const scoresMap: Record<string, number> = {};
  scores.forEach((s: any) => { scoresMap[s.stat_key] = s.score; });

  // 3. Close any existing active IDP for this player
  await supabaseAdmin
    .from('idp_cycles')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('organization_id', organization_id)
    .eq('player_id', player_id)
    .in('status', ['active', 'overdue']);

  // 4. Select focus dimensions (max 3, Levels 1 and 2 only, lowest first)
  const dimensionScores = WL_DIMENSIONS
    .map(key => ({ key, score: scoresMap[key] || 0, level: scoreToLevel(scoresMap[key] || 0) }))
    .filter(d => d.level <= 2)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);

  if (dimensionScores.length === 0) {
    // All dimensions at Level 3 — pick the two lowest anyway
    const allSorted = WL_DIMENSIONS
      .map(key => ({ key, score: scoresMap[key] || 0, level: scoreToLevel(scoresMap[key] || 0) }))
      .sort((a, b) => a.score - b.score);
    dimensionScores.push(allSorted[0], allSorted[1]);
  }

  // 5. Find exercises for each focus dimension
  const exercisesByDimension: Record<string, any[]> = {};
  const exerciseNames: Record<string, string[]> = {};

  for (const dim of dimensionScores) {
    // Try with age filter first
    let { data: exercises } = await supabaseAdmin
      .from('exercise_library')
      .select('id, title, category, difficulty')
      .eq('organization_id', organization_id)
      .eq('dimension', dim.key)
      .eq('is_active', true)
      .lte('age_min', playerAge)
      .gte('age_max', playerAge)
      .limit(3);

    // Fallback: just dimension + active
    if (!exercises || exercises.length === 0) {
      const { data: fallback } = await supabaseAdmin
        .from('exercise_library')
        .select('id, title, category, difficulty')
        .eq('organization_id', organization_id)
        .eq('dimension', dim.key)
        .eq('is_active', true)
        .limit(3);
      exercises = fallback || [];
    }

    exercisesByDimension[dim.key] = exercises;
    exerciseNames[dim.key] = exercises.map((e: any) => e.title);
  }

  // 6. Generate AI content
  const aiResult = await generatePlanAI(
    player.full_name, playerAge, scoresMap, dimensionScores, exerciseNames,
  );

  // 7. Create IDP cycle
  const today = new Date().toISOString().slice(0, 10);
  const endsAt = new Date();
  endsAt.setDate(endsAt.getDate() + 90);

  const planJSON = {
    focus_areas: dimensionScores.map(d => ({
      stat_key: d.key,
      stat_label: DIMENSION_LABELS[d.key],
      type: d.level === 1 ? 'improve' : 'strengthen',
      initial: d.score,
      target: d.level === 1 ? Math.min(20, d.score + 3) : Math.min(20, d.score + 2),
    })),
    exercises: exercisesByDimension,
    weekly_plan: {
      description: aiResult.weekly_plan,
      sessions_per_week: 3,
      focus_rotation: dimensionScores.map(d => DIMENSION_LABELS[d.key]),
    },
    ai_comment: aiResult.coach_message,
    ai_recommendations: aiResult.recommendations,
    diagnostico: aiResult.diagnostico,
  };

  const planText = buildPlanTextWL(dimensionScores, aiResult);

  const { data: newIDP, error: insertError } = await supabaseAdmin
    .from('idp_cycles')
    .insert({
      organization_id,
      player_id,
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
    console.error('[process-idp] Error creating IDP:', insertError);
    return new Response(JSON.stringify({ error: insertError.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 8. Create focus areas (months 2 & 3 marked pending_checkin)
  const focusRows = dimensionScores.map(d => ({
    organization_id,
    idp_cycle_id: newIDP.id,
    stat_key: d.key,
    focus_type: d.level === 1 ? 'improve' : 'strengthen',
    initial_score: d.score,
    target_score: d.level === 1 ? Math.min(20, d.score + 3) : Math.min(20, d.score + 2),
    pending_checkin: true, // exercises for months 2-3 pending check-in update
  }));

  await supabaseAdmin.from('idp_focus_areas').insert(focusRows);

  // 9. Register event
  await supabaseAdmin.from('stryk_events').insert({
    organization_id,
    player_id,
    source_type: 'idp_started',
    source_id: newIDP.id,
    xp_delta: 0,
  }).then(() => {});

  return new Response(JSON.stringify({
    success: true,
    idp_cycle_id: newIDP.id,
    focus_dimensions: dimensionScores.map(d => d.key),
    exercises_per_dimension: Object.fromEntries(
      Object.entries(exercisesByDimension).map(([k, v]) => [k, (v as any[]).length])
    ),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ═══════════════════════════════════════════════════════════════
// MODE B: checkin — Monthly check-in (days ~30 and ~60)
// ═══════════════════════════════════════════════════════════════
async function handleCheckin(supabaseAdmin: any, body: any): Promise<Response> {
  const { organization_id, player_id, idp_cycle_id, evaluation_event_id, check_in_number } = body;

  if (!organization_id || !player_id || !idp_cycle_id || !evaluation_event_id || !check_in_number) {
    return new Response(JSON.stringify({ error: 'Missing required fields for checkin' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (check_in_number < 1 || check_in_number > 3) {
    return new Response(JSON.stringify({ error: 'check_in_number must be 1, 2 or 3' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 1. Get IDP cycle
  const { data: cycle } = await supabaseAdmin
    .from('idp_cycles')
    .select('*')
    .eq('id', idp_cycle_id)
    .eq('organization_id', organization_id)
    .eq('player_id', player_id)
    .in('status', ['active', 'overdue'])
    .single();

  if (!cycle) {
    return new Response(JSON.stringify({ error: 'Active IDP cycle not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // 2. Get current evaluation scores
  const { data: evaluation } = await supabaseAdmin
    .from('evaluations')
    .select('id')
    .eq('organization_id', organization_id)
    .eq('player_id', player_id)
    .eq('event_id', evaluation_event_id)
    .eq('status', 'closed')
    .maybeSingle();

  if (!evaluation) {
    return new Response(JSON.stringify({ error: 'No closed evaluation for this event/player' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data: currentScores } = await supabaseAdmin
    .from('evaluation_scores')
    .select('stat_key, score')
    .eq('evaluation_id', evaluation.id);

  const currentMap: Record<string, number> = {};
  (currentScores || []).forEach((s: any) => { currentMap[s.stat_key] = s.score; });

  // 3. Get focus areas from IDP cycle
  const { data: focusAreas } = await supabaseAdmin
    .from('idp_focus_areas')
    .select('*')
    .eq('idp_cycle_id', idp_cycle_id);

  // 4. Calculate dimension_changes
  const dimensionChanges: Record<string, any> = {};
  const improved: string[] = [];
  const mastered: string[] = [];

  for (const fa of (focusAreas || [])) {
    const initialLevel = scoreToLevel(fa.initial_score);
    const currentScore = currentMap[fa.stat_key] ?? fa.initial_score;
    const currentLevel = scoreToLevel(currentScore);
    const changed = currentLevel > initialLevel;

    dimensionChanges[fa.stat_key] = {
      from: initialLevel,
      to: currentLevel,
      changed,
      initial_score: fa.initial_score,
      current_score: currentScore,
    };

    if (changed) {
      improved.push(fa.stat_key);
      if (currentLevel >= 3) mastered.push(fa.stat_key);
    }
  }

  // 5. Determine new focus for next month
  const currentFocusKeys = (focusAreas || []).map((f: any) => f.stat_key);
  let newFocusKeys = currentFocusKeys.filter((k: string) => !mastered.includes(k));

  // If a dimension was mastered, find the next-lowest dimension not already in focus
  if (mastered.length > 0 && newFocusKeys.length < 3) {
    const available = WL_DIMENSIONS
      .filter(d => !newFocusKeys.includes(d))
      .map(d => ({ key: d, score: currentMap[d] || 0 }))
      .sort((a, b) => a.score - b.score);
    
    for (const av of available) {
      if (newFocusKeys.length >= 3) break;
      if (scoreToLevel(av.score) < 3) {
        newFocusKeys.push(av.key);
      }
    }
  }

  // 6. Update pending_checkin on focus areas
  await supabaseAdmin
    .from('idp_focus_areas')
    .update({ pending_checkin: false })
    .eq('idp_cycle_id', idp_cycle_id);

  // 7. Update IDP cycle stage and latest evaluation
  const startDate = new Date(cycle.starts_at);
  const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (86400000));
  let stage = '0_30';
  if (daysSinceStart > 60) stage = '61_90';
  else if (daysSinceStart > 30) stage = '31_60';

  await supabaseAdmin
    .from('idp_cycles')
    .update({ latest_evaluation_id: evaluation.id, stage, updated_at: new Date().toISOString() })
    .eq('id', idp_cycle_id);

  // 8. Generate AI coach message
  const { data: playerData } = await supabaseAdmin
    .from('players')
    .select('full_name')
    .eq('id', player_id)
    .single();

  const coachMessage = await generateCheckinMessage(
    playerData?.full_name || 'Jugador',
    improved,
    newFocusKeys,
    check_in_number,
  );

  // 9. Create check-in record
  const { data: checkin, error: checkinError } = await supabaseAdmin
    .from('idp_monthly_checkins')
    .insert({
      organization_id,
      idp_cycle_id,
      player_id,
      check_in_number,
      check_in_date: new Date().toISOString().slice(0, 10),
      evaluation_event_id,
      scores_snapshot: currentMap,
      dimension_changes: dimensionChanges,
      coach_message: coachMessage,
      exercises_updated: improved.length > 0,
    })
    .select('id')
    .single();

  if (checkinError) {
    console.error('[process-idp] Check-in insert error:', checkinError);
    return new Response(JSON.stringify({ error: checkinError.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({
    success: true,
    checkin_id: checkin.id,
    check_in_number,
    dimension_changes: dimensionChanges,
    improved_dimensions: improved,
    mastered_dimensions: mastered,
    new_focus: newFocusKeys,
    coach_message: coachMessage,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ═══════════════════════════════════════════════════════════════
// Legacy generate mode (batch by category/period)
// ═══════════════════════════════════════════════════════════════
async function handleLegacyGenerate(supabaseAdmin: any, body: any): Promise<Response> {
  const { organization_id, category_id, period } = body;

  if (!organization_id || !category_id || !period) {
    return new Response(JSON.stringify({ error: 'Missing required fields' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Get category info
  const { data: categoryData } = await supabaseAdmin
    .from('categories')
    .select('name, age_group')
    .eq('id', category_id)
    .single();

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

  const playerIds = evaluations.map((e: any) => e.player_id);
  const { data: players } = await supabaseAdmin
    .from('players')
    .select('id, full_name, date_of_birth')
    .in('id', playerIds);

  const playerMap: Record<string, any> = {};
  players?.forEach((p: any) => { playerMap[p.id] = p; });

  let processed = 0;
  let created = 0;

  for (const evaluation of evaluations) {
    const { data: scores } = await supabaseAdmin
      .from('evaluation_scores')
      .select('stat_key, score')
      .eq('evaluation_id', evaluation.id);

    if (!scores || scores.length === 0) continue;

    const scoresMap: Record<string, number> = {};
    scores.forEach((s: any) => { scoresMap[s.stat_key] = s.score; });

    const player = playerMap[evaluation.player_id];
    const playerAge = player?.date_of_birth
      ? Math.floor((Date.now() - new Date(player.date_of_birth).getTime()) / (365.25 * 86400000))
      : 10;

    // Close existing active IDPs
    await supabaseAdmin
      .from('idp_cycles')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('organization_id', organization_id)
      .eq('player_id', evaluation.player_id)
      .in('status', ['active', 'overdue']);

    // Determine focus dimensions from whatever stat_keys exist
    const statKeys = Object.keys(scoresMap);
    const dimensionScores = statKeys
      .map(key => ({ key, score: scoresMap[key] || 0, level: scoreToLevel(scoresMap[key] || 0) }))
      .filter(d => d.level <= 2)
      .sort((a, b) => a.score - b.score)
      .slice(0, 3);

    if (dimensionScores.length === 0) {
      const allSorted = statKeys
        .map(key => ({ key, score: scoresMap[key] || 0, level: scoreToLevel(scoresMap[key] || 0) }))
        .sort((a, b) => a.score - b.score);
      if (allSorted.length >= 2) {
        dimensionScores.push(allSorted[0], allSorted[1]);
      } else if (allSorted.length >= 1) {
        dimensionScores.push(allSorted[0]);
      }
    }

    // Find exercises
    const exercisesByDimension: Record<string, any[]> = {};
    const exerciseNames: Record<string, string[]> = {};
    for (const dim of dimensionScores) {
      let { data: exercises } = await supabaseAdmin
        .from('exercise_library')
        .select('id, title, category, difficulty')
        .eq('organization_id', organization_id)
        .eq('dimension', dim.key)
        .eq('is_active', true)
        .limit(3);
      exercisesByDimension[dim.key] = exercises || [];
      exerciseNames[dim.key] = (exercises || []).map((e: any) => e.title);
    }

    const aiResult = await generatePlanAI(
      player?.full_name || 'Jugador', playerAge, scoresMap, dimensionScores, exerciseNames,
    );

    const today = new Date().toISOString().slice(0, 10);
    const endsAt = new Date();
    endsAt.setDate(endsAt.getDate() + 90);

    const planJSON = {
      focus_areas: dimensionScores.map(d => ({
        stat_key: d.key,
        stat_label: DIMENSION_LABELS[d.key] || d.key,
        type: d.level === 1 ? 'improve' : 'strengthen',
        initial: d.score,
        target: d.level === 1 ? Math.min(20, d.score + 3) : Math.min(20, d.score + 2),
      })),
      exercises: exercisesByDimension,
      weekly_plan: {
        description: aiResult.weekly_plan,
        sessions_per_week: 3,
        focus_rotation: dimensionScores.map(d => DIMENSION_LABELS[d.key] || d.key),
      },
      ai_comment: aiResult.coach_message,
      ai_recommendations: aiResult.recommendations,
      diagnostico: aiResult.diagnostico,
    };

    const planText = buildPlanTextWL(dimensionScores, aiResult);

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

    const focusRows = dimensionScores.map(d => ({
      organization_id,
      idp_cycle_id: newIDP.id,
      stat_key: d.key,
      focus_type: d.level === 1 ? 'improve' : 'strengthen',
      initial_score: d.score,
      target_score: d.level === 1 ? Math.min(20, d.score + 3) : Math.min(20, d.score + 2),
      pending_checkin: true,
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    await fetch(`${supabaseUrl}/functions/v1/send-idp-report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${supabaseServiceKey}` },
      body: JSON.stringify({ organization_id, player_ids: playerIds, period }),
    });
  } catch (emailErr) {
    console.error('[process-idp] Email trigger failed:', emailErr);
  }

  return new Response(JSON.stringify({ processed, created }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// ─── Helpers ───────────────────────────────────────────────────
function buildPlanTextWL(
  dimensions: { key: string; score: number; level: number }[],
  ai: { coach_message: string; diagnostico: string; weekly_plan: string; recommendations: string[] },
): string {
  let text = '🎯 Plan de Desarrollo Individual (90 días)\n\n';

  if (ai.diagnostico) text += `📊 Diagnóstico: ${ai.diagnostico}\n\n`;
  if (ai.coach_message) text += `💬 ${ai.coach_message}\n\n`;

  text += '📊 Dimensiones Foco:\n';
  for (const d of dimensions) {
    const tag = d.level === 1 ? '🟡 Mejorar' : '🟢 Potenciar';
    const target = d.level === 1 ? Math.min(20, d.score + 3) : Math.min(20, d.score + 2);
    text += `  ${tag} ${DIMENSION_LABELS[d.key] || d.key}: ${d.score} → ${target}\n`;
  }

  if (ai.recommendations?.length > 0) {
    text += '\n📋 Recomendaciones:\n';
    for (const rec of ai.recommendations) text += `  • ${rec}\n`;
  }

  if (ai.weekly_plan) text += `\n📅 Plan semanal: ${ai.weekly_plan}`;

  return text;
}

// ═══════════════════════════════════════════════════════════════
// Main router
// ═══════════════════════════════════════════════════════════════
serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json();
    const mode = body.mode || 'generate'; // Default to generate for backward compat

    console.log(`[process-idp] Mode: ${mode}`);

    switch (mode) {
      case 'generate':
        return await handleGenerate(supabaseAdmin, body);
      case 'checkin':
        return await handleCheckin(supabaseAdmin, body);
      default:
        return new Response(JSON.stringify({ error: `Unknown mode: ${mode}` }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[process-idp] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
