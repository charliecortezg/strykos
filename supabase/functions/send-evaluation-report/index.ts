import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const DEFAULT_FROM_NAME = 'STRYK';
const DEFAULT_FROM_EMAIL = 'notificacion@roarid.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.startsWith('re_')) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

interface StatInfo {
  key: string;
  label: string;
  score: number;
  percentage: number;
  color: string;
}

function getStatColor(percentage: number): string {
  if (percentage >= 80) return '#10b981'; // green
  if (percentage >= 60) return '#3b82f6'; // blue
  if (percentage >= 40) return '#f59e0b'; // amber
  return '#ef4444'; // red
}

function buildStatRow(stat: StatInfo): string {
  return `
    <tr>
      <td style="padding:8px 12px;color:#374151;font-size:14px;width:45%;">${stat.label}</td>
      <td style="padding:8px 12px;width:35%;">
        <div style="background:#e5e7eb;border-radius:10px;height:18px;overflow:hidden;">
          <div style="background:${stat.color};height:100%;width:${stat.percentage}%;border-radius:10px;min-width:8px;"></div>
        </div>
      </td>
      <td style="padding:8px 12px;text-align:center;font-weight:700;color:${stat.color};font-size:15px;width:20%;">${stat.score}/20</td>
    </tr>`;
}

function buildEmailHtml(
  playerName: string,
  orgName: string,
  overallScore: number,
  stats: StatInfo[],
  portalUrl: string,
  period: string,
): string {
  const statsRows = stats.map(buildStatRow).join('');
  const ovrPct = Math.round((overallScore / 20) * 100);
  const ovrColor = getStatColor(ovrPct);

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:20px;margin:0;">
  <table width="100%" style="max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.08);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);padding:32px 30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:22px;letter-spacing:0.5px;">${orgName}</h1>
        <p style="color:#94a3b8;margin:10px 0 0;font-size:14px;">📊 Reporte de Evaluación</p>
      </td>
    </tr>

    <!-- Player & Period -->
    <tr>
      <td style="padding:28px 30px 12px;text-align:center;">
        <p style="color:#6b7280;margin:0;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Evaluación ${period}</p>
        <h2 style="color:#111827;margin:8px 0 0;font-size:20px;">${playerName}</h2>
      </td>
    </tr>

    <!-- OVR Badge -->
    <tr>
      <td style="padding:8px 30px 20px;text-align:center;">
        <div style="display:inline-block;background:${ovrColor};color:#fff;padding:12px 32px;border-radius:24px;font-weight:700;font-size:18px;">
          OVR: ${overallScore.toFixed(1)}
        </div>
      </td>
    </tr>

    <!-- Stats Table -->
    <tr>
      <td style="padding:0 30px 24px;">
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse;overflow:hidden;">
          <tr style="background:#f9fafb;">
            <td style="padding:10px 12px;font-weight:600;color:#6b7280;font-size:12px;text-transform:uppercase;">Competencia</td>
            <td style="padding:10px 12px;font-weight:600;color:#6b7280;font-size:12px;text-transform:uppercase;">Nivel</td>
            <td style="padding:10px 12px;font-weight:600;color:#6b7280;font-size:12px;text-transform:uppercase;text-align:center;">Score</td>
          </tr>
          ${statsRows}
        </table>
      </td>
    </tr>

    <!-- CTA -->
    <tr>
      <td style="padding:4px 30px 28px;text-align:center;">
        <p style="color:#6b7280;font-size:14px;margin:0 0 16px;">Ingresa al Portal Familiar para ver el radar completo, comentarios del entrenador y el plan de desarrollo individual.</p>
        <a href="${portalUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;padding:14px 40px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;letter-spacing:0.3px;">
          Ver Evaluación Completa →
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:20px 30px;text-align:center;border-top:1px solid #e5e7eb;background:#fafafa;">
        <p style="color:#9ca3af;font-size:11px;margin:0;">Generado automáticamente por STRYK</p>
        <p style="color:#9ca3af;font-size:11px;margin:4px 0 0;">Este es un resumen. Accede al portal para ver todos los detalles.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const respond = (ok: boolean, message: string, details?: any) =>
    new Response(JSON.stringify({ ok, message, ...details }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const resendFromEmail = Deno.env.get('RESEND_FROM_EMAIL') || DEFAULT_FROM_EMAIL;

    if (!resendApiKey || !supabaseUrl || !supabaseServiceKey) {
      return respond(false, 'Missing server configuration');
    }

    const { evaluationIds, portalBaseUrl } = await req.json();
    if (!evaluationIds || !Array.isArray(evaluationIds) || evaluationIds.length === 0) {
      return respond(false, 'evaluationIds array is required');
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch closed evaluations with player + org data
    const { data: evaluations, error: evalError } = await supabase
      .from('evaluations')
      .select(`
        id, player_id, overall_score, period, age_group,
        players!inner(id, full_name, email, phone),
        organizations!inner(id, name, org_code)
      `)
      .in('id', evaluationIds)
      .eq('status', 'closed');

    if (evalError || !evaluations?.length) {
      console.error('[send-evaluation-report] No evaluations found:', evalError);
      return respond(false, 'No closed evaluations found');
    }

    // Fetch all scores
    const { data: allScores } = await supabase
      .from('evaluation_scores')
      .select('evaluation_id, stat_key, score')
      .in('evaluation_id', evaluationIds);

    // Fetch guardian emails for players missing email
    const playerIds = evaluations.map((e: any) => e.player_id);
    const { data: guardianLinks } = await supabase
      .from('player_guardians')
      .select('player_id, guardians!inner(email)')
      .in('player_id', playerIds)
      .eq('is_primary', true);

    const guardianEmailMap = new Map<string, string>();
    guardianLinks?.forEach((link: any) => {
      if (link.guardians?.email) {
        guardianEmailMap.set(link.player_id, link.guardians.email);
      }
    });

    const statLabels: Record<string, string> = {
      actitud_esfuerzo: 'Actitud y Esfuerzo',
      disciplina_constancia: 'Disciplina y Constancia',
      autonomia_liderazgo: 'Autonomía y Liderazgo',
      control_conduccion: 'Control y Conducción',
      pase_recepcion: 'Pase y Recepción',
      decision_juego: 'Decisión y Juego Colectivo',
    };

    const statOrder = [
      'actitud_esfuerzo', 'disciplina_constancia', 'autonomia_liderazgo',
      'control_conduccion', 'pase_recepcion', 'decision_juego',
    ];

    let sent = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const evaluation of evaluations as any[]) {
      const player = evaluation.players;
      const org = evaluation.organizations;
      const playerEmail = player?.email?.trim();
      const guardianEmail = guardianEmailMap.get(evaluation.player_id);
      const recipientEmail = isValidEmail(playerEmail) ? playerEmail : (isValidEmail(guardianEmail) ? guardianEmail : null);

      if (!recipientEmail) {
        console.log(`[send-evaluation-report] No valid email for player ${player?.full_name}, skipping`);
        skipped++;
        continue;
      }

      // Build stats for this evaluation
      const evalScores = (allScores || []).filter((s: any) => s.evaluation_id === evaluation.id);
      const scoresMap = new Map(evalScores.map((s: any) => [s.stat_key, s.score]));

      const stats: StatInfo[] = statOrder.map(key => {
        const score = (scoresMap.get(key) as number) ?? 0;
        const percentage = Math.round((score / 20) * 100);
        return {
          key,
          label: statLabels[key] || key,
          score,
          percentage,
          color: getStatColor(percentage),
        };
      });

      const portalUrl = portalBaseUrl || 'https://strykos.lovable.app/portal/login';
      const fromField = isValidEmail(resendFromEmail) && !resendFromEmail.startsWith('re_')
        ? `${org.name} via STRYK <${resendFromEmail}>`
        : `STRYK <${DEFAULT_FROM_EMAIL}>`;

      const html = buildEmailHtml(
        player.full_name,
        org.name,
        evaluation.overall_score ?? 0,
        stats,
        portalUrl,
        evaluation.period,
      );

      try {
        const emailRes = await resend.emails.send({
          from: fromField,
          to: [recipientEmail],
          subject: `📊 Evaluación de ${player.full_name} - ${evaluation.period} | ${org.name}`,
          html,
        });

        if (emailRes?.data?.id) {
          console.log(`[send-evaluation-report] ✅ Sent to ${recipientEmail} for ${player.full_name}`);
          sent++;
        } else {
          throw new Error(emailRes?.error?.message || 'No response from Resend');
        }
      } catch (emailErr: any) {
        console.error(`[send-evaluation-report] ❌ Failed for ${player.full_name}:`, emailErr.message);
        errors.push(`${player.full_name}: ${emailErr.message}`);
      }
    }

    return respond(true, `Enviados: ${sent}, Omitidos: ${skipped}, Errores: ${errors.length}`, { sent, skipped, errors });
  } catch (error: any) {
    console.error('[send-evaluation-report] ❌ Error general:', error);
    return respond(false, error.message || 'Error interno');
  }
});
