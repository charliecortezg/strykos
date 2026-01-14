import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ============================================
// CONSTANTES Y FALLBACKS (A PRUEBA DE ERRORES)
// ============================================
const DEFAULT_FROM_NAME = 'White Lions Academies via STRYK';
const DEFAULT_FROM_EMAIL = 'notificacion@roarid.com';
const DEFAULT_ADMIN_EMAIL = 'whitelions.admn@gmail.com';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================
// VALIDACIÓN DE EMAILS
// ============================================
function isValidEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  // Evitar tokens tipo re_*** como email
  if (trimmed.startsWith('re_')) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

function isValidFrom(from: string | null | undefined): boolean {
  if (!from || typeof from !== 'string') return false;
  // Acepta "email@dominio.com" o "Name <email@dominio.com>"
  const emailOnlyMatch = from.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
  const namedMatch = from.match(/^.+\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>$/);
  return !!(emailOnlyMatch || namedMatch);
}

// ============================================
// CONSTRUCCIÓN DEL FROM FIELD
// ============================================
function buildFromField(): string {
  const fromName = Deno.env.get('RECEIPT_FROM_NAME') || DEFAULT_FROM_NAME;
  const fromEmail = Deno.env.get('RECEIPT_FROM_EMAIL') || DEFAULT_FROM_EMAIL;
  
  // Validar que fromEmail no sea un token/API key
  if (fromEmail.startsWith('re_') || !fromEmail.includes('@')) {
    console.error(`[send-payment-receipt] RECEIPT_FROM_EMAIL inválido: "${fromEmail}", usando fallback`);
    return `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`;
  }
  
  const from = `${fromName} <${fromEmail}>`;
  
  if (!isValidFrom(from)) {
    console.error(`[send-payment-receipt] from inválido: "${from}", usando fallback`);
    return `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`;
  }
  
  return from;
}

// ============================================
// UTILIDADES DE FORMATO
// ============================================
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

// ============================================
// HANDLER PRINCIPAL
// ============================================
serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Función para respuestas estandarizadas
  const respond = (ok: boolean, status: string, message: string, messageId?: string) => 
    new Response(JSON.stringify({ ok, status, message, messageId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });

  try {
    // ============================================
    // VALIDAR CONFIGURACIÓN
    // ============================================
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!resendApiKey) {
      console.error('[send-payment-receipt] RESEND_API_KEY no configurada');
      return respond(false, 'failed', 'RESEND_API_KEY no configurada');
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[send-payment-receipt] Configuración Supabase incompleta');
      return respond(false, 'failed', 'Configuración incompleta');
    }

    // ============================================
    // PARSEAR INPUT
    // ============================================
    const { paymentId } = await req.json();
    if (!paymentId) {
      return respond(false, 'failed', 'paymentId es requerido');
    }

    const resend = new Resend(resendApiKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // FETCH PAYMENT + PLAYER + ORG
    // ============================================
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select(`*, players!inner(id, full_name, email), organizations!inner(id, name, city)`)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('[send-payment-receipt] Pago no encontrado:', paymentError);
      return respond(false, 'failed', 'Pago no encontrado');
    }

    // Verificar si ya fue enviado
    if (payment.receipt_status === 'sent' || payment.receipt_status === 'sent_admin_only') {
      return respond(true, 'already_sent', 'Recibo ya enviado previamente');
    }

    // ============================================
    // RESOLVER DESTINATARIOS
    // ============================================
    const playerEmail = payment.players?.email?.trim();
    const playerName = payment.players?.full_name || 'Jugador';
    const adminEmail = (Deno.env.get('RECEIPT_BCC_EMAIL') || DEFAULT_ADMIN_EMAIL).trim();
    
    const hasValidPlayerEmail = isValidEmail(playerEmail);
    const hasValidAdminEmail = isValidEmail(adminEmail);

    console.log(`[send-payment-receipt] Resolviendo destinatarios:`);
    console.log(`  - playerEmail: "${playerEmail}" → válido: ${hasValidPlayerEmail}`);
    console.log(`  - adminEmail: "${adminEmail}" → válido: ${hasValidAdminEmail}`);

    // ============================================
    // ESCENARIO: AMBOS INVÁLIDOS
    // ============================================
    if (!hasValidPlayerEmail && !hasValidAdminEmail) {
      console.log('[send-payment-receipt] ❌ Ambos emails inválidos, no se envía');
      await supabaseAdmin.from('payments').update({ 
        receipt_status: 'no_email', 
        receipt_error: 'Sin emails válidos (jugador ni admin)',
        receipt_sent_at: null,
        receipt_message_id: null,
      }).eq('id', paymentId);
      return respond(false, 'no_email', 'No hay emails válidos para envío');
    }

    // ============================================
    // CONSTRUIR FROM Y DESTINATARIOS
    // ============================================
    const from = buildFromField();
    const orgName = payment.organizations?.name || 'Academia';
    
    // Determinar TO y BCC según escenario
    const toRecipients = hasValidPlayerEmail ? [playerEmail!] : [adminEmail];
    const bccRecipients = (hasValidPlayerEmail && hasValidAdminEmail) ? [adminEmail] : undefined;
    
    // Status resultante
    const resultStatus = hasValidPlayerEmail ? 'sent' : 'sent_admin_only';

    console.log(`[send-payment-receipt] Configuración de envío:`);
    console.log(`  - from: "${from}"`);
    console.log(`  - to: ${JSON.stringify(toRecipients)}`);
    console.log(`  - bcc: ${bccRecipients ? JSON.stringify(bccRecipients) : 'ninguno'}`);
    console.log(`  - resultStatus: "${resultStatus}"`);

    // ============================================
    // CONSTRUIR EMAIL HTML
    // ============================================
    const folio = generateReceiptFolio(paymentId);
    const paymentMonth = formatPaymentMonth(payment.payment_month);

    // Nota especial si se envía solo a admin
    const adminOnlyNote = !hasValidPlayerEmail 
      ? `<tr><td colspan="2" style="padding:10px;background:#fef3c7;color:#92400e;font-size:12px;text-align:center;border-radius:4px;">⚠️ Este recibo se envió a administración porque el jugador no tiene email registrado.</td></tr>` 
      : '';

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
  <table width="100%" style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${orgName}</h1>
        <p style="color:#8b8b9e;margin:8px 0 0;font-size:14px;">Recibo de Pago Digital</p>
      </td>
    </tr>
    <tr>
      <td style="padding:30px;text-align:center;">
        <span style="background:#10b981;color:#fff;padding:10px 24px;border-radius:20px;font-weight:600;font-size:14px;">✓ PAGO CONFIRMADO</span>
        <p style="color:#6b7280;margin:15px 0 0;font-size:13px;">Folio: <strong>${folio}</strong></p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 30px 30px;">
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse;">
          ${adminOnlyNote}
          <tr>
            <td style="padding:15px;border-bottom:1px solid #e5e7eb;color:#374151;">Jugador</td>
            <td style="padding:15px;text-align:right;font-weight:600;color:#111827;">${playerName}</td>
          </tr>
          <tr>
            <td style="padding:15px;border-bottom:1px solid #e5e7eb;color:#374151;">Período</td>
            <td style="padding:15px;text-align:right;font-weight:600;color:#111827;">${paymentMonth}</td>
          </tr>
          <tr>
            <td style="padding:15px;border-bottom:1px solid #e5e7eb;color:#374151;">Concepto</td>
            <td style="padding:15px;text-align:right;font-weight:600;color:#111827;">${payment.concept || 'Mensualidad'}</td>
          </tr>
          <tr style="background:#1a1a2e;">
            <td style="padding:20px;color:#fff;font-weight:500;">TOTAL PAGADO</td>
            <td style="padding:20px;text-align:right;color:#10b981;font-size:24px;font-weight:700;">${formatCurrency(payment.amount)}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:12px;margin:0;">Recibo generado automáticamente por STRYK</p>
        <p style="color:#9ca3af;font-size:11px;margin:5px 0 0;">Este es un comprobante digital de su pago registrado</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // ============================================
    // ENVIAR EMAIL
    // ============================================
    try {
      const subjectPrefix = !hasValidPlayerEmail ? '[COPIA ADMIN] ' : '';
      
      const emailResponse = await resend.emails.send({
        from,
        to: toRecipients,
        bcc: bccRecipients,
        subject: `${subjectPrefix}Recibo de Pago - ${orgName} - ${paymentMonth}`,
        html: emailHtml,
      });

      if (emailResponse?.data?.id) {
        console.log(`[send-payment-receipt] ✅ Email enviado exitosamente`);
        console.log(`  - messageId: ${emailResponse.data.id}`);
        console.log(`  - status: ${resultStatus}`);
        
        await supabaseAdmin.from('payments').update({
          receipt_status: resultStatus,
          receipt_sent_at: new Date().toISOString(),
          receipt_message_id: emailResponse.data.id,
          receipt_error: null,
        }).eq('id', paymentId);

        const successMessage = hasValidPlayerEmail 
          ? `Recibo enviado a ${playerEmail}${bccRecipients ? ' (copia a admin)' : ''}`
          : `Recibo enviado a administración (jugador sin email)`;
          
        return respond(true, resultStatus, successMessage, emailResponse.data.id);
      }
      
      // Si no hay ID pero tampoco error explícito
      throw new Error(emailResponse?.error?.message || 'Sin respuesta válida de Resend');
      
    } catch (emailError: any) {
      const errorMsg = emailError.message || JSON.stringify(emailError) || 'Error desconocido al enviar';
      console.error(`[send-payment-receipt] ❌ Error enviando email:`, errorMsg);
      
      await supabaseAdmin.from('payments').update({ 
        receipt_status: 'failed', 
        receipt_error: errorMsg.substring(0, 500), // Limitar longitud
        receipt_sent_at: null,
        receipt_message_id: null,
      }).eq('id', paymentId);
      
      return respond(false, 'failed', errorMsg);
    }

  } catch (error: any) {
    console.error('[send-payment-receipt] ❌ Error general:', error);
    return respond(false, 'failed', error.message || 'Error interno del servidor');
  }
});
