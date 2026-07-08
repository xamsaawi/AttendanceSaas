import { signPhotoUrls } from "@/features/students/queries";
import { createClient } from "@/lib/supabase/server";

export type PendingTeacherInvite = {
  id: string;
  email: string;
  fullName: string;
  createdAt: string;
};

export async function listPendingTeacherInvites(
  organizationId: string,
): Promise<PendingTeacherInvite[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teacher_invites")
    .select("id, email, full_name, created_at")
    .eq("organization_id", organizationId)
    .is("accepted_at", null)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((invite) => ({
    id: invite.id,
    email: invite.email,
    fullName: invite.full_name,
    createdAt: invite.created_at,
  }));
}

export type TeacherRow = {
  userId: string;
  fullName: string | null;
  email: string | null;
  staffId: string | null;
  phone: string | null;
  subjects: string[];
  qualification: string | null;
  hireDate: string | null;
  photoSignedUrl: string | null;
};

export async function listTeachers(organizationId: string): Promise<TeacherRow[]> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("role", "teacher");

  if (error) throw error;
  if (!members.length) return [];

  const userIds = members.map((m) => m.user_id);

  const [{ data: profiles }, { data: teacherProfiles }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, email, avatar_url").in("id", userIds),
    supabase
      .from("teacher_profiles")
      .select("*")
      .eq("organization_id", organizationId)
      .in("user_id", userIds),
  ]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const teacherProfileByUserId = new Map((teacherProfiles ?? []).map((t) => [t.user_id, t]));

  const photoUrlByPath = await signPhotoUrls((profiles ?? []).map((p) => p.avatar_url));

  return userIds.map((userId) => {
    const profile = profileById.get(userId);
    const teacherProfile = teacherProfileByUserId.get(userId);
    return {
      userId,
      fullName: profile?.full_name ?? null,
      email: profile?.email ?? null,
      staffId: teacherProfile?.staff_id ?? null,
      phone: teacherProfile?.phone ?? null,
      subjects: teacherProfile?.subjects ?? [],
      qualification: teacherProfile?.qualification ?? null,
      hireDate: teacherProfile?.hire_date ?? null,
      photoSignedUrl: profile?.avatar_url ? (photoUrlByPath.get(profile.avatar_url) ?? null) : null,
    };
  });
}
