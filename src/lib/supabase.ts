import { createClient } from "@supabase/supabase-js";
import { getEnv, getSupabaseSecretKey } from "./env";

let client:
  | ReturnType<typeof createClient>
  | undefined;

export function supabaseAdmin() {
  if (client) return client;

  const env = getEnv();

  client = createClient(
    env.SUPABASE_URL,
    getSupabaseSecretKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );

  return client;
}
