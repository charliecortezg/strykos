import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RegisterAcademyRequest {
  academyName: string;
  organizationType: string;
  approximateStudents: number;
  primarySport: string;
  city: string;
  country: string;
  phone: string;
  founderName: string;
  email: string;
  password: string;
}

function generateOrgCode(name: string): string {
  let code = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
  
  return code || 'org';
}

function generateAccessKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += '-';
  for (let i = 0; i < 3; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
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

    const body: RegisterAcademyRequest = await req.json();
    const {
      academyName,
      organizationType,
      approximateStudents,
      primarySport,
      city,
      country,
      phone,
      founderName,
      email,
      password,
    } = body;

    // Validate required fields
    if (!academyName || !organizationType || !approximateStudents || !primarySport || 
        !city || !country || !phone || !founderName || !email || !password) {
      return new Response(
        JSON.stringify({ error: 'Todos los campos son obligatorios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser.users.some(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );
    
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: 'Este correo electrónico ya está registrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate org_code ensuring uniqueness
    let baseCode = generateOrgCode(academyName);
    let orgCode = baseCode;
    let counter = 0;
    
    while (true) {
      const { data: existing } = await supabaseAdmin
        .from('organizations')
        .select('id')
        .eq('org_code', orgCode)
        .maybeSingle();
      
      if (!existing) break;
      counter++;
      orgCode = `${baseCode}-${counter}`;
    }

    const orgAccessKey = generateAccessKey();

    console.log('Creating organization:', { orgCode, orgAccessKey, academyName });

    // Create organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: academyName,
        org_code: orgCode,
        org_access_key: orgAccessKey,
        organization_type: organizationType,
        approximate_students: approximateStudents,
        primary_sport: primarySport,
        city,
        country,
        phone,
        plan: 'freemium',
      })
      .select()
      .single();

    if (orgError || !org) {
      console.error('Org creation error:', orgError);
      return new Response(
        JSON.stringify({ error: 'Error al crear la organización' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Organization created:', org.id);

    // Create auth user
    const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
    });

    if (userError || !newUser.user) {
      console.error('User creation error:', userError);
      // Clean up organization
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      return new Response(
        JSON.stringify({ error: userError?.message || 'Error al crear usuario' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('User created:', newUser.user.id);

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: newUser.user.id,
        organization_id: org.id,
        full_name: founderName,
        email: email.toLowerCase(),
        phone,
        must_change_password: false,
      });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      // Clean up
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      return new Response(
        JSON.stringify({ error: 'Error al crear perfil' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Assign org_owner role
    const { error: roleError } = await supabaseAdmin
      .from('user_org_roles')
      .insert({
        user_id: newUser.user.id,
        organization_id: org.id,
        role: 'org_owner',
      });

    if (roleError) {
      console.error('Role assignment error:', roleError);
      // Clean up
      await supabaseAdmin.from('profiles').delete().eq('id', newUser.user.id);
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      await supabaseAdmin.from('organizations').delete().eq('id', org.id);
      return new Response(
        JSON.stringify({ error: 'Error al asignar rol' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if sport needs to be added as custom
    const { data: existingSport } = await supabaseAdmin
      .from('sports')
      .select('id')
      .or(`name.eq.${primarySport},and(organization_id.is.null,name.ilike.${primarySport})`)
      .maybeSingle();

    if (!existingSport) {
      // Add as custom sport for this organization
      await supabaseAdmin
        .from('sports')
        .insert({
          name: primarySport,
          organization_id: org.id,
          is_system: false,
        });
    }

    console.log('Academy registration complete');

    return new Response(
      JSON.stringify({
        success: true,
        organization: {
          id: org.id,
          name: org.name,
          orgCode: org.org_code,
          orgAccessKey: org.org_access_key,
          plan: org.plan,
        },
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Error interno del servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
