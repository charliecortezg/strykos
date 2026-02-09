import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Step 1: Reset payment status (existing logic)
    const { data: resetData, error: resetError } = await supabase.rpc('reset_monthly_payment_status')

    if (resetError) {
      console.error('Error resetting payment status:', resetError)
      return new Response(
        JSON.stringify({ error: resetError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Monthly payment reset completed. Affected rows: ${resetData}`)

    // Step 2: Check billing overdue and auto-deactivate
    const { data: overdueData, error: overdueError } = await supabase.rpc('check_billing_overdue')

    if (overdueError) {
      console.error('Error checking billing overdue:', overdueError)
      // Don't fail the whole function - log and continue
    } else {
      console.log(`Billing overdue check completed. Auto-deactivated: ${overdueData}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Monthly reset and billing check completed',
        payment_reset_rows: resetData,
        auto_deactivated: overdueData ?? 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('Unexpected error:', err)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
