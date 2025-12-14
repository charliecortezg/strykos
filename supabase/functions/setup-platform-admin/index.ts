import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// HARDCODED: This is the ONLY platform_super_admin email allowed
const PLATFORM_ADMIN_EMAIL = "carloscortez@roarid.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Parse request body for password
    const { password, secret_key } = await req.json();

    // Simple protection: require a secret key to run this function
    // This should only be called once during initial setup
    if (secret_key !== Deno.env.get("PLATFORM_ADMIN_SETUP_KEY")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid setup key" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!password || password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === PLATFORM_ADMIN_EMAIL.toLowerCase()
    );

    let userId: string;

    if (existingUser) {
      // User exists, verify they're not in any organization
      const { data: profile } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .eq("id", existingUser.id)
        .single();

      if (profile) {
        return new Response(
          JSON.stringify({
            error: "This user already has a profile. Platform admin cannot belong to an organization.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { data: orgRole } = await supabaseAdmin
        .from("user_org_roles")
        .select("id")
        .eq("user_id", existingUser.id)
        .limit(1)
        .single();

      if (orgRole) {
        return new Response(
          JSON.stringify({
            error: "This user has organization roles. Platform admin cannot have org roles.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = existingUser.id;
      console.log("Platform admin user already exists:", userId);
    } else {
      // Create new user
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: PLATFORM_ADMIN_EMAIL,
        password: password,
        email_confirm: true,
      });

      if (createError || !newUser?.user) {
        console.error("Failed to create platform admin user:", createError);
        return new Response(
          JSON.stringify({ error: `Failed to create user: ${createError?.message}` }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = newUser.user.id;
      console.log("Created platform admin user:", userId);
    }

    // Check if already in platform_roles
    const { data: existingPlatformRole } = await supabaseAdmin
      .from("platform_roles")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    if (existingPlatformRole) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "Platform admin already configured",
          user_id: userId,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert into platform_roles
    const { error: roleError } = await supabaseAdmin.from("platform_roles").insert({
      user_id: userId,
      role: "platform_super_admin",
    });

    if (roleError) {
      console.error("Failed to assign platform role:", roleError);
      return new Response(
        JSON.stringify({ error: `Failed to assign role: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Platform admin setup complete for:", PLATFORM_ADMIN_EMAIL);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Platform super admin created successfully",
        email: PLATFORM_ADMIN_EMAIL,
        user_id: userId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
