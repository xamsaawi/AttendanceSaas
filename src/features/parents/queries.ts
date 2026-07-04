import { createClient } from "@/lib/supabase/server";

export type GuardianRow = {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
};

export type GuardianLink = {
  id: string;
  studentId: string;
  studentLabel: string;
  relationship: string;
  isPrimary: boolean;
};

export async function listGuardians(
  organizationId: string,
): Promise<(GuardianRow & { links: GuardianLink[] })[]> {
  const supabase = await createClient();

  const { data: guardians, error } = await supabase
    .from("guardians")
    .select("*")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });

  if (error) throw error;
  if (!guardians.length) return [];

  const { data: links } = await supabase
    .from("student_guardians")
    .select("id, guardian_id, student_id, relationship, is_primary")
    .eq("organization_id", organizationId);

  const studentIds = Array.from(new Set((links ?? []).map((l) => l.student_id)));
  const { data: students } = studentIds.length
    ? await supabase
        .from("students")
        .select("id, full_name, admission_number")
        .in("id", studentIds)
    : { data: [] };

  const studentById = new Map((students ?? []).map((s) => [s.id, s]));

  const linksByGuardianId = new Map<string, GuardianLink[]>();
  for (const link of links ?? []) {
    const student = studentById.get(link.student_id);
    const entry: GuardianLink = {
      id: link.id,
      studentId: link.student_id,
      studentLabel: student ? `${student.full_name} (${student.admission_number})` : "—",
      relationship: link.relationship,
      isPrimary: link.is_primary,
    };
    const list = linksByGuardianId.get(link.guardian_id) ?? [];
    list.push(entry);
    linksByGuardianId.set(link.guardian_id, list);
  }

  return guardians.map((guardian) => ({
    ...guardian,
    links: linksByGuardianId.get(guardian.id) ?? [],
  }));
}
