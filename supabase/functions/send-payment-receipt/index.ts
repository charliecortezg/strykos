import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CONSTANTES HARDCODED (FALLBACK A PRUEBA DE ERRORES)
const DEFAULT_FROM_NAME = 'White Lions Academies via STRYK';
const DEFAULT_FROM_EMAIL = 'notificacion@roarid.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

function buildFromField(orgName: string | null | undefined): string {
  const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || DEFAULT_FROM_EMAIL;
  const fromName = orgName ? `${orgName} via STRYK` : DEFAULT_FROM_NAME;
  
  // Validación: asegurar que no sea un token/API key
  if (fromEmail.startsWith('re_') || !fromEmail.includes('@')) {
    console.error(`[send-payment-receipt] fromEmail inválido: "${fromEmail}"`);
    return `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`;
  }
  
  return `${fromName} <${fromEmail}>`;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function formatPaymentMonth(monthString: string): string {
  const date = new Date(monthString + '-01');
  return date.toLocaleDateString('es-MX', { year: 'numeric', month: 'long' });
}

function generateReceiptFolio(paymentId: string): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `REC-${dateStr}-${paymentId.substring(0, 8).toUpperCase()}`;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const respond = (ok: boolean, status: string, message: string, messageId?: string) => 
    new Response(JSON.stringify({ ok, status, message, messageId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  try {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!resendApiKey) return respond(false, 'failed', 'RESEND_API_KEY no configurada');
    if (!supabaseUrl || !supabaseServiceKey) return respond(false, 'failed', 'Configuración incompleta');

    const { paymentId } = await req.json();
    if (!paymentId) return respond(false, 'failed', 'paymentId es requerido');

    const resend = new Resend(resendApiKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select(`*, players!inner(id, full_name, email), organizations!inner(id, name, city)`)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) return respond(false, 'failed', 'Pago no encontrado');
    if (payment.receipt_status === 'sent') return respond(true, 'already_sent', 'Recibo ya enviado');

    const playerEmail = payment.players?.email;
    const playerName = payment.players?.full_name || 'Jugador';

    if (!isValidEmail(playerEmail)) {
      await supabaseAdmin.from('payments').update({ 
        receipt_status: 'no_email', 
        receipt_error: 'Sin email válido' 
      }).eq('id', paymentId);
      return respond(false, 'no_email', 'Jugador sin email válido');
    }

    const orgName = payment.organizations?.name;
    const from = buildFromField(orgName);
    const folio = generateReceiptFolio(paymentId);
    const paymentMonth = formatPaymentMonth(payment.payment_month);

    const emailHtml = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;"><table width="100%" style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;"><tr><td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center;"><h1 style="color:#fff;margin:0;">${orgName || 'Academia'}</h1><p style="color:#8b8b9e;margin:8px 0 0;">Recibo de Pago Digital</p></td></tr><tr><td style="padding:30px;text-align:center;"><span style="background:#10b981;color:#fff;padding:8px 20px;border-radius:20px;font-weight:600;">✓ PAGO CONFIRMADO</span><p style="color:#6b7280;margin:15px 0 0;">Folio: <strong>${folio}</strong></p></td></tr><tr><td style="padding:0 30px 30px;"><table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;"><tr><td style="padding:15px;border-bottom:1px solid #e5e7eb;">Jugador</td><td style="padding:15px;text-align:right;font-weight:600;">${playerName}</td></tr><tr><td style="padding:15px;border-bottom:1px solid #e5e7eb;">Período</td><td style="padding:15px;text-align:right;font-weight:600;">${paymentMonth}</td></tr><tr><td style="padding:15px;border-bottom:1px solid #e5e7eb;">Concepto</td><td style="padding:15px;text-align:right;font-weight:600;">${payment.concept || 'Mensualidad'}</td></tr><tr style="background:#1a1a2e;"><td style="padding:20px;color:#fff;">TOTAL</td><td style="padding:20px;text-align:right;color:#10b981;font-size:24px;font-weight:700;">${formatCurrency(payment.amount)}</td></tr></table></td></tr><tr><td style="padding:20px;text-align:center;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">Recibo generado por STRYK</td></tr></table></body></html>`;

    try {
      const emailResponse = await resend.emails.send({
        from,
        to: [playerEmail],
        subject: `Recibo de Pago - ${orgName || 'Academia'} - ${paymentMonth}`,
        html: emailHtml,
      });

      if (emailResponse?.data?.id) {
        await supabaseAdmin.from('payments').update({
          receipt_status: 'sent',
          receipt_sent_at: new Date().toISOString(),
          receipt_message_id: emailResponse.data.id,
          receipt_error: null,
        }).eq('id', paymentId);
        return respond(true, 'sent', `Recibo enviado a ${playerEmail}`, emailResponse.data.id);
      }
      throw new Error(emailResponse?.error?.message || 'Sin respuesta de Resend');
    } catch (emailError: any) {
      const errorMsg = emailError.message || 'Error al enviar';
      await supabaseAdmin.from('payments').update({ receipt_status: 'failed', receipt_error: errorMsg }).eq('id', paymentId);
      return respond(false, 'failed', errorMsg);
    }
  } catch (error: any) {
    return respond(false, 'failed', error.message || 'Error interno');
  }
});
