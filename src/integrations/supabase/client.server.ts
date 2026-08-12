// Server-side Supabase client with service role key - bypasses RLS.
// Use this for admin operations in server functions and server routes only.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";
import type { Database } from "./types";

type AdminClient = SupabaseClient<Database>;

function createSupabaseAdminClient(): AdminClient {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ["SUPABASE_SERVICE_ROLE_KEY"] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(
      ", ",
    )}. Set them as server environment variables (e.g. in Vercel Project Settings → Environment Variables).`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
    // Node 20 has no global WebSocket; required by @supabase/realtime-js
    realtime: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transport: ws as any,
    },
  });
}

let _supabaseAdmin: AdminClient | undefined;

export const supabaseAdmin = new Proxy({} as AdminClient, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
