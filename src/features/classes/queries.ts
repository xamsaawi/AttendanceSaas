import { createClient } from "@/lib/supabase/server";

export async function listGrades(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("grades")
    .select("*")
    .eq("organization_id", organizationId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data;
}

export async function listSections(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sections")
    .select("*")
    .eq("organization_id", organizationId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data;
}

export type ClassRow = {
  id: string;
  academic_year_id: string;
  grade_id: string;
  section_id: string;
  homeroom_teacher_id: string | null;
  capacity: number | null;
};

export async function listClasses(organizationId: string): Promise<ClassRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .select("id, academic_year_id, grade_id, section_id, homeroom_teacher_id, capacity")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export type ClassOption = { id: string; label: string };

export async function listClassOptions(organizationId: string): Promise<ClassOption[]> {
  const [classes, grades, sections, academicYears] = await Promise.all([
    listClasses(organizationId),
    listGrades(organizationId),
    listSections(organizationId),
    (await createClient())
      .from("academic_years")
      .select("id, name")
      .eq("organization_id", organizationId)
      .then(({ data, error }) => {
        if (error) throw error;
        return data;
      }),
  ]);

  const gradeNameById = new Map(grades.map((g) => [g.id, g.name]));
  const sectionNameById = new Map(sections.map((s) => [s.id, s.name]));
  const yearNameById = new Map(academicYears.map((y) => [y.id, y.name]));

  return classes.map((c) => ({
    id: c.id,
    label: `${gradeNameById.get(c.grade_id) ?? "?"} - ${sectionNameById.get(c.section_id) ?? "?"} (${yearNameById.get(c.academic_year_id) ?? "?"})`,
  }));
}
