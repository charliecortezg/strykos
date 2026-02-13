import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const today = new Date().toISOString().slice(0, 10);

    // 1. Mark overdue: active cycles past ends_at
    const { data: overdueResults } = await supabaseAdmin
      .from('idp_cycles')
      .update({ status: 'overdue' })
      .eq('status', 'active')
      .lt('ends_at', today)
      .select('id');

    const overdueCount = overdueResults?.length || 0;

    // 2. Recalculate stage for active cycles
    const { data: activeCycles } = await supabaseAdmin
      .from('idp_cycles')
      .select('id, starts_at')
      .eq('status', 'active');

    let stageUpdated = 0;
    if (activeCycles) {
      for (const cycle of activeCycles) {
        const startDate = new Date(cycle.starts_at);
        const daysSinceStart = Math.floor((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        let stage = '0_30';
        if (daysSinceStart > 60) stage = '61_90';
        else if (daysSinceStart > 30) stage = '31_60';

        await supabaseAdmin
          .from('idp_cycles')
          .update({ stage })
          .eq('id', cycle.id);
        stageUpdated++;
      }
    }

    console.log(`[idp-maintenance] overdue: ${overdueCount}, stages updated: ${stageUpdated}`);

    return new Response(JSON.stringify({ overdue: overdueCount, stage_updated: stageUpdated }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[idp-maintenance] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
