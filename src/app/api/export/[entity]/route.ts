import { NextResponse } from "next/server";

import { listClassOptions } from "@/features/classes/queries";
import { getCurrentMembership } from "@/features/organizations/queries";
import { guardianImportColumns, type GuardianImportRow } from "@/features/parents/import";
import { listGuardians } from "@/features/parents/queries";
import { listAllStudentsForExport } from "@/features/students/queries";
import { studentImportColumns, type StudentImportRow } from "@/features/students/import";
import { teacherImportColumns, type TeacherImportRow } from "@/features/teachers/import";
import { listTeachers } from "@/features/teachers/queries";
import { buildWorkbook } from "@/lib/import-export/build-workbook";

const ENTITIES = ["students", "teachers", "guardians"] as const;
type Entity = (typeof ENTITIES)[number];

export async function GET(_req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  if (!ENTITIES.includes(entity as Entity)) {
    return NextResponse.json({ error: "Unknown entity" }, { status: 404 });
  }

  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let buffer: Buffer;

  if (entity === "students") {
    const [students, classOptions] = await Promise.all([
      listAllStudentsForExport(membership.organizationId),
      listClassOptions(membership.organizationId),
    ]);
    const classLabelById = new Map(classOptions.map((c) => [c.id, c.label]));
    const rows: StudentImportRow[] = students.map((s) => ({
      admissionNumber: s.admission_number,
      firstName: s.first_name,
      lastName: s.last_name,
      dateOfBirth: s.date_of_birth ?? "",
      gender: s.gender ?? "",
      className: s.class_id ? (classLabelById.get(s.class_id) ?? "") : "",
      status: s.status,
      enrollmentDate: s.enrollment_date,
      address: s.address ?? "",
      notes: s.notes ?? "",
    }));
    buffer = await buildWorkbook(rows, studentImportColumns);
  } else if (entity === "teachers") {
    const teachers = await listTeachers(membership.organizationId);
    const rows: TeacherImportRow[] = teachers.map((t) => ({
      fullName: t.fullName ?? "",
      email: t.email ?? "",
      staffId: t.staffId ?? "",
      phone: t.phone ?? "",
      subjects: t.subjects.join(", "),
      qualification: t.qualification ?? "",
      hireDate: t.hireDate ?? "",
    }));
    buffer = await buildWorkbook(rows, teacherImportColumns);
  } else {
    const guardians = await listGuardians(membership.organizationId);
    const rows: GuardianImportRow[] = guardians.map((g) => ({
      fullName: g.full_name,
      phone: g.phone ?? "",
      email: g.email ?? "",
      address: g.address ?? "",
      notes: g.notes ?? "",
      studentAdmissionNumber: g.links.length === 1 ? g.links[0].studentLabel : "",
      relationship: g.links.length === 1 ? g.links[0].relationship : "",
    }));
    buffer = await buildWorkbook(rows, guardianImportColumns);
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${entity}.xlsx"`,
    },
  });
}
