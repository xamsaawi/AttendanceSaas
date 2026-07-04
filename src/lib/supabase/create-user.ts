import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";

const PASSWORD_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTempPassword(length = 12) {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => PASSWORD_CHARS[n % PASSWORD_CHARS.length]).join("");
}

export function createConfirmedUser(
  admin: SupabaseClient<Database>,
  { email, fullName, password }: { email: string; fullName: string; password: string },
) {
  return admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
}
