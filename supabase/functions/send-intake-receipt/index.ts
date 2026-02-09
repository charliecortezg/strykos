import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// ============================================
// CONSTANTES Y FALLBACKS
// ============================================
const DEFAULT_FROM_NAME = 'White Lions Academies via STRYK';
const DEFAULT_FROM_EMAIL = 'notificacion@roarid.com';
const DEFAULT_ADMIN_EMAIL = 'whitelions.admn@gmail.com';
const WHATSAPP_GROUP_URL = 'https://chat.whatsapp.com/Eo4rNQOJsSjD2B6ptI1rPu';
const PARENTS_GUIDE_URL = 'https://strykos.lovable.app/images/guia-padres.png';

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
    weekday: 'long',
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

function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    efectivo: '💵 Efectivo',
    transferencia: '🏦 Transferencia',
    tarjeta: '💳 Tarjeta',
    otro: '📋 Otro',
  };
  return labels[method] || method;
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
    // FETCH INTAKE REQUEST + ORG + VENUE + COACH
    // ============================================
    const { data: intake, error: intakeError } = await supabaseAdmin
      .from('intake_requests')
      .select(`
        *,
        organizations!inner(id, name, city, receipt_logo_url, org_code, org_access_key),
        categories(id, name),
        sports(id, name),
        venues:venue_id(id, name),
        profiles:created_by(id, full_name)
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
    const logoUrl = intake.organizations?.receipt_logo_url || '';
    const orgCode = `${intake.organizations?.org_code || '---'} / ${intake.organizations?.org_access_key || '---'}`;
    
    const toRecipients = hasValidGuardianEmail ? [guardianEmail!] : [adminEmail];
    const bccRecipients = (hasValidGuardianEmail && hasValidAdminEmail) ? [adminEmail] : undefined;
    const resultStatus = hasValidGuardianEmail ? 'sent' : 'sent_admin_only';

    console.log(`[send-intake-receipt] Configuración de envío:`);
    console.log(`  - from: "${from}"`);
    console.log(`  - to: ${JSON.stringify(toRecipients)}`);
    console.log(`  - bcc: ${bccRecipients ? JSON.stringify(bccRecipients) : 'ninguno'}`);

    // ============================================
    // CONSTRUIR EMAIL HTML - DISEÑO WHITE LIONS
    // ============================================
    const folio = intake.receipt_folio || `FIC-${intakeId.substring(0, 8).toUpperCase()}`;
    const registrationDate = formatDate(intake.created_at);
    const sportName = intake.sports?.name || 'Fútbol';
    const categoryName = intake.categories?.name || 'Por asignar';
    const venueName = intake.venues?.name || 'Por asignar';
    const coachName = intake.profiles?.full_name || 'Por asignar';

    const registrationFee = intake.registration_fee || 0;
    const monthlyFee = intake.monthly_fee || 0;
    const totalAmount = intake.total_amount || (registrationFee + monthlyFee);
    const promoApplied = intake.promo_applied || false;
    const paymentMethodLabel = getPaymentMethodLabel(intake.payment_method);

    const adminOnlyNote = !hasValidGuardianEmail 
      ? `<tr><td colspan="2" style="padding:10px;background:#fef3c7;color:#92400e;font-size:12px;text-align:center;border-radius:4px;">⚠️ Este recibo se envió a administración porque no hay email de tutor registrado.</td></tr>` 
      : '';

    // Logo section
    const logoSection = logoUrl 
      ? `<img src="${logoUrl}" alt="${orgName}" style="max-height:60px;max-width:200px;margin-bottom:10px;" />`
      : `<span style="font-size:32px;">🏆</span>`;

    const emailHtml = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:'Segoe UI',Arial,sans-serif;background:#f0f2f5;padding:20px;margin:0;">
  <table width="100%" style="max-width:600px;margin:auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    
    <!-- HEADER: Navy gradient with org branding -->
    <tr>
      <td style="background:linear-gradient(135deg,#0f1b2d 0%,#1a2e4a 50%,#1e3a5f 100%);padding:35px 30px;text-align:center;">
        ${logoSection}
        <h1 style="color:#ffffff;margin:10px 0 0;font-size:22px;font-weight:700;letter-spacing:0.5px;">${orgName.toUpperCase()}</h1>
        <p style="color:#c9a84c;margin:6px 0 0;font-size:12px;letter-spacing:2px;font-weight:500;">Courage · Unity · Resilience</p>
      </td>
    </tr>

    <!-- WELCOME MESSAGE -->
    <tr>
      <td style="padding:30px 30px 10px;text-align:center;border-bottom:1px solid #e5e7eb;">
        <h2 style="color:#1a2e4a;font-size:24px;margin:0 0 8px;font-weight:700;">¡Bienvenido a la Familia!</h2>
        <p style="color:#6b7280;font-size:14px;margin:0;line-height:1.5;">
          Hola <strong>${guardianName}</strong>, gracias por confiar en nosotros.
        </p>
      </td>
    </tr>

    <!-- DATOS DEL FICHAJE -->
    <tr>
      <td style="padding:25px 30px 15px;">
        <h3 style="color:#1a2e4a;font-size:14px;margin:0 0 15px;font-weight:600;">
          ⚽ Datos del Fichaje
        </h3>
        <table width="100%" style="border:1px solid #e5e7eb;border-radius:8px;border-collapse:collapse;overflow:hidden;">
          ${adminOnlyNote}
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:12px 16px;color:#6b7280;font-size:13px;width:35%;">Jugador:</td>
            <td style="padding:12px 16px;text-align:right;font-weight:600;color:#111827;font-size:13px;">${playerName}</td>
          </tr>
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:12px 16px;color:#6b7280;font-size:13px;">Deporte:</td>
            <td style="padding:12px 16px;text-align:right;font-weight:600;color:#111827;font-size:13px;">${sportName}</td>
          </tr>
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:12px 16px;color:#6b7280;font-size:13px;">Sede:</td>
            <td style="padding:12px 16px;text-align:right;font-weight:600;color:#111827;font-size:13px;">${venueName}</td>
          </tr>
          <tr style="border-bottom:1px solid #f3f4f6;">
            <td style="padding:12px 16px;color:#6b7280;font-size:13px;">Coach:</td>
            <td style="padding:12px 16px;text-align:right;font-weight:600;color:#111827;font-size:13px;">${coachName}</td>
          </tr>
          <tr>
            <td style="padding:12px 16px;color:#6b7280;font-size:13px;">Fecha:</td>
            <td style="padding:12px 16px;text-align:right;font-weight:600;color:#111827;font-size:13px;">${registrationDate}</td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- RESUMEN DE PAGO -->
    <tr>
      <td style="padding:10px 30px 25px;">
        <div style="background:linear-gradient(135deg,#fefce8 0%,#fef9c3 100%);border:1px solid #fde68a;border-radius:10px;padding:20px;overflow:hidden;">
          <h3 style="color:#1a2e4a;font-size:14px;margin:0 0 15px;font-weight:600;">
            💰 Resumen de Pago
          </h3>
          <table width="100%" style="border-collapse:collapse;">
            <tr style="border-bottom:1px solid #fde68a;">
              <td style="padding:10px 0;color:#374151;font-size:13px;">Inscripción:</td>
              <td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px;">${formatCurrency(registrationFee)}</td>
            </tr>
            <tr style="border-bottom:1px solid #fde68a;">
              <td style="padding:10px 0;color:#374151;font-size:13px;">
                Mensualidad:${promoApplied ? ' <span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:8px;font-size:10px;font-weight:600;">PROMO</span>' : ''}
              </td>
              <td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px;">${formatCurrency(monthlyFee)}</td>
            </tr>
            <tr style="border-bottom:1px solid #fde68a;">
              <td style="padding:10px 0;color:#374151;font-size:13px;">Método de Pago:</td>
              <td style="padding:10px 0;text-align:right;font-weight:600;color:#111827;font-size:13px;">${paymentMethodLabel}</td>
            </tr>
          </table>
          <div style="margin-top:15px;padding-top:15px;border-top:2px solid #c9a84c;text-align:center;">
            <span style="color:#c9a84c;font-size:14px;font-weight:700;">TOTAL PAGADO:</span>
            <div style="color:#1a2e4a;font-size:28px;font-weight:800;margin-top:4px;">${formatCurrency(totalAmount)}</div>
          </div>
        </div>
      </td>
    </tr>

    <!-- BOTÓN: GUÍA PARA PADRES -->
    <tr>
      <td style="padding:5px 30px;text-align:center;">
        <p style="color:#6b7280;font-size:13px;margin:0 0 12px;">
          🎓 Consulta nuestra guía con información importante para padres:
        </p>
        <a href="${PARENTS_GUIDE_URL}" target="_blank" style="display:inline-block;background:#1a2e4a;color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.3px;">
          📖 VER GUÍA PARA PADRES
        </a>
      </td>
    </tr>

    <!-- PORTAL FAMILIAR CON CREDENCIALES -->
    <tr>
      <td style="padding:20px 30px 5px;">
        <div style="background:linear-gradient(135deg,#0f1b2d 0%,#1a2e4a 100%);border-radius:12px;padding:25px;text-align:center;">
          <h3 style="color:#c9a84c;font-size:16px;margin:0 0 8px;font-weight:700;">📊 Portal Familiar STRYK</h3>
          <p style="color:#e5e7eb;font-size:13px;margin:0 0 20px;line-height:1.5;">
            Accede al portal para ver el progreso y estadísticas de tu jugador. Usa las siguientes credenciales:
          </p>
          
          <table width="100%" style="border-collapse:collapse;margin-bottom:20px;">
            <tr>
              <td style="padding:10px 12px;text-align:left;border-bottom:1px solid rgba(201,168,76,0.2);">
                <span style="color:#9ca3af;font-size:11px;display:block;margin-bottom:2px;">📱 Teléfono registrado</span>
                <span style="color:#ffffff;font-size:16px;font-weight:700;letter-spacing:0.5px;">${intake.guardian_phone}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 12px;text-align:left;border-bottom:1px solid rgba(201,168,76,0.2);">
                <span style="color:#9ca3af;font-size:11px;display:block;margin-bottom:2px;">🔑 PIN de acceso (últimos 4 dígitos de tu teléfono)</span>
                <span style="color:#c9a84c;font-size:22px;font-weight:800;letter-spacing:4px;">${intake.guardian_phone.replace(/\D/g,'').slice(-4)}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:10px 12px;text-align:left;">
                <span style="color:#9ca3af;font-size:11px;display:block;margin-bottom:2px;">🏛️ Código de Academia</span>
                <div style="background:rgba(255,255,255,0.1);border:1px dashed #c9a84c;border-radius:6px;padding:8px 12px;margin-top:4px;display:inline-block;">
                  <span style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:1px;">${intake.organizations?.name ? '' : ''}${orgCode}</span>
                </div>
              </td>
            </tr>
          </table>

          <a href="https://strykos.lovable.app/portal/login" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#c9a84c,#d4a030);color:#0f1b2d;padding:14px 40px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;letter-spacing:0.5px;">
            INGRESAR AL PORTAL →
          </a>
        </div>
      </td>
    </tr>

    <!-- BOTÓN: WHATSAPP -->
    <tr>
      <td style="padding:20px 30px;text-align:center;">
        <p style="color:#6b7280;font-size:13px;margin:0 0 12px;">
          Únete a nuestro grupo de WhatsApp para estar al tanto de todo:
        </p>
        <a href="${WHATSAPP_GROUP_URL}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#25d366,#128c7e);color:#ffffff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.3px;">
          💬 UNIRSE AL GRUPO DE WHATSAPP
        </a>
      </td>
    </tr>

    <!-- FOOTER -->
    <tr>
      <td style="padding:25px 30px;background:#f9fafb;text-align:center;border-top:1px solid #e5e7eb;">
        <p style="color:#1a2e4a;font-size:14px;font-weight:600;margin:0;">${orgName}</p>
        <p style="color:#9ca3af;font-size:11px;margin:8px 0 0;line-height:1.5;">
          Este es un recibo automático. Para cualquier duda, contacta a tu coach.
        </p>
        <p style="color:#c9c9c9;font-size:10px;margin:8px 0 0;">
          ID de fichaje: ${intakeId}
        </p>
      </td>
    </tr>

    <!-- POWERED BY -->
    <tr>
      <td style="padding:12px;text-align:center;background:#f0f2f5;">
        <p style="color:#b0b0b0;font-size:10px;margin:0;">Powered by <strong>STRYK</strong></p>
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
        subject: `${subjectPrefix}¡Bienvenido a ${orgName}! - Fichaje de ${playerName}`,
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
