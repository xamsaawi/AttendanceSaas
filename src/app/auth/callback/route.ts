import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      await acceptPendingTeacherInvite(supabase);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}

// First-time Google sign-in for a teacher: their auth user + profile were
// just created by the handle_new_user trigger, but they have no school
// membership yet. If an admin pre-registered this Gmail address, this turns
// that pending invite into real organization_members/teacher_profiles rows.
async function acceptPendingTeacherInvite(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return;

  const admin = createAdminClient();

  const { data: existingMembership } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existingMembership) return;

  const { data: invite } = await admin
    .from("teacher_invites")
    .select("*")
    .ilike("email", user.email)
    .is("accepted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!invite) return;

  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: invite.organization_id,
    user_id: user.id,
    role: "teacher",
  });
  if (memberError) {
    logger.warn("Failed to accept teacher invite", { message: memberError.message });
    return;
  }

  const { error: profileError } = await admin.from("teacher_profiles").insert({
    organization_id: invite.organization_id,
    user_id: user.id,
    staff_id: invite.staff_id,
    phone: invite.phone,
    subjects: invite.subjects,
    qualification: invite.qualification,
    hire_date: invite.hire_date,
  });
  if (profileError) {
    logger.warn("Failed to create teacher profile from invite", { message: profileError.message });
  }

  await admin
    .from("teacher_invites")
    .update({ accepted_at: new Date().toISOString(), accepted_user_id: user.id })
    .eq("id", invite.id);
}
