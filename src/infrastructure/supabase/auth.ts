import type { User } from "@supabase/supabase-js";

import { getSupabaseServerClient } from "./serverClient";

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  return user;
}
