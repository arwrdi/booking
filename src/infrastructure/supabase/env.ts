export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  if (!url) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing");
  }

  if (!anonKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing");
  }

  return { url, anonKey };
}

export function getSupabaseAdminEnv() {
  const { url } = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
  }

  return { url, serviceRoleKey };
}

