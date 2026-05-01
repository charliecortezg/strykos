// ─────────────────────────────────────────────────────────────
// WHITE LIONS ACADEMY — Edge Function: send-report-email
// Deploy to: supabase/functions/send-report-email/index.ts
// Uses the email provider already configured in the project.
// ─────────────────────────────────────────────────────────────

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  reportId: string;
  playerName: string;
  firstName: string;
  lastName: string;
  parentEmail: string;
  monthName: string;
  year: number;
  pdfUrl: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as EmailPayload;
    const {
      playerName,
      firstName,
      lastName,
      parentEmail,
      monthName,
      year,
      pdfUrl,
    } = payload;

    // Guard: never send an email without a valid PDF URL
    if (!pdfUrl || typeof pdfUrl !== 'string' || pdfUrl.trim() === '') {
      console.error('[send-report-email] Missing pdfUrl — refusing to send email.', { parentEmail, playerName });
      return new Response(
        JSON.stringify({ error: 'pdfUrl is required and cannot be empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const familiaLabel = lastName ? `familia ${lastName}` : 'familia';
    const subject = `Reporte de ${firstName} — ${monthName} ${year} | White Lions Academy`;

    // HTML email body
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4ff;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f4ff;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(28,43,74,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:#1C2B4A;padding:28px 36px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#F5A623;font-size:11px;letter-spacing:2px;font-weight:bold;text-transform:uppercase;">White Lions Academy</p>
                    <h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:bold;">Reporte Mensual de Rendimiento</h1>
                    <p style="margin:6px 0 0;color:#8899bb;font-size:13px;">${monthName} ${year}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Gold line -->
          <tr>
            <td style="background:#F5A623;height:3px;"></td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 36px 24px;">
              <p style="margin:0 0 16px;color:#1C2B4A;font-size:15px;">Estimada ${familiaLabel},</p>
              
              <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.7;">
                Les hacemos llegar el reporte mensual de rendimiento de <strong>${playerName}</strong> 
                correspondiente a <strong>${monthName} ${year}</strong>.
              </p>
              
              <p style="margin:0 0 20px;color:#374151;font-size:14px;line-height:1.7;">
                En él encontrarán un resumen completo de su asistencia a entrenamientos y partidos, 
                su participación en cada encuentro, estadísticas del mes y la evaluación del cuerpo técnico.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:28px 0;">
                <tr>
                  <td style="background:#2563EB;border-radius:8px;">
                    <a href="${pdfUrl}" target="_blank" 
                       style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;letter-spacing:0.3px;">
                      Ver Reporte Completo →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#6B7280;font-size:12px;line-height:1.6;">
                El reporte también está disponible en el portal familiar de STRYK, 
                donde podrán consultar el historial completo de ${firstName}.
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 36px;">
              <hr style="border:none;border-top:1px solid #E5E7EB;margin:0;">
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#1C2B4A;padding:24px 36px;">
              <p style="margin:0 0 4px;color:#F5A623;font-size:11px;font-weight:bold;letter-spacing:1px;text-transform:uppercase;">White Lions Academy</p>
              <p style="margin:0 0 4px;color:#8899bb;font-size:11px;">Mexicali, Baja California</p>
              <p style="margin:0;color:#8899bb;font-size:11px;">whitelionsacademy.com</p>
              <p style="margin:12px 0 0;color:#4a5578;font-size:10px;">Este reporte fue generado y enviado automáticamente por STRYK</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();

    // ── Send via Resend (adjust if using a different provider) ──
    // The API key should be set as a Supabase secret:
    // supabase secrets set RESEND_API_KEY=re_...
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!RESEND_API_KEY) {
      // Fallback: try the email service already configured in the project
      // Check for SENDGRID_API_KEY or SMTP settings as alternatives
      const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
      
      if (SENDGRID_API_KEY) {
        // SendGrid fallback
        const sgResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: parentEmail }], bcc: [{ email: 'whitelions.admn@gmail.com' }] }],
            from: { email: 'reportes@whitelionsacademy.com', name: 'White Lions Academy' },
            subject,
            content: [{ type: 'text/html', value: html }],
          }),
        });

        if (!sgResponse.ok) {
          const err = await sgResponse.text();
          throw new Error(`SendGrid error: ${err}`);
        }
      } else {
        throw new Error('No email provider configured. Set RESEND_API_KEY or SENDGRID_API_KEY in Supabase secrets.');
      }
    } else {
      // Resend (primary) — use project-configured FROM address
      const RESEND_FROM = Deno.env.get('RESEND_FROM_EMAIL') || 'White Lions Academy <onboarding@resend.dev>';
      const resendResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'White Lions Academy <notificacion@roarid.com>',
          to: [parentEmail],
          subject,
          html,
        }),
      });

      if (!resendResponse.ok) {
        const err = await resendResponse.text();
        throw new Error(`Resend error: ${err}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    console.error('[send-report-email] Error:', error);
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
