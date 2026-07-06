import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listClassOptions } from "@/features/classes/queries";
import { getCurrentMembership } from "@/features/organizations/queries";
import { ImportExportBar } from "@/features/import-export/components/import-export-bar";
import { StudentFormSheet } from "@/features/students/components/student-form-sheet";
import { StudentsFilters } from "@/features/students/components/students-filters";
import { StudentsTable, type StudentTableRow } from "@/features/students/components/students-table";
import {
  listStudents,
  signPhotoUrls,
  STUDENTS_PAGE_SIZE,
  type ListStudentsFilters,
} from "@/features/students/queries";
import type { StudentStatus } from "@/types/database";

export const metadata: Metadata = { title: "Students" };

const VALID_STATUSES: StudentStatus[] = ["active", "inactive", "graduated", "withdrawn"];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>;
}) {
  const params = await searchParams;
  const membership = await getCurrentMembership();

  if (!membership) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          You&apos;re not part of a school yet.
        </CardContent>
      </Card>
    );
  }

  const isAdmin = membership.role === "owner" || membership.role === "admin";
  const status = VALID_STATUSES.includes(params.status as StudentStatus)
    ? (params.status as StudentStatus)
    : undefined;
  const page = Number(params.page) > 0 ? Number(params.page) : 1;

  const filters: ListStudentsFilters = { search: params.search, status, page };

  const [{ rows, total }, classOptions] = await Promise.all([
    listStudents(membership.organizationId, filters),
    listClassOptions(membership.organizationId),
  ]);

  const classLabelById = new Map(classOptions.map((c) => [c.id, c.label]));
  const photoUrlByPath = await signPhotoUrls(rows.map((r) => r.photo_url));

  const tableRows: StudentTableRow[] = rows.map((row) => ({
    id: row.id,
    admission_number: row.admission_number,
    first_name: row.first_name,
    last_name: row.last_name,
    date_of_birth: null,
    gender: null,
    class_id: row.class_id,
    status: row.status,
    enrollment_date: "",
    address: null,
    notes: null,
    photoSignedUrl: row.photo_url ? (photoUrlByPath.get(row.photo_url) ?? null) : null,
    classLabel: row.class_id ? (classLabelById.get(row.class_id) ?? "—") : "—",
  }));

  const totalPages = Math.max(1, Math.ceil(total / STUDENTS_PAGE_SIZE));
  const buildPageHref = (targetPage: number) => {
    const p = new URLSearchParams();
    if (params.search) p.set("search", params.search);
    if (status) p.set("status", status);
    p.set("page", String(targetPage));
    return `/dashboard/students?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Students</h1>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <ImportExportBar entity="students" label="students" />
            <StudentFormSheet classOptions={classOptions} />
          </div>
        )}
      </div>

      <StudentsFilters search={params.search ?? ""} status={status ?? ""} />

      <Card>
        <CardContent className="p-0">
          <StudentsTable rows={tableRows} classOptions={classOptions} isAdmin={isAdmin} />
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            Page {page} of {totalPages} ({total} students)
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button variant="outline" size="sm" render={<Link href={buildPageHref(page - 1)} />}>
                Previous
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Previous
              </Button>
            )}
            {page < totalPages ? (
              <Button variant="outline" size="sm" render={<Link href={buildPageHref(page + 1)} />}>
                Next
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
