// One-off script to bootstrap a school's first organization + owner account.
// Public self-registration was removed; owner accounts are created by hand.
//
// Usage:
//   node --env-file=.env.local scripts/create-owner.mjs \
//     --school "Riverside High" --name "Jane Doe" --email jane@riverside.edu --password "..."
//
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the env file.

import { createClient } from "@supabase/supabase-js";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const { school, name, email, password } = parseArgs(process.argv.slice(2));

  if (!school || !name || !email || !password) {
    console.error(
      'Usage: node --env-file=.env.local scripts/create-owner.mjs --school "Name" --name "Owner Name" --email owner@example.com --password "..."',
    );
    process.exit(1);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the env file.");
    process.exit(1);
  }

  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (userError || !userData.user) {
    console.error("Failed to create user:", userError?.message);
    process.exit(1);
  }

  const slug = `${slugify(school) || "school"}-${userData.user.id.slice(0, 8)}`;

  const { data: organization, error: orgError } = await admin
    .from("organizations")
    .insert({ name: school, slug })
    .select("id")
    .single();

  if (orgError) {
    console.error("Failed to create organization:", orgError.message);
    process.exit(1);
  }

  const { error: memberError } = await admin
    .from("organization_members")
    .insert({ organization_id: organization.id, user_id: userData.user.id, role: "owner" });

  if (memberError) {
    console.error("Failed to add owner to organization:", memberError.message);
    process.exit(1);
  }

  console.log(`Created "${school}" with owner ${email}. They can sign in at /login now.`);
}

main();
