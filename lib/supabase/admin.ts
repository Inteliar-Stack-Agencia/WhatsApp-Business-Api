import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente con service role: SOLO usar del lado del servidor (webhooks, API routes).
// Saltea RLS — nunca importar desde componentes de cliente.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}
