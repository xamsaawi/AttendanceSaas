import type { OrgRole } from "@/types/database";
import { createClient } from "@/lib/supabase/server";

export type CurrentMembership = {
  organizationId: string;
  role: OrgRole;
  organizationName: string;
};

export async function getCurrentMembership(): Promise<CurrentMembership | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!membership) return null;

  const { data: organization } = await supabase
    .from("organizations")
    .select("name")
    .eq("id", membership.organization_id)
    .single();

  return {
    organizationId: membership.organization_id,
    role: membership.role,
    organizationName: organization?.name ?? "",
  };
}

export async function requireAdminMembership(): Promise<CurrentMembership | null> {
  const membership = await getCurrentMembership();
  if (!membership || (membership.role !== "owner" && membership.role !== "admin")) {
    return null;
  }
  return membership;
}

export async function getSchoolSettings(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("school_settings")
    .select("*")
    .eq("organization_id", organizationId)
    .single();

  if (error) throw error;
  return data;
}
