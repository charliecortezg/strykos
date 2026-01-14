import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendReceiptRequest {
  paymentId: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get('RESEND_API_KEY');
    if (!resendKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Email service not configured', sent: false }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resend = new Resend(resendKey);
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado', sent: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Token inválido', sent: false }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get caller's profile
    const { data: callingProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', callingUser.id)
      .single();

    if (!callingProfile) {
      return new Response(
        JSON.stringify({ error: 'Perfil no encontrado', sent: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: SendReceiptRequest = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return new Response(
        JSON.stringify({ error: 'Payment ID requerido', sent: false }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch payment with player and organization data
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        player:players(id, full_name, email),
        organization:organizations(id, name, plan)
      `)
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Payment not found:', paymentError);
      return new Response(
        JSON.stringify({ error: 'Pago no encontrado', sent: false }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment belongs to caller's organization
    if (payment.organization_id !== callingProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'No autorizado para este pago', sent: false }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if organization is enterprise
    const orgPlan = (payment.organization as any)?.plan;
    if (orgPlan !== 'enterprise') {
      console.log('Organization is not enterprise, skipping receipt email');
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: false, 
          reason: 'not_enterprise',
          message: 'Recibos digitales solo disponibles en plan Enterprise'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check idempotency - already sent
    if (payment.receipt_sent_at) {
      console.log('Receipt already sent for payment:', paymentId);
      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: false, 
          reason: 'already_sent',
          message: 'Recibo ya fue enviado anteriormente'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get player email
    const playerEmail = (payment.player as any)?.email;
    const playerName = (payment.player as any)?.full_name || 'Jugador';
    const orgName = (payment.organization as any)?.name || 'Academia';

    if (!playerEmail) {
      console.log('Player has no email, skipping receipt');
      // Update payment to mark as no-op
      await supabaseAdmin
        .from('payments')
        .update({ 
          receipt_status: 'no_email',
          receipt_error: 'Jugador sin correo electrónico'
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: false, 
          reason: 'no_email',
          message: 'El jugador no tiene correo registrado'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format payment date
    const paymentDate = new Date(payment.created_at);
    const formattedDate = paymentDate.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Format payment month
    const paymentMonth = new Date(payment.payment_month);
    const formattedMonth = paymentMonth.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long'
    });

    // Format amount
    const formattedAmount = new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(payment.amount);

    // Generate receipt folio
    const folio = `REC-${paymentDate.getFullYear()}${String(paymentDate.getMonth() + 1).padStart(2, '0')}${String(paymentDate.getDate()).padStart(2, '0')}-${paymentId.slice(0, 8).toUpperCase()}`;

    // Send receipt email
    try {
      const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'notificaciones@roarid.com';
      const emailResponse = await resend.emails.send({
        from: `${orgName} via STRYK <${fromEmail}>`,
        to: [playerEmail],
        subject: `Recibo de Pago - ${orgName}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
              <tr>
                <td align="center">
                  <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                      <td style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 30px 40px; text-align: center;">
                        <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 700;">Recibo de Pago</h1>
                        <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">${orgName}</p>
                      </td>
                    </tr>
                    
                    <!-- Content -->
                    <tr>
                      <td style="padding: 40px;">
                        <!-- Folio -->
                        <div style="text-align: right; margin-bottom: 24px;">
                          <span style="color: #64748b; font-size: 12px;">Folio:</span>
                          <code style="background: #f1f5f9; padding: 4px 8px; border-radius: 4px; font-size: 12px; color: #1e293b; margin-left: 8px;">${folio}</code>
                        </div>
                        
                        <h2 style="color: #1e293b; margin: 0 0 24px; font-size: 20px;">¡Hola ${playerName}!</h2>
                        
                        <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                          Hemos recibido tu pago correctamente. A continuación los detalles:
                        </p>
                        
                        <!-- Receipt Details -->
                        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; margin: 0 0 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <span style="color: #64748b; font-size: 14px;">Concepto:</span>
                              </td>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${payment.concept || 'Mensualidad'}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <span style="color: #64748b; font-size: 14px;">Período:</span>
                              </td>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${formattedMonth}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0;">
                                <span style="color: #64748b; font-size: 14px;">Fecha de pago:</span>
                              </td>
                              <td style="padding: 12px 0; border-bottom: 1px solid #e2e8f0; text-align: right;">
                                <span style="color: #1e293b; font-size: 14px; font-weight: 500;">${formattedDate}</span>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 16px 0 0;">
                                <span style="color: #1e293b; font-size: 16px; font-weight: 600;">Total:</span>
                              </td>
                              <td style="padding: 16px 0 0; text-align: right;">
                                <span style="color: #059669; font-size: 24px; font-weight: 700;">${formattedAmount}</span>
                              </td>
                            </tr>
                          </table>
                        </div>
                        
                        <!-- Success Badge -->
                        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; text-align: center;">
                          <span style="color: #059669; font-size: 14px; font-weight: 500;">✓ Pago registrado correctamente</span>
                        </div>
                      </td>
                    </tr>
                    
                    <!-- Footer -->
                    <tr>
                      <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                        <p style="color: #64748b; font-size: 12px; margin: 0 0 8px;">
                          Este recibo fue generado automáticamente por STRYK
                        </p>
                        <p style="color: #94a3b8; font-size: 11px; margin: 0;">
                          © ${new Date().getFullYear()} STRYK. Todos los derechos reservados.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
          </html>
        `,
      });

      console.log('Receipt email sent:', emailResponse);

      // Update payment with receipt info
      await supabaseAdmin
        .from('payments')
        .update({
          receipt_status: 'sent',
          receipt_sent_at: new Date().toISOString(),
          receipt_email: playerEmail,
          receipt_error: null
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          sent: true,
          emailId: emailResponse.data?.id,
          folio
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (emailError: any) {
      console.error('Error sending receipt email:', emailError);
      
      // Detect domain-related errors
      const errorMessage = emailError.message || 'Error al enviar correo';
      const isDomainError = errorMessage.includes('domain') || 
                            errorMessage.includes('403') ||
                            errorMessage.includes('not verified');
      
      const friendlyError = isDomainError 
        ? 'Dominio de email no verificado en Resend. Contacte soporte.'
        : errorMessage;

      // Update payment with error
      await supabaseAdmin
        .from('payments')
        .update({
          receipt_status: 'failed',
          receipt_error: friendlyError
        })
        .eq('id', paymentId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          sent: false,
          error: 'Error al enviar recibo'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Error in send-payment-receipt:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', sent: false }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
