import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend@2.0.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OrgRole = 'director_deportivo' | 'entrenador' | 'administrativo';

const ROLE_LABELS: Record<OrgRole, string> = {
  'director_deportivo': 'Director Deportivo',
  'entrenador': 'Entrenador',
  'administrativo': 'Administrativo',
};

interface CreateUserRequest {
  fullName: string;
  email: string;
  password: string;
  role: OrgRole;
  sendInviteEmail?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendKey = Deno.env.get('RESEND_API_KEY');
    
    // Client with service role for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // ===== STEP 1: Verify Authorization =====
    log('[1/7] Verificando autorización...');
    
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No autorizado', logs }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callingUser) {
      log(`Auth error: ${authError?.message}`);
      return new Response(
        JSON.stringify({ error: 'Token inválido', logs }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log(`Usuario autenticado: ${callingUser.email}`);

    // ===== STEP 2: Get caller's profile =====
    log('[2/7] Obteniendo perfil del llamador...');
    
    const { data: callingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', callingUser.id)
      .single();

    if (profileError || !callingProfile) {
      log(`Profile error: ${profileError?.message}`);
      return new Response(
        JSON.stringify({ error: 'Perfil no encontrado', logs }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log(`Organización: ${callingProfile.organization_id}`);

    // ===== STEP 3: Verify caller is org_owner =====
    log('[3/7] Verificando rol org_owner...');
    
    // FIX: Use .eq('role', 'org_owner') and check if exists, not .single()
    const { data: callerRoles, error: roleError } = await supabaseAdmin
      .from('user_org_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('organization_id', callingProfile.organization_id)
      .eq('role', 'org_owner');

    if (roleError) {
      log(`Role query error: ${roleError.message}`);
      return new Response(
        JSON.stringify({ error: 'Error verificando permisos', logs }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!callerRoles || callerRoles.length === 0) {
      log('Usuario no es org_owner');
      return new Response(
        JSON.stringify({ error: 'Solo el fundador puede crear usuarios', logs }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log('Permiso org_owner confirmado');

    // ===== STEP 4: Parse and validate request =====
    log('[4/7] Validando datos de entrada...');
    
    const body: CreateUserRequest = await req.json();
    const { fullName, email, password, role, sendInviteEmail = true } = body;

    if (!fullName || !email || !password || !role) {
      return new Response(
        JSON.stringify({ error: 'Todos los campos son obligatorios', logs }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const validRoles: OrgRole[] = ['director_deportivo', 'entrenador', 'administrativo'];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: 'Rol inválido', logs }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fase 3: gate roles based on org feature_profile.
    // Non-'full' orgs (academia nueva, one-product model) can ONLY create entrenadores.
    const { data: orgRow } = await supabaseAdmin
      .from('organizations')
      .select('feature_profile')
      .eq('id', callingProfile.organization_id)
      .single();
    const orgProfile = (orgRow as any)?.feature_profile;
    if (orgProfile !== 'full' && role !== 'entrenador') {
      log(`Rol ${role} rechazado en org perfil=${orgProfile}`);
      return new Response(
        JSON.stringify({ error: 'En esta academia solo puedes crear entrenadores', logs }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    log(`Creando ${ROLE_LABELS[role]}: ${normalizedEmail}`);

    // ===== STEP 5: Handle idempotent user creation =====
    log('[5/7] Verificando/creando usuario en auth...');
    
    let userId: string;
    let isExistingUser = false;

    // Check if user already exists in auth.users (globally)
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === normalizedEmail
    );

    if (existingAuthUser) {
      userId = existingAuthUser.id;
      isExistingUser = true;
      log(`Usuario auth existente: ${userId}`);

      // Check if user is already in THIS organization
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .eq('organization_id', callingProfile.organization_id)
        .maybeSingle();

      if (existingProfile) {
        // User exists in this org - check if they already have this role
        const { data: existingRole } = await supabaseAdmin
          .from('user_org_roles')
          .select('id')
          .eq('user_id', userId)
          .eq('organization_id', callingProfile.organization_id)
          .eq('role', role)
          .maybeSingle();

        if (existingRole) {
          log('Usuario ya tiene este rol en la organización');
          return new Response(
            JSON.stringify({ 
              success: true,
              message: 'El usuario ya existe con este rol',
              user: { id: userId, email: normalizedEmail, fullName, role },
              isExisting: true,
              inviteEmailSent: false,
              logs
            }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        // User exists in org but with different role - add the new role
        log('Usuario existe en org, agregando nuevo rol...');
      }
    } else {
      // Create new auth user
      log('Creando nuevo usuario auth...');
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: normalizedEmail,
        password,
        email_confirm: true,
      });

      if (createError || !newUser.user) {
        log(`Error creando usuario: ${createError?.message}`);
        return new Response(
          JSON.stringify({ error: createError?.message || 'Error al crear usuario', logs }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      userId = newUser.user.id;
      log(`Usuario auth creado: ${userId}`);
    }

    // ===== STEP 6: Upsert profile and role =====
    log('[6/7] Guardando perfil y rol...');

    // Upsert profile (handles both new and existing users)
    const { error: profileUpsertError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        organization_id: callingProfile.organization_id,
        full_name: fullName,
        email: normalizedEmail,
        must_change_password: !isExistingUser, // Only require password change for new users
        is_active: true,
      }, {
        onConflict: 'id',
        ignoreDuplicates: false,
      });

    if (profileUpsertError) {
      log(`Error upsert profile: ${profileUpsertError.message}`);
      // If we created a new user, clean it up
      if (!isExistingUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      return new Response(
        JSON.stringify({ error: 'Error al guardar perfil', logs }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    log('Perfil guardado');

    // Upsert role (unique constraint on user_id + organization_id + role would be ideal)
    // First try to insert, if it fails due to duplicate, that's ok
    const { error: roleInsertError } = await supabaseAdmin
      .from('user_org_roles')
      .upsert({
        user_id: userId,
        organization_id: callingProfile.organization_id,
        role,
      }, {
        onConflict: 'user_id,organization_id,role',
        ignoreDuplicates: true,
      });

    // Note: if there's no unique constraint, try insert and handle duplicate error
    if (roleInsertError && !roleInsertError.message.includes('duplicate')) {
      log(`Error inserting role: ${roleInsertError.message}`);
      // Don't fail - the user might already have the role
    } else {
      log('Rol asignado');
    }

    // ===== STEP 7: Send invite email (best-effort) =====
    log('[7/7] Enviando invitación por correo...');
    
    let inviteEmailSent = false;
    let inviteEmailError: string | null = null;

    if (sendInviteEmail && resendKey) {
      try {
        const { data: org } = await supabaseAdmin
          .from('organizations')
          .select('name, org_code, org_access_key')
          .eq('id', callingProfile.organization_id)
          .single();

        if (org) {
          const resend = new Resend(resendKey);
          
          // Get the correct app URL
          const appUrl = 'https://strykos.lovable.app';
          const loginUrl = `${appUrl}/login`;

          const emailResponse = await resend.emails.send({
            from: 'STRYK <noreply@roarid.com>',
            to: [normalizedEmail],
            subject: `¡Bienvenido a ${org.name} en STRYK!`,
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
                              Has sido agregado como <strong>${ROLE_LABELS[role]}</strong> en <strong>${org.name}</strong>.
                            </p>
                            
                            <p style="color: #475569; line-height: 1.6; margin: 0 0 24px;">
                              Ya puedes acceder a STRYK para gestionar tu academia deportiva.
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
                                    <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #1e293b;">${org.org_code}</code>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="color: #64748b; font-size: 13px;">Clave de acceso:</span>
                                  </td>
                                  <td style="padding: 8px 0; text-align: right;">
                                    <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #1e293b;">${org.org_access_key}</code>
                                  </td>
                                </tr>
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="color: #64748b; font-size: 13px;">Correo:</span>
                                  </td>
                                  <td style="padding: 8px 0; text-align: right;">
                                    <code style="background: #e2e8f0; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #1e293b;">${normalizedEmail}</code>
                                  </td>
                                </tr>
                                ${!isExistingUser ? `
                                <tr>
                                  <td style="padding: 8px 0;">
                                    <span style="color: #64748b; font-size: 13px;">Contraseña temporal:</span>
                                  </td>
                                  <td style="padding: 8px 0; text-align: right;">
                                    <code style="background: #fef3c7; padding: 4px 8px; border-radius: 4px; font-size: 13px; color: #92400e;">${password}</code>
                                  </td>
                                </tr>
                                ` : ''}
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
                            
                            ${!isExistingUser ? `
                            <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0;">
                              <strong>Nota:</strong> Se te pedirá cambiar tu contraseña en el primer inicio de sesión.
                            </p>
                            ` : ''}
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

          if (emailResponse.data?.id) {
            inviteEmailSent = true;
            log(`Email enviado: ${emailResponse.data.id}`);
          } else if (emailResponse.error) {
            inviteEmailError = emailResponse.error.message;
            log(`Error de Resend: ${inviteEmailError}`);
          }
        }
      } catch (emailError: any) {
        inviteEmailError = emailError.message || 'Error desconocido al enviar email';
        log(`Error enviando email: ${inviteEmailError}`);
        // Don't fail the user creation if email fails
      }
    } else if (!resendKey) {
      log('RESEND_API_KEY no configurada, omitiendo email');
      inviteEmailError = 'Servicio de email no configurado';
    }

    // ===== SUCCESS =====
    log('✅ Usuario creado exitosamente');

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: { 
          id: userId, 
          email: normalizedEmail,
          fullName,
          role 
        },
        isExisting: isExistingUser,
        inviteEmailSent,
        inviteEmailError,
        logs
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Unexpected error:', error);
    logs.push(`Error inesperado: ${error.message}`);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor', details: error.message, logs }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
