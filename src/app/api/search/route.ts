import { NextResponse } from "next/server";

import { getCurrentMembership } from "@/features/organizations/queries";
import { createClient } from "@/lib/supabase/server";

export type SearchResultItem = { id: string; label: string; sublabel?: string };
export type SearchResults = {
  students: SearchResultItem[];
  teachers: SearchResultItem[];
  guardians: SearchResultItem[];
};

function sanitize(query: string): string {
  return query.replace(/[,()%*]/g, "").trim();
}

export async function GET(req: Request) {
  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = sanitize(new URL(req.url).searchParams.get("q") ?? "");
  if (query.length < 2) {
    return NextResponse.json({ students: [], teachers: [], guardians: [] } satisfies SearchResults);
  }

  const supabase = await createClient();
  const organizationId = membership.organizationId;

  const [studentsRes, guardiansRes, teacherMembersRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, admission_number")
      .eq("organization_id", organizationId)
      .or(`full_name.ilike.%${query}%,admission_number.ilike.%${query}%`)
      .limit(5),
    supabase
      .from("guardians")
      .select("id, full_name, phone")
      .eq("organization_id", organizationId)
      .ilike("full_name", `%${query}%`)
      .limit(5),
    supabase
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "teacher"),
  ]);

  const teacherUserIds = (teacherMembersRes.data ?? []).map((m) => m.user_id);
  const { data: teacherProfiles } = teacherUserIds.length
    ? await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", teacherUserIds)
        .ilike("full_name", `%${query}%`)
        .limit(5)
    : { data: [] };

  const results: SearchResults = {
    students: (studentsRes.data ?? []).map((s) => ({
      id: s.id,
      label: s.full_name,
      sublabel: s.admission_number,
    })),
    teachers: (teacherProfiles ?? []).map((t) => ({
      id: t.id,
      label: t.full_name ?? "Unnamed",
      sublabel: t.email ?? undefined,
    })),
    guardians: (guardiansRes.data ?? []).map((g) => ({
      id: g.id,
      label: g.full_name,
      sublabel: g.phone ?? undefined,
    })),
  };

  return NextResponse.json(results);
}
