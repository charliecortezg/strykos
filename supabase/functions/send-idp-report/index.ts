import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DEFAULT_FROM_NAME = 'White Lions Academies via STRYK';
const DEFAULT_FROM_EMAIL = 'notificacion@roarid.com';

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!resendApiKey) {
      console.error('[send-idp-report] RESEND_API_KEY not configured');
      return new Response(JSON.stringify({ ok: false, error: 'Missing RESEND_API_KEY' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const resend = new Resend(resendApiKey);

    const { organization_id, player_ids, period } = await req.json();
    if (!organization_id || !player_ids?.length) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing fields' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get org info
    const { data: org } = await supabaseAdmin
      .from('organizations')
      .select('name, org_code')
      .eq('id', organization_id)
      .single();

    const orgName = org?.name || 'Academia';
    const orgCode = org?.org_code || '';

    let sent = 0;
    let skipped = 0;

    for (const playerId of player_ids) {
      // Get player + guardian email
      const { data: player } = await supabaseAdmin
        .from('players')
        .select('full_name')
        .eq('id', playerId)
        .single();

      if (!player) { skipped++; continue; }

      // Get guardian email
      const { data: links } = await supabaseAdmin
        .from('player_guardians')
        .select('guardian:guardians(email, full_name)')
        .eq('player_id', playerId)
        .eq('is_primary', true)
        .limit(1);

      const guardianEmail = (links?.[0] as any)?.guardian?.email;
      if (!guardianEmail || !guardianEmail.includes('@')) { skipped++; continue; }

      const portalUrl = `https://strykos.lovable.app/portal`;
      const fromField = `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`;

      const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
      const [year, month] = period.split('-');
      const periodLabel = `${months[parseInt(month) - 1]} ${year}`;

      const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
  <table width="100%" style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;">${orgName}</h1>
        <p style="color:#8b8b9e;margin:8px 0 0;font-size:14px;">Plan de Desarrollo Individual</p>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;">
        <h2 style="color:#111;font-size:18px;margin:0 0 8px;">Hola 👋</h2>
        <p style="color:#555;font-size:14px;line-height:1.6;">
          La evaluación de <strong>${player.full_name}</strong> del periodo <strong>${periodLabel}</strong> ha sido completada 
          y se ha generado su <strong>Plan de Desarrollo Individual (90 días)</strong>.
        </p>
        <p style="color:#555;font-size:14px;line-height:1.6;">
          Ingresa al Portal Familiar para ver el reporte completo, las áreas de enfoque y el plan de entrenamiento recomendado.
        </p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${portalUrl}" style="background:#10b981;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;">
            Ver Plan en el Portal
          </a>
        </div>
        <p style="color:#999;font-size:12px;text-align:center;">
          Usa el código <strong>${orgCode}</strong> y tu número de teléfono para ingresar.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:11px;margin:0;">Generado por STRYK • ${periodLabel}</p>
      </td>
    </tr>
  </table>
</body></html>`;

      try {
        await resend.emails.send({
          from: fromField,
          to: [guardianEmail],
          subject: `Plan de Desarrollo - ${player.full_name} - ${periodLabel}`,
          html: emailHtml,
        });
        sent++;
      } catch (emailErr) {
        console.error(`[send-idp-report] Failed for ${playerId}:`, emailErr);
        skipped++;
      }
    }

    return new Response(JSON.stringify({ ok: true, sent, skipped }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('[send-idp-report] Error:', error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
