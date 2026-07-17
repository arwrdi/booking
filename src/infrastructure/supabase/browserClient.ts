import { createClient } from "@supabase/supabase-js";

import { getSupabaseEnv } from "./env";

let client: ReturnType<typeof createClient> | null = null;

export function getSupabaseBrowserClient() {
  if (client) return client;

  const { url, anonKey } = getSupabaseEnv();
  client = createClient(url, anonKey);
  return client;
}

