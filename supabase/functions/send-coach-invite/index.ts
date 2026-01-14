import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SendInviteRequest {
  userId: string;
  email: string;
  fullName: string;
  organizationName: string;
  tempPassword: string;
  orgCode: string;
  orgAccessKey: string;
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
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(
        JSON.stringify({ error: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is org_owner
    const { data: callingProfile } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', callingUser.id)
      .single();

    if (!callingProfile) {
      return new Response(
        JSON.stringify({ error: 'Perfil no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: callerRole } = await supabaseAdmin
      .from('user_org_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('organization_id', callingProfile.organization_id)
      .single();

    if (callerRole?.role !== 'org_owner') {
      return new Response(
        JSON.stringify({ error: 'Solo el administrador puede enviar invitaciones' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request
    const body: SendInviteRequest = await req.json();
    const { email, fullName, organizationName, tempPassword, orgCode, orgAccessKey } = body;

    // Get login URL
    const appUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://stryk.lovable.app';
    const loginUrl = `${appUrl}/login`;

    // Send welcome email
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL') || 'notificaciones@roarid.com';
    const emailResponse = await resend.emails.send({
      from: `STRYK <${fromEmail}>`,
      to: [email],
      subject: `¡Bienvenido a ${organizationName} en STRYK!`,
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
                    <td style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 40px 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">STRYK</h1>
                      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Sistema Operativo Deportivo</p>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="color: #1e293b; margin: 0 0 20px; font-size: 22px;">¡Hola ${fullName}!</h2>
                      
                      <p style="color: #475569; line-height: 1.6; margin: 0 0 20px;">
                        Has sido agregado como <strong>Entrenador</strong> en <strong>${organizationName}</strong>.
                      </p>
                      
                      <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                        Ya puedes acceder a STRYK para gestionar asistencias, registrar partidos y más.
                      </p>
                      
                      <!-- Credentials Box -->
                      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 0 0 24px;">
                        <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Datos de acceso</p>
                        
                        <table width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #64748b; font-size: 13px;">Código de organización:</span>
                            </td>
                            <td style="padding: 8px 0; text-align: right;">
                              <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #1e293b;">${orgCode}</code>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #64748b; font-size: 13px;">Clave de acceso:</span>
                            </td>
                            <td style="padding: 8px 0; text-align: right;">
                              <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #1e293b;">${orgAccessKey}</code>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #64748b; font-size: 13px;">Correo:</span>
                            </td>
                            <td style="padding: 8px 0; text-align: right;">
                              <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #1e293b;">${email}</code>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <span style="color: #64748b; font-size: 13px;">Contraseña temporal:</span>
                            </td>
                            <td style="padding: 8px 0; text-align: right;">
                              <code style="background: #fef3c7; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #92400e;">${tempPassword}</code>
                            </td>
                          </tr>
                        </table>
                      </div>
                      
                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 0 0 24px;">
                            <a href="${loginUrl}" style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                              Ingresar a STRYK
                            </a>
                          </td>
                        </tr>
                      </table>
                      
                      <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
                        <strong>Nota:</strong> Se te pedirá cambiar tu contraseña en el primer inicio de sesión.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
                      <p style="color: #94a3b8; font-size: 12px; margin: 0;">
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

    console.log('Welcome email sent:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error sending invite:', error);
    return new Response(
      JSON.stringify({ error: 'Error al enviar invitación' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
