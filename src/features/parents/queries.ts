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

export type PrimaryGuardianContact = { name: string; phone: string | null };

// Keyed by student_id so callers can look up "who do I message for this kid"
// in O(1) — used by the parent attendance report send, one message per
// student's primary guardian only (a student can have several guardians).
export async function getPrimaryGuardiansForStudents(
  organizationId: string,
  studentIds: string[],
): Promise<Map<string, PrimaryGuardianContact>> {
  if (studentIds.length === 0) return new Map();

  const supabase = await createClient();
  const { data: links, error } = await supabase
    .from("student_guardians")
    .select("student_id, guardian_id")
    .eq("organization_id", organizationId)
    .eq("is_primary", true)
    .in("student_id", studentIds);

  if (error) throw error;
  if (!links?.length) return new Map();

  const guardianIds = Array.from(new Set(links.map((l) => l.guardian_id)));
  const { data: guardians, error: guardiansError } = await supabase
    .from("guardians")
    .select("id, full_name, phone")
    .eq("organization_id", organizationId)
    .in("id", guardianIds);

  if (guardiansError) throw guardiansError;

  const guardianById = new Map((guardians ?? []).map((g) => [g.id, g]));

  const result = new Map<string, PrimaryGuardianContact>();
  for (const link of links) {
    const guardian = guardianById.get(link.guardian_id);
    if (!guardian) continue;
    result.set(link.student_id, { name: guardian.full_name, phone: guardian.phone });
  }
  return result;
}
