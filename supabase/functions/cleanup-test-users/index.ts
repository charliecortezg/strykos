// One-shot cleanup: deletes hardcoded @stryk-test.com users from auth.users.
// Guards: each email is validated to end with @stryk-test.com before deletion.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TARGETS: Array<{ id: string; email: string }> = [
  { id: 'b26e1709-6143-4490-97f1-35ffd1388e77', email: 'wl-test-owner@stryk-test.com' },
  { id: 'caf7c42b-14e3-4df9-9ff4-7dac877a4211', email: 'demo-test-owner@stryk-test.com' },
  { id: '816220e1-391c-4262-beee-b15bf7522a0a', email: 'test2b-owner@stryk-test.com' },
  { id: '75be2426-55af-4537-8a7c-0fbd70febe6d', email: 'demo-owner@stryk-test.com' },
  { id: '3a2ae5b6-2e11-4928-8b8f-b9ce3dc9883c', email: 'test2-owner@stryk-test.com' },
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const results: Array<Record<string, unknown>> = [];

  for (const t of TARGETS) {
    if (!t.email.endsWith('@stryk-test.com')) {
      results.push({ id: t.id, email: t.email, status: 'SKIPPED_GUARD' });
      continue;
    }
    // Verify in auth.users this id still has @stryk-test.com email
    const { data: gu, error: guErr } = await admin.auth.admin.getUserById(t.id);
    if (guErr || !gu?.user) {
      results.push({ id: t.id, email: t.email, status: 'NOT_FOUND_OR_ALREADY_DELETED', note: guErr?.message });
      continue;
    }
    if (!(gu.user.email ?? '').endsWith('@stryk-test.com')) {
      results.push({ id: t.id, email: t.email, status: 'ABORT_EMAIL_MISMATCH', actual: gu.user.email });
      continue;
    }
    const { error: delErr } = await admin.auth.admin.deleteUser(t.id);
    results.push({ id: t.id, email: t.email, status: delErr ? 'ERROR' : 'DELETED', error: delErr?.message });
  }

  return new Response(JSON.stringify({ results }, null, 2), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  });
});
