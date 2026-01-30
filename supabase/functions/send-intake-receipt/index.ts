import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ============================================
// CONSTANTES Y FALLBACKS
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
  if (trimmed.startsWith('re_')) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(trimmed);
}

function isValidFrom(from: string | null | undefined): boolean {
  if (!from || typeof from !== 'string') return false;
  const emailOnlyMatch = from.match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
  const namedMatch = from.match(/^.+\s*<([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})>$/);
  return !!(emailOnlyMatch || namedMatch);
}

function buildFromField(): string {
  const fromName = Deno.env.get('RECEIPT_FROM_NAME') || DEFAULT_FROM_NAME;
  const fromEmail = Deno.env.get('RECEIPT_FROM_EMAIL') || DEFAULT_FROM_EMAIL;
  
  if (fromEmail.startsWith('re_') || !fromEmail.includes('@')) {
    console.error(`[send-intake-receipt] RECEIPT_FROM_EMAIL inválido: "${fromEmail}", usando fallback`);
    return `${DEFAULT_FROM_NAME} <${DEFAULT_FROM_EMAIL}>`;
  }
  
  const from = `${fromName} <${fromEmail}>`;
  if (!isValidFrom(from)) {
    console.error(`[send-intake-receipt] from inválido: "${from}", usando fallback`);
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

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function calculateAge(birthDate: string): number {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// ============================================
// HANDLER PRINCIPAL
// ============================================
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
    // ============================================
    // VALIDAR CONFIGURACIÓN
    // ============================================
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!resendApiKey) {
      console.error('[send-intake-receipt] RESEND_API_KEY no configurada');
      return respond(false, 'failed', 'RESEND_API_KEY no configurada');
    }
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('[send-intake-receipt] Configuración Supabase incompleta');
      return respond(false, 'failed', 'Configuración incompleta');
    }

    // ============================================
    // PARSEAR INPUT
    // ============================================
    const { intakeId } = await req.json();
    if (!intakeId) {
      return respond(false, 'failed', 'intakeId es requerido');
    }

    const resend = new Resend(resendApiKey);
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // ============================================
    // FETCH INTAKE REQUEST + ORG
    // ============================================
    const { data: intake, error: intakeError } = await supabaseAdmin
      .from('intake_requests')
      .select(`
        *,
        organizations!inner(id, name, city),
        categories(id, name),
        sports(id, name)
      `)
      .eq('id', intakeId)
      .single();

    if (intakeError || !intake) {
      console.error('[send-intake-receipt] Fichaje no encontrado:', intakeError);
      return respond(false, 'failed', 'Fichaje no encontrado');
    }

    // Verificar si ya fue enviado
    if (intake.receipt_status === 'sent' || intake.receipt_status === 'sent_admin_only') {
      return respond(true, 'already_sent', 'Recibo ya enviado previamente');
    }

    // ============================================
    // RESOLVER DESTINATARIOS
    // ============================================
    const guardianEmail = intake.guardian_email?.trim();
    const guardianName = intake.guardian_name || 'Tutor';
    const playerName = intake.player_name || 'Jugador';
    const adminEmail = (Deno.env.get('RECEIPT_BCC_EMAIL') || DEFAULT_ADMIN_EMAIL).trim();
    
    const hasValidGuardianEmail = isValidEmail(guardianEmail);
    const hasValidAdminEmail = isValidEmail(adminEmail);

    console.log(`[send-intake-receipt] Resolviendo destinatarios:`);
    console.log(`  - guardianEmail: "${guardianEmail}" → válido: ${hasValidGuardianEmail}`);
    console.log(`  - adminEmail: "${adminEmail}" → válido: ${hasValidAdminEmail}`);

    // ============================================
    // ESCENARIO: AMBOS INVÁLIDOS
    // ============================================
    if (!hasValidGuardianEmail && !hasValidAdminEmail) {
      console.log('[send-intake-receipt] ❌ Ambos emails inválidos, no se envía');
      await supabaseAdmin.from('intake_requests').update({ 
        receipt_status: 'no_email', 
        receipt_error: 'Sin emails válidos (tutor ni admin)',
        receipt_sent_at: null,
      }).eq('id', intakeId);
      return respond(false, 'no_email', 'No hay emails válidos para envío');
    }

    // ============================================
    // CONSTRUIR FROM Y DESTINATARIOS
    // ============================================
    const from = buildFromField();
    const orgName = intake.organizations?.name || 'Academia';
    const cityName = intake.organizations?.city || '';
    
    const toRecipients = hasValidGuardianEmail ? [guardianEmail!] : [adminEmail];
    const bccRecipients = (hasValidGuardianEmail && hasValidAdminEmail) ? [adminEmail] : undefined;
    const resultStatus = hasValidGuardianEmail ? 'sent' : 'sent_admin_only';

    console.log(`[send-intake-receipt] Configuración de envío:`);
    console.log(`  - from: "${from}"`);
    console.log(`  - to: ${JSON.stringify(toRecipients)}`);
    console.log(`  - bcc: ${bccRecipients ? JSON.stringify(bccRecipients) : 'ninguno'}`);

    // ============================================
    // CONSTRUIR EMAIL HTML
    // ============================================
    const folio = intake.receipt_folio || `FIC-${intakeId.substring(0, 8).toUpperCase()}`;
    const registrationDate = formatDate(intake.created_at);
    const playerAge = intake.player_birth_date ? calculateAge(intake.player_birth_date) : null;
    const sportName = intake.sports?.name || 'Deporte';
    const categoryName = intake.categories?.name || 'Categoría por asignar';

    const adminOnlyNote = !hasValidGuardianEmail 
      ? `<tr><td colspan="2" style="padding:10px;background:#fef3c7;color:#92400e;font-size:12px;text-align:center;border-radius:4px;">⚠️ Este recibo se envió a administración porque no hay email de tutor registrado.</td></tr>` 
      : '';

    // Breakdown de montos
    const registrationFee = intake.registration_fee || 0;
    const monthlyFee = intake.monthly_fee || 0;
    const totalAmount = intake.total_amount || (registrationFee + monthlyFee);
    const promoApplied = intake.promo_applied || false;

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="font-family:Arial,sans-serif;background:#f5f5f5;padding:20px;margin:0;">
  <table width="100%" style="max-width:600px;margin:auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <tr>
      <td style="background:linear-gradient(135deg,#1a1a2e,#16213e);padding:30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:24px;">${orgName}</h1>
        <p style="color:#8b8b9e;margin:8px 0 0;font-size:14px;">Comprobante de Inscripción</p>
        ${cityName ? `<p style="color:#6b7280;margin:5px 0 0;font-size:12px;">${cityName}</p>` : ''}
      </td>
    </tr>
    <tr>
      <td style="padding:30px;text-align:center;">
        <span style="background:#10b981;color:#fff;padding:10px 24px;border-radius:20px;font-weight:600;font-size:14px;">✓ INSCRIPCIÓN COMPLETADA</span>
        <p style="color:#6b7280;margin:15px 0 0;font-size:13px;">Folio: <strong>${folio}</strong></p>
        <p style="color:#9ca3af;margin:5px 0 0;font-size:12px;">${registrationDate}</p>
      </td>
    </tr>
    <tr>
      <td style="padding:0 30px 20px;">
        <h3 style="color:#374151;font-size:14px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Datos del Jugador</h3>
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse;">
          ${adminOnlyNote}
          <tr>
            <td style="padding:12px 15px;border-bottom:1px solid #e5e7eb;color:#374151;width:40%;">Nombre</td>
            <td style="padding:12px 15px;text-align:right;font-weight:600;color:#111827;">${playerName}</td>
          </tr>
          ${playerAge !== null ? `
          <tr>
            <td style="padding:12px 15px;border-bottom:1px solid #e5e7eb;color:#374151;">Edad</td>
            <td style="padding:12px 15px;text-align:right;font-weight:600;color:#111827;">${playerAge} años</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding:12px 15px;border-bottom:1px solid #e5e7eb;color:#374151;">Deporte</td>
            <td style="padding:12px 15px;text-align:right;font-weight:600;color:#111827;">${sportName}</td>
          </tr>
          <tr>
            <td style="padding:12px 15px;border-bottom:1px solid #e5e7eb;color:#374151;">Categoría</td>
            <td style="padding:12px 15px;text-align:right;font-weight:600;color:#111827;">${categoryName}</td>
          </tr>
          <tr>
            <td style="padding:12px 15px;color:#374151;">Tutor</td>
            <td style="padding:12px 15px;text-align:right;font-weight:600;color:#111827;">${guardianName}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:0 30px 30px;">
        <h3 style="color:#374151;font-size:14px;margin:0 0 15px;text-transform:uppercase;letter-spacing:0.5px;">Detalle de Pago</h3>
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse;">
          <tr>
            <td style="padding:12px 15px;border-bottom:1px solid #e5e7eb;color:#374151;">Inscripción</td>
            <td style="padding:12px 15px;text-align:right;font-weight:500;color:#111827;">${formatCurrency(registrationFee)}</td>
          </tr>
          <tr>
            <td style="padding:12px 15px;border-bottom:1px solid #e5e7eb;color:#374151;">
              Mensualidad${promoApplied ? ' <span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;">PROMO</span>' : ''}
            </td>
            <td style="padding:12px 15px;text-align:right;font-weight:500;color:#111827;">${formatCurrency(monthlyFee)}</td>
          </tr>
          <tr style="background:#1a1a2e;">
            <td style="padding:20px;color:#fff;font-weight:500;">TOTAL PAGADO</td>
            <td style="padding:20px;text-align:right;color:#10b981;font-size:24px;font-weight:700;">${formatCurrency(totalAmount)}</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding:20px 30px;background:#f9fafb;text-align:center;">
        <p style="color:#6b7280;font-size:13px;margin:0;line-height:1.5;">
          ¡Bienvenido/a a <strong>${orgName}</strong>! 🎉<br>
          Nos vemos en la cancha.
        </p>
      </td>
    </tr>
    <tr>
      <td style="padding:15px;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#9ca3af;font-size:11px;margin:0;">Comprobante generado automáticamente por STRYK</p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    // ============================================
    // ENVIAR EMAIL
    // ============================================
    try {
      const subjectPrefix = !hasValidGuardianEmail ? '[COPIA ADMIN] ' : '';
      
      const emailResponse = await resend.emails.send({
        from,
        to: toRecipients,
        bcc: bccRecipients,
        subject: `${subjectPrefix}Inscripción Confirmada - ${playerName} - ${orgName}`,
        html: emailHtml,
      });

      if (emailResponse?.data?.id) {
        console.log(`[send-intake-receipt] ✅ Email enviado exitosamente: ${emailResponse.data.id}`);
        
        await supabaseAdmin.from('intake_requests').update({
          receipt_status: resultStatus,
          receipt_sent_at: new Date().toISOString(),
          receipt_error: null,
        }).eq('id', intakeId);

        const successMessage = hasValidGuardianEmail 
          ? `Recibo enviado a ${guardianEmail}${bccRecipients ? ' (copia a admin)' : ''}`
          : `Recibo enviado a administración (tutor sin email)`;
          
        return respond(true, resultStatus, successMessage, emailResponse.data.id);
      }
      
      throw new Error(emailResponse?.error?.message || 'Sin respuesta válida de Resend');
      
    } catch (emailError: any) {
      const errorMsg = emailError.message || JSON.stringify(emailError) || 'Error desconocido al enviar';
      console.error(`[send-intake-receipt] ❌ Error enviando email:`, errorMsg);
      
      await supabaseAdmin.from('intake_requests').update({ 
        receipt_status: 'failed', 
        receipt_error: errorMsg.substring(0, 500),
        receipt_sent_at: null,
      }).eq('id', intakeId);
      
      return respond(false, 'failed', errorMsg);
    }

  } catch (error: any) {
    console.error('[send-intake-receipt] ❌ Error general:', error);
    return respond(false, 'failed', error.message || 'Error interno del servidor');
  }
});
