import { createClient } from "@/lib/supabase/server";
import type { OrgRole } from "@/types/database";

export type TeamMember = {
  userId: string;
  role: OrgRole;
  fullName: string | null;
  email: string | null;
};

export async function listMembers(organizationId: string): Promise<TeamMember[]> {
  const supabase = await createClient();

  const { data: members, error } = await supabase
    .from("organization_members")
    .select("user_id, role")
    .eq("organization_id", organizationId)
    .order("role");

  if (error) throw error;
  if (!members.length) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in(
      "id",
      members.map((m) => m.user_id),
    );

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  return members.map((member) => ({
    userId: member.user_id,
    role: member.role,
    fullName: profileById.get(member.user_id)?.full_name ?? null,
    email: profileById.get(member.user_id)?.email ?? null,
  }));
}
