import { NextResponse } from "next/server";

import {
  attendanceExportColumns,
  listAttendanceRecordsForExport,
  type AttendanceExportRow,
} from "@/features/attendance/export";
import { listAuditLogs } from "@/features/audit/queries";
import { listClassOptions } from "@/features/classes/queries";
import { getCurrentMembership } from "@/features/organizations/queries";
import { guardianImportColumns, type GuardianImportRow } from "@/features/parents/import";
import { listGuardians } from "@/features/parents/queries";
import {
  attendanceSummaryExportColumns,
  auditLogExportColumns,
  toAttendanceSummaryExportRows,
  toAuditLogExportRows,
} from "@/features/reports/export";
import { getClassAttendanceSummaryForRange } from "@/features/reports/queries";
import { listAllStudentsForExport } from "@/features/students/queries";
import { studentImportColumns, type StudentImportRow } from "@/features/students/import";
import { teacherImportColumns, type TeacherImportRow } from "@/features/teachers/import";
import { listTeachers } from "@/features/teachers/queries";
import { listMembers } from "@/features/team/queries";
import { buildCsv } from "@/lib/import-export/build-csv";
import { buildPdf } from "@/lib/import-export/build-pdf";
import { buildWorkbook } from "@/lib/import-export/build-workbook";
import type { ColumnDef } from "@/lib/import-export/types";
import type { AttendanceSessionType } from "@/types/database";

const ENTITIES = ["students", "teachers", "guardians", "attendance", "attendance-summary", "audit-log"] as const;
type Entity = (typeof ENTITIES)[number];

const FORMATS = ["xlsx", "csv", "pdf"] as const;
type Format = (typeof FORMATS)[number];

const CONTENT_TYPES: Record<Format, string> = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  pdf: "application/pdf",
};

const DEFAULT_EXPORT_RANGE_DAYS = 90;

async function buildFile<T extends Record<string, unknown>>(
  format: Format,
  rows: T[],
  columns: ColumnDef<T>[],
  title: string,
): Promise<Buffer> {
  if (format === "csv") return buildCsv(rows, columns);
  if (format === "pdf") return buildPdf(rows, columns, title);
  return buildWorkbook(rows, columns);
}

export async function GET(req: Request, { params }: { params: Promise<{ entity: string }> }) {
  const { entity } = await params;
  if (!ENTITIES.includes(entity as Entity)) {
    return NextResponse.json({ error: "Unknown entity" }, { status: 404 });
  }

  const membership = await getCurrentMembership();
  if (!membership) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = membership.role === "owner" || membership.role === "admin";
  if (entity === "audit-log" && !isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const formatParam = url.searchParams.get("format") ?? "xlsx";
  const format = (FORMATS.includes(formatParam as Format) ? formatParam : "xlsx") as Format;

  const today = new Date().toISOString().slice(0, 10);
  const defaultFrom = new Date(Date.now() - DEFAULT_EXPORT_RANGE_DAYS * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
  const dateFrom = url.searchParams.get("dateFrom") ?? defaultFrom;
  const dateTo = url.searchParams.get("dateTo") ?? today;

  let buffer: Buffer;

  if (entity === "attendance") {
    const rows: AttendanceExportRow[] = await listAttendanceRecordsForExport(
      membership.organizationId,
      {
        dateFrom,
        dateTo,
        classId: url.searchParams.get("classId") ?? undefined,
        sessionType: (url.searchParams.get("sessionType") as AttendanceSessionType) ?? undefined,
      },
    );
    buffer = await buildFile(format, rows, attendanceExportColumns, "Attendance Records");
  } else if (entity === "attendance-summary") {
    const summaryRows = await getClassAttendanceSummaryForRange(
      membership.organizationId,
      dateFrom,
      dateTo,
    );
    buffer = await buildFile(
      format,
      toAttendanceSummaryExportRows(summaryRows),
      attendanceSummaryExportColumns,
      `Attendance Summary (${dateFrom} to ${dateTo})`,
    );
  } else if (entity === "audit-log") {
    const [logRows, members] = await Promise.all([
      listAuditLogs(membership.organizationId, { limit: 500 }),
      listMembers(membership.organizationId),
    ]);
    const actorNameById = new Map(
      members.map((m) => [m.userId, m.fullName ?? m.email ?? "Unnamed"]),
    );
    buffer = await buildFile(
      format,
      toAuditLogExportRows(logRows, actorNameById),
      auditLogExportColumns,
      "Audit Log",
    );
  } else if (entity === "students") {
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
    buffer = await buildFile(format, rows, studentImportColumns, "Students");
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
    buffer = await buildFile(format, rows, teacherImportColumns, "Teachers");
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
    buffer = await buildFile(format, rows, guardianImportColumns, "Guardians");
  }

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": CONTENT_TYPES[format],
      "Content-Disposition": `attachment; filename="${entity}.${format}"`,
    },
  });
}
