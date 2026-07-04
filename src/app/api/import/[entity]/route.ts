import { NextResponse } from "next/server";

import { requireAdminMembership } from "@/features/organizations/queries";
import {
  guardianImportRowSchema,
  guardianImportColumns,
} from "@/features/parents/import";
import {
  studentImportRowSchema,
  studentImportColumns,
} from "@/features/students/import";
import {
  TEACHER_IMPORT_BATCH_LIMIT,
  teacherImportRowSchema,
  teacherImportColumns,
} from "@/features/teachers/import";
import { logger } from "@/lib/logger";
import { parseWorkbook } from "@/lib/import-export/parse";
import { validateRows } from "@/lib/import-export/validate";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { createConfirmedUser, generateTempPassword } from "@/lib/supabase/create-user";

const ENTITIES = ["students", "teachers", "guardians"] as const;
type Entity = (typeof ENTITIES)[number];

const UNIQUE_VIOLATION = "23505";

type ImportError = { row: number; message: string };
type CreatedAccount = { email: string; tempPassword: string };
type ImportSummary = {
  total: number;
  succeeded: number;
  failed: number;
  errors: ImportError[];
  accounts?: CreatedAccount[];
};

export async function POST(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  if (!ENTITIES.includes(entity as Entity)) {
    return NextResponse.json({ error: "Unknown entity" }, { status: 404 });
  }

  const membership = await requireAdminMembership();
  if (!membership) {
    return NextResponse.json({ error: "You don't have permission to import data" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Please choose a file" }, { status: 400 });
  }

  const buffer = await file.arrayBuffer();
  const organizationId = membership.organizationId;

  if (entity === "students") {
    return NextResponse.json(await importStudents(buffer, organizationId));
  }
  if (entity === "teachers") {
    return NextResponse.json(await importTeachers(buffer, organizationId));
  }
  return NextResponse.json(await importGuardians(buffer, organizationId));
}

function stripYearSuffix(label: string): string {
  return label.replace(/\s*\([^)]*\)\s*$/, "").trim();
}

async function importStudents(buffer: ArrayBuffer, organizationId: string): Promise<ImportSummary> {
  const rawRows = await parseWorkbook(buffer, studentImportColumns);
  const results = validateRows(rawRows, studentImportRowSchema);

  const supabase = await createClient();

  const [{ data: grades }, { data: sections }, { data: classes }, { data: academicYears }] =
    await Promise.all([
      supabase.from("grades").select("id, name").eq("organization_id", organizationId),
      supabase.from("sections").select("id, name").eq("organization_id", organizationId),
      supabase
        .from("classes")
        .select("id, grade_id, section_id, academic_year_id")
        .eq("organization_id", organizationId),
      supabase
        .from("academic_years")
        .select("id, is_current")
        .eq("organization_id", organizationId),
    ]);

  const gradeIdByName = new Map((grades ?? []).map((g) => [g.name.toLowerCase(), g.id]));
  const sectionIdByName = new Map((sections ?? []).map((s) => [s.name.toLowerCase(), s.id]));
  const currentYearIds = new Set(
    (academicYears ?? []).filter((y) => y.is_current).map((y) => y.id),
  );
  const classesByGradeSection = new Map<string, { id: string; isCurrent: boolean }[]>();
  for (const c of classes ?? []) {
    const key = `${c.grade_id}:${c.section_id}`;
    const list = classesByGradeSection.get(key) ?? [];
    list.push({ id: c.id, isCurrent: currentYearIds.has(c.academic_year_id) });
    classesByGradeSection.set(key, list);
  }

  function resolveClassId(className?: string): string | null {
    if (!className) return null;
    const [gradePart, sectionPart] = stripYearSuffix(className).split(" - ").map((s) => s.trim());
    if (!gradePart || !sectionPart) return null;
    const gradeId = gradeIdByName.get(gradePart.toLowerCase());
    const sectionId = sectionIdByName.get(sectionPart.toLowerCase());
    if (!gradeId || !sectionId) return null;
    const candidates = classesByGradeSection.get(`${gradeId}:${sectionId}`) ?? [];
    return (candidates.find((c) => c.isCurrent) ?? candidates[0])?.id ?? null;
  }

  const errors: ImportError[] = [];
  let succeeded = 0;

  for (const result of results) {
    if (!result.success) {
      errors.push({ row: result.row, message: result.errors.join("; ") });
      continue;
    }

    const { error } = await supabase.from("students").insert({
      organization_id: organizationId,
      admission_number: result.data.admissionNumber,
      first_name: result.data.firstName,
      last_name: result.data.lastName,
      date_of_birth: result.data.dateOfBirth || null,
      gender: result.data.gender ?? null,
      class_id: resolveClassId(result.data.className),
      status: result.data.status as "active" | "inactive" | "graduated" | "withdrawn",
      enrollment_date: result.data.enrollmentDate,
      address: result.data.address || null,
      notes: result.data.notes || null,
    });

    if (error) {
      logger.warn("Student import row failed", { row: result.row, message: error.message });
      const message =
        error.code === UNIQUE_VIOLATION
          ? "A student with this admission number already exists"
          : "Failed to create student";
      errors.push({ row: result.row, message });
      continue;
    }
    succeeded++;
  }

  return { total: results.length, succeeded, failed: errors.length, errors };
}

async function importTeachers(buffer: ArrayBuffer, organizationId: string): Promise<ImportSummary> {
  const rawRows = await parseWorkbook(buffer, teacherImportColumns);
  const results = validateRows(rawRows, teacherImportRowSchema).slice(0, TEACHER_IMPORT_BATCH_LIMIT);

  const admin = createAdminClient();
  const errors: ImportError[] = [];
  const accounts: CreatedAccount[] = [];
  let succeeded = 0;

  for (const result of results) {
    if (!result.success) {
      errors.push({ row: result.row, message: result.errors.join("; ") });
      continue;
    }

    const tempPassword = generateTempPassword();
    const { data, error } = await createConfirmedUser(admin, {
      email: result.data.email,
      fullName: result.data.fullName,
      password: tempPassword,
    });

    if (error || !data.user) {
      errors.push({ row: result.row, message: error?.message ?? "Failed to create account" });
      continue;
    }

    const { error: memberError } = await admin.from("organization_members").insert({
      organization_id: organizationId,
      user_id: data.user.id,
      role: "teacher",
    });
    if (memberError) {
      errors.push({ row: result.row, message: "Account created, but adding to school failed" });
      continue;
    }

    const subjects = (result.data.subjects ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const { error: profileError } = await admin.from("teacher_profiles").insert({
      organization_id: organizationId,
      user_id: data.user.id,
      staff_id: result.data.staffId || null,
      phone: result.data.phone || null,
      subjects,
      qualification: result.data.qualification || null,
      hire_date: result.data.hireDate || null,
    });
    if (profileError) {
      errors.push({ row: result.row, message: "Account created, but saving details failed" });
      continue;
    }

    accounts.push({ email: result.data.email, tempPassword });
    succeeded++;
  }

  return { total: results.length, succeeded, failed: errors.length, errors, accounts };
}

async function importGuardians(buffer: ArrayBuffer, organizationId: string): Promise<ImportSummary> {
  const rawRows = await parseWorkbook(buffer, guardianImportColumns);
  const results = validateRows(rawRows, guardianImportRowSchema);

  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, admission_number")
    .eq("organization_id", organizationId);
  const studentIdByAdmissionNumber = new Map(
    (students ?? []).map((s) => [s.admission_number.toLowerCase(), s.id]),
  );

  const errors: ImportError[] = [];
  let succeeded = 0;

  for (const result of results) {
    if (!result.success) {
      errors.push({ row: result.row, message: result.errors.join("; ") });
      continue;
    }

    const { data: guardian, error } = await supabase
      .from("guardians")
      .insert({
        organization_id: organizationId,
        full_name: result.data.fullName,
        phone: result.data.phone || null,
        email: result.data.email || null,
        address: result.data.address || null,
        notes: result.data.notes || null,
      })
      .select("id")
      .single();

    if (error || !guardian) {
      logger.warn("Guardian import row failed", { row: result.row, message: error?.message });
      errors.push({ row: result.row, message: "Failed to create guardian" });
      continue;
    }

    if (result.data.studentAdmissionNumber) {
      const studentId = studentIdByAdmissionNumber.get(
        result.data.studentAdmissionNumber.toLowerCase(),
      );
      if (studentId) {
        await supabase.from("student_guardians").insert({
          organization_id: organizationId,
          student_id: studentId,
          guardian_id: guardian.id,
          relationship: result.data.relationship ?? "guardian",
          is_primary: false,
        });
      }
    }

    succeeded++;
  }

  return { total: results.length, succeeded, failed: errors.length, errors };
}
