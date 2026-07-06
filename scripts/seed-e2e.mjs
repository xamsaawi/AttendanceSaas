// Seeds two isolated schools (orgs) into the linked Supabase project so the
// Playwright suite in e2e/ has real data to drive: org A has a homeroom
// class with students for the login/attendance/reports specs, org B exists
// only so rls-boundary.spec.ts can prove org A's session can't touch it.
//
// Idempotent: re-running updates the existing seed instead of duplicating it.
// Writes the IDs/credentials the specs need to e2e/.seed-output.json.
//
// Usage: pnpm seed:e2e

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in the env file.");
  process.exit(1);
}

const admin = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const OWNER_PASSWORD = "e2e-test-password-only!1";

async function findUserByEmail(email) {
  // supabase-js has no getUserByEmail; page through listUsers instead. Fine
  // for a handful of seeded test accounts.
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email === email);
    if (found) return found;
    if (data.users.length < 200) break;
  }
  return null;
}

async function ensureOwner(email, fullName) {
  const existing = await findUserByEmail(email);
  if (existing) {
    const { error } = await admin.auth.admin.updateUserById(existing.id, {
      password: OWNER_PASSWORD,
    });
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: OWNER_PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error || !data.user) throw error ?? new Error("Failed to create user");
  return data.user.id;
}

async function ensureOrg(slug, name, ownerId) {
  const { data: existing } = await admin
    .from("organizations")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  let organizationId = existing?.id;
  if (!organizationId) {
    const { data: org, error } = await admin
      .from("organizations")
      .insert({ name, slug })
      .select("id")
      .single();
    if (error) throw error;
    organizationId = org.id;
  }

  const { data: membership } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", organizationId)
    .eq("user_id", ownerId)
    .maybeSingle();

  if (!membership) {
    const { error } = await admin
      .from("organization_members")
      .insert({ organization_id: organizationId, user_id: ownerId, role: "owner" });
    if (error) throw error;
  }

  return organizationId;
}

async function ensureAcademicYear(organizationId) {
  const { data: existing } = await admin
    .from("academic_years")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("is_current", true)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("academic_years")
    .insert({
      organization_id: organizationId,
      name: "E2E Year",
      start_date: "2026-01-01",
      end_date: "2026-12-31",
      is_current: true,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureLookup(table, organizationId, name, extra = {}) {
  const { data: existing } = await admin
    .from(table)
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", name)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from(table)
    .insert({ organization_id: organizationId, name, ...extra })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureClass(organizationId, academicYearId, gradeId, sectionId, homeroomTeacherId) {
  const { data: existing } = await admin
    .from("classes")
    .select("id")
    .eq("academic_year_id", academicYearId)
    .eq("grade_id", gradeId)
    .eq("section_id", sectionId)
    .maybeSingle();

  if (existing) {
    if (homeroomTeacherId) {
      await admin.from("classes").update({ homeroom_teacher_id: homeroomTeacherId }).eq("id", existing.id);
    }
    return existing.id;
  }

  const { data, error } = await admin
    .from("classes")
    .insert({
      organization_id: organizationId,
      academic_year_id: academicYearId,
      grade_id: gradeId,
      section_id: sectionId,
      homeroom_teacher_id: homeroomTeacherId ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function ensureStudent(organizationId, classId, admissionNumber, firstName, lastName) {
  const { data: existing } = await admin
    .from("students")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("admission_number", admissionNumber)
    .maybeSingle();
  if (existing) return existing.id;

  const { data, error } = await admin
    .from("students")
    .insert({
      organization_id: organizationId,
      admission_number: admissionNumber,
      first_name: firstName,
      last_name: lastName,
      class_id: classId,
      enrollment_date: "2026-01-01",
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

async function main() {
  const ownerAId = await ensureOwner("e2e-owner-a@attendance-saas.test", "E2E Owner A");
  const orgAId = await ensureOrg("e2e-school-a", "E2E School A", ownerAId);
  const yearAId = await ensureAcademicYear(orgAId);
  const gradeAId = await ensureLookup("grades", orgAId, "E2E Grade 1", { sort_order: 1 });
  const sectionAId = await ensureLookup("sections", orgAId, "E2E Section A");
  const classAId = await ensureClass(orgAId, yearAId, gradeAId, sectionAId, ownerAId);
  const student1Id = await ensureStudent(orgAId, classAId, "E2E-001", "Alex", "Smith");
  const student2Id = await ensureStudent(orgAId, classAId, "E2E-002", "Jamie", "Lee");

  const ownerBId = await ensureOwner("e2e-owner-b@attendance-saas.test", "E2E Owner B");
  const orgBId = await ensureOrg("e2e-school-b", "E2E School B", ownerBId);
  const yearBId = await ensureAcademicYear(orgBId);
  const gradeBId = await ensureLookup("grades", orgBId, "E2E Grade 1", { sort_order: 1 });
  const sectionBId = await ensureLookup("sections", orgBId, "E2E Section A");
  const classBId = await ensureClass(orgBId, yearBId, gradeBId, sectionBId, ownerBId);

  const output = {
    orgA: {
      ownerEmail: "e2e-owner-a@attendance-saas.test",
      ownerPassword: OWNER_PASSWORD,
      organizationId: orgAId,
      classId: classAId,
      studentIds: [student1Id, student2Id],
    },
    orgB: {
      ownerEmail: "e2e-owner-b@attendance-saas.test",
      ownerPassword: OWNER_PASSWORD,
      organizationId: orgBId,
      classId: classBId,
    },
  };

  const outputPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "e2e", ".seed-output.json");
  writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`Seeded e2e test data. Wrote ${outputPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
