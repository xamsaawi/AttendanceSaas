import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { getCurrentMembership } from "@/features/organizations/queries";
import { ImportExportBar } from "@/features/import-export/components/import-export-bar";
import { TeacherFormSheet } from "@/features/teachers/components/teacher-form-sheet";
import { TeachersTable } from "@/features/teachers/components/teachers-table";
import { listTeachers } from "@/features/teachers/queries";

export const metadata: Metadata = { title: "Teachers" };

export default async function TeachersPage() {
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
  const teachers = await listTeachers(membership.organizationId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <ImportExportBar entity="teachers" label="teachers" />
            <TeacherFormSheet />
          </div>
        )}
      </div>
      <Card>
        <CardContent className="p-0">
          <TeachersTable teachers={teachers} isAdmin={isAdmin} />
        </CardContent>
      </Card>
    </div>
  );
}
