import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type OrgRole = 'org_owner' | 'director_deportivo' | 'entrenador' | 'administrativo';

interface ManageUserRequest {
  action: 'update' | 'change_role' | 'toggle_active';
  userId: string;
  data?: {
    fullName?: string;
    phone?: string;
    role?: Exclude<OrgRole, 'org_owner'>;
    isActive?: boolean;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

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

    // Get calling user's profile
    const { data: callingProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('organization_id')
      .eq('id', callingUser.id)
      .single();

    if (profileError || !callingProfile) {
      return new Response(
        JSON.stringify({ error: 'Perfil no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is org_owner
    const { data: callerRoles, error: roleError } = await supabaseAdmin
      .from('user_org_roles')
      .select('role')
      .eq('user_id', callingUser.id)
      .eq('organization_id', callingProfile.organization_id);

    const isOrgOwner = callerRoles?.some(r => r.role === 'org_owner');
    
    if (roleError || !isOrgOwner) {
      return new Response(
        JSON.stringify({ error: 'Solo el fundador puede gestionar usuarios' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body: ManageUserRequest = await req.json();
    const { action, userId, data } = body;

    if (!action || !userId) {
      return new Response(
        JSON.stringify({ error: 'Acción y usuario son obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify target user belongs to same organization
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id, organization_id, full_name')
      .eq('id', userId)
      .single();

    if (targetError || !targetProfile) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (targetProfile.organization_id !== callingProfile.organization_id) {
      return new Response(
        JSON.stringify({ error: 'Usuario no pertenece a esta organización' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent self-deactivation for org_owner
    if (action === 'toggle_active' && userId === callingUser.id) {
      return new Response(
        JSON.stringify({ error: 'No puedes desactivarte a ti mismo' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if target is org_owner (cannot change their role)
    const { data: targetRoles } = await supabaseAdmin
      .from('user_org_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('organization_id', callingProfile.organization_id);

    const targetIsOrgOwner = targetRoles?.some(r => r.role === 'org_owner');

    switch (action) {
      case 'update': {
        const updateData: Record<string, string> = {};
        if (data?.fullName) updateData.full_name = data.fullName;
        if (data?.phone !== undefined) updateData.phone = data.phone;

        if (Object.keys(updateData).length === 0) {
          return new Response(
            JSON.stringify({ error: 'No hay datos para actualizar' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update(updateData)
          .eq('id', userId);

        if (updateError) {
          console.error('Update error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Error al actualizar usuario' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Usuario actualizado' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'change_role': {
        if (targetIsOrgOwner) {
          return new Response(
            JSON.stringify({ error: 'No se puede cambiar el rol del fundador' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (!data?.role) {
          return new Response(
            JSON.stringify({ error: 'Rol es obligatorio' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const validRoles = ['director_deportivo', 'entrenador', 'administrativo'];
        if (!validRoles.includes(data.role)) {
          return new Response(
            JSON.stringify({ error: 'Rol inválido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Update the role (replace existing non-org_owner role)
        const { error: deleteError } = await supabaseAdmin
          .from('user_org_roles')
          .delete()
          .eq('user_id', userId)
          .eq('organization_id', callingProfile.organization_id)
          .neq('role', 'org_owner');

        if (deleteError) {
          console.error('Delete role error:', deleteError);
          return new Response(
            JSON.stringify({ error: 'Error al actualizar rol' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const { error: insertError } = await supabaseAdmin
          .from('user_org_roles')
          .insert({
            user_id: userId,
            organization_id: callingProfile.organization_id,
            role: data.role,
          });

        if (insertError) {
          console.error('Insert role error:', insertError);
          return new Response(
            JSON.stringify({ error: 'Error al asignar nuevo rol' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ success: true, message: 'Rol actualizado' }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'toggle_active': {
        if (targetIsOrgOwner && userId !== callingUser.id) {
          return new Response(
            JSON.stringify({ error: 'No se puede desactivar al fundador' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        const newStatus = data?.isActive ?? false;

        const { error: updateError } = await supabaseAdmin
          .from('profiles')
          .update({ is_active: newStatus })
          .eq('id', userId);

        if (updateError) {
          console.error('Toggle active error:', updateError);
          return new Response(
            JSON.stringify({ error: 'Error al cambiar estado' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            message: newStatus ? 'Usuario activado' : 'Usuario desactivado' 
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Acción no válida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
