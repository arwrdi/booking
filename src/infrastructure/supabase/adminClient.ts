import { createClient } from "@supabase/supabase-js";

import { getSupabaseAdminEnv } from "./env";

export function getSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseAdminEnv();

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
