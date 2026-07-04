import { createClient } from "@/lib/supabase/server";

export async function listAcademicYears(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("academic_years")
    .select("*")
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: false });

  if (error) throw error;
  return data;
}

export async function listTerms(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("terms")
    .select("*")
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: true });

  if (error) throw error;
  return data;
}

export async function listHolidays(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("organization_id", organizationId)
    .order("start_date", { ascending: true });

  if (error) throw error;
  return data;
}
