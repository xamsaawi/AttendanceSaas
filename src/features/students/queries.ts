import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { StudentStatus } from "@/types/database";

export const STUDENTS_PAGE_SIZE = 25;

export type StudentRow = {
  id: string;
  admission_number: string;
  first_name: string;
  last_name: string;
  full_name: string;
  class_id: string | null;
  status: StudentStatus;
  photo_url: string | null;
};

export type ListStudentsFilters = {
  search?: string;
  status?: StudentStatus;
  page?: number;
};

export async function listStudents(
  organizationId: string,
  filters: ListStudentsFilters = {},
): Promise<{ rows: StudentRow[]; total: number }> {
  const supabase = await createClient();
  const page = filters.page && filters.page > 0 ? filters.page : 1;
  const from = (page - 1) * STUDENTS_PAGE_SIZE;
  const to = from + STUDENTS_PAGE_SIZE - 1;

  let query = supabase
    .from("students")
    .select("id, admission_number, first_name, last_name, full_name, class_id, status, photo_url", {
      count: "exact",
    })
    .eq("organization_id", organizationId);

  const search = filters.search?.replace(/[,()%*]/g, "").trim();
  if (search) {
    query = query.or(`full_name.ilike.%${search}%,admission_number.ilike.%${search}%`);
  }
  if (filters.status) {
    query = query.eq("status", filters.status);
  }

  const { data, error, count } = await query
    .order("first_name", { ascending: true })
    .range(from, to);

  if (error) throw error;
  return { rows: data, total: count ?? 0 };
}

export type StudentOption = { id: string; label: string };

export async function listStudentOptions(organizationId: string): Promise<StudentOption[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, admission_number")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true })
    .limit(500);

  if (error) throw error;
  return data.map((s) => ({ id: s.id, label: `${s.full_name} (${s.admission_number})` }));
}

export async function listAllStudentsForExport(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("organization_id", organizationId)
    .order("first_name", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getStudent(id: string, organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .eq("organization_id", organizationId)
    .single();

  if (error) throw error;
  return data;
}

export async function signPhotoUrls(paths: (string | null)[]): Promise<Map<string, string>> {
  const uniquePaths = Array.from(new Set(paths.filter((p): p is string => Boolean(p))));
  if (uniquePaths.length === 0) return new Map();

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from("profile-photos")
    .createSignedUrls(uniquePaths, 3600);

  if (error) return new Map();

  const map = new Map<string, string>();
  for (const entry of data) {
    if (entry.signedUrl && entry.path) map.set(entry.path, entry.signedUrl);
  }
  return map;
}
