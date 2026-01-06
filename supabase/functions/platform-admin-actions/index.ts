import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ActionPayload {
  action: "change_plan" | "toggle_organization" | "resolve_upgrade_request";
  organization_id?: string;
  request_id?: string;
  new_plan?: "freemium" | "starter" | "professional" | "enterprise";
  is_active?: boolean;
  status?: "approved" | "rejected";
  admin_notes?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Client with user's auth for verification
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get current user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      throw new Error("Unauthorized: Invalid session");
    }

    // Service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is a platform admin
    const { data: platformRole, error: roleError } = await supabaseAdmin
      .from("platform_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "platform_super_admin")
      .single();

    if (roleError || !platformRole) {
      throw new Error("Forbidden: Not a platform admin");
    }

    const payload: ActionPayload = await req.json();
    let result: any = null;
    let auditDetails: any = {};

    switch (payload.action) {
      case "change_plan": {
        if (!payload.organization_id || !payload.new_plan) {
          throw new Error("Missing organization_id or new_plan");
        }

        // Get current plan for audit
        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("plan, name")
          .eq("id", payload.organization_id)
          .single();

        const { error: updateError } = await supabaseAdmin
          .from("organizations")
          .update({ 
            plan: payload.new_plan,
            updated_at: new Date().toISOString()
          })
          .eq("id", payload.organization_id);

        if (updateError) throw updateError;

        auditDetails = {
          previous_plan: org?.plan,
          new_plan: payload.new_plan,
          organization_name: org?.name
        };
        result = { success: true, message: `Plan changed to ${payload.new_plan}` };
        break;
      }

      case "toggle_organization": {
        if (!payload.organization_id || payload.is_active === undefined) {
          throw new Error("Missing organization_id or is_active");
        }

        const { data: org } = await supabaseAdmin
          .from("organizations")
          .select("is_active, name")
          .eq("id", payload.organization_id)
          .single();

        const { error: updateError } = await supabaseAdmin
          .from("organizations")
          .update({ 
            is_active: payload.is_active,
            updated_at: new Date().toISOString()
          })
          .eq("id", payload.organization_id);

        if (updateError) throw updateError;

        auditDetails = {
          previous_status: org?.is_active,
          new_status: payload.is_active,
          organization_name: org?.name
        };
        result = { success: true, message: `Organization ${payload.is_active ? 'activated' : 'deactivated'}` };
        break;
      }

      case "resolve_upgrade_request": {
        if (!payload.request_id || !payload.status) {
          throw new Error("Missing request_id or status");
        }

        // Get request details
        const { data: request, error: reqError } = await supabaseAdmin
          .from("upgrade_requests")
          .select("*, organization:organizations(name)")
          .eq("id", payload.request_id)
          .single();

        if (reqError || !request) {
          throw new Error("Upgrade request not found");
        }

        // Update request status
        const { error: updateReqError } = await supabaseAdmin
          .from("upgrade_requests")
          .update({
            status: payload.status,
            admin_notes: payload.admin_notes || null,
            processed_by: user.id,
            processed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq("id", payload.request_id);

        if (updateReqError) throw updateReqError;

        // If approved, update organization plan
        if (payload.status === "approved") {
          const { error: orgUpdateError } = await supabaseAdmin
            .from("organizations")
            .update({ 
              plan: request.requested_plan,
              updated_at: new Date().toISOString()
            })
            .eq("id", request.organization_id);

          if (orgUpdateError) throw orgUpdateError;
        }

        auditDetails = {
          request_id: payload.request_id,
          organization_id: request.organization_id,
          organization_name: request.organization?.name,
          current_plan: request.current_plan,
          requested_plan: request.requested_plan,
          resolution: payload.status,
          admin_notes: payload.admin_notes
        };
        result = { success: true, message: `Request ${payload.status}` };
        break;
      }

      default:
        throw new Error(`Unknown action: ${payload.action}`);
    }

    // Log audit entry
    await supabaseAdmin
      .from("platform_audit_log")
      .insert({
        admin_user_id: user.id,
        action: payload.action,
        target_organization_id: payload.organization_id || auditDetails.organization_id,
        details: auditDetails
      });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Platform admin action error:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: errorMessage.includes("Forbidden") ? 403 : 
                errorMessage.includes("Unauthorized") ? 401 : 400,
      }
    );
  }
});
