import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateInsightsRequest {
  evaluation_id: string;
  comments: string[];
  scores: Record<string, number>;
  age_group: string;
}

const STAT_LABELS: Record<string, string> = {
  actitud_esfuerzo: 'Actitud y Esfuerzo',
  disciplina_constancia: 'Disciplina y Constancia',
  autonomia_liderazgo: 'Autonomía y Liderazgo',
  control_conduccion: 'Control y Conducción',
  pase_recepcion: 'Pase y Recepción',
  decision_juego: 'Decisión y Juego Colectivo',
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const { evaluation_id, comments, scores, age_group }: GenerateInsightsRequest = await req.json();

    if (!evaluation_id || !comments || comments.length === 0) {
      // No comments to analyze - store empty insights
      await supabaseAdmin
        .from('evaluations')
        .update({ insights_json: null })
        .eq('id', evaluation_id);

      return new Response(JSON.stringify({ insights: null, message: 'No comments to analyze' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const commentText = comments.join('\n');
    const scoresText = Object.entries(scores)
      .map(([k, v]) => `${STAT_LABELS[k] || k}: ${v}/20`)
      .join(', ');

    if (!LOVABLE_API_KEY) {
      console.warn('[generate-insights] No LOVABLE_API_KEY, skipping');
      return new Response(JSON.stringify({ insights: null, message: 'No AI key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Eres un analista de desarrollo deportivo juvenil. Extraes información estructurada de comentarios de entrenadores. Responde siempre en español.',
          },
          {
            role: 'user',
            content: `Analiza el siguiente comentario de un entrenador sobre un jugador de fútbol formativo (grupo de edad: ${age_group}).

COMENTARIO: "${commentText}"
SCORES: ${scoresText}

Extrae:
1. fortalezas: máximo 3 fortalezas mencionadas o implícitas
2. debilidades: máximo 3 áreas de mejora mencionadas o implícitas
3. habitos: patrones conductuales observados (asistencia, puntualidad, actitud, etc.)
4. riesgo: "bajo", "medio" o "alto" basado en la combinación de debilidades + hábitos
5. palabras_clave: 3-5 palabras clave del comentario`,
          },
        ],
        tools: [{
          type: 'function',
          function: {
            name: 'extract_insights',
            description: 'Extract structured insights from coach comment',
            parameters: {
              type: 'object',
              properties: {
                fortalezas: { type: 'array', items: { type: 'string' }, description: 'Max 3 strengths' },
                debilidades: { type: 'array', items: { type: 'string' }, description: 'Max 3 weaknesses' },
                habitos: { type: 'array', items: { type: 'string' }, description: 'Behavioral patterns' },
                riesgo: { type: 'string', enum: ['bajo', 'medio', 'alto'], description: 'Risk level' },
                palabras_clave: { type: 'array', items: { type: 'string' }, description: '3-5 keywords' },
              },
              required: ['fortalezas', 'debilidades', 'habitos', 'riesgo', 'palabras_clave'],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: 'function', function: { name: 'extract_insights' } },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[generate-insights] AI error:', response.status, errText);
      return new Response(JSON.stringify({ insights: null, error: 'AI gateway error' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await response.json();
    const toolCall = result.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall?.function?.arguments) {
      console.error('[generate-insights] No tool call in response');
      return new Response(JSON.stringify({ insights: null, error: 'No tool call' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const insights = JSON.parse(toolCall.function.arguments);

    // Save to evaluation
    const { error: updateError } = await supabaseAdmin
      .from('evaluations')
      .update({ insights_json: insights })
      .eq('id', evaluation_id);

    if (updateError) {
      console.error('[generate-insights] DB update error:', updateError);
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[generate-insights] Error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
