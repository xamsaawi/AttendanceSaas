import type { Metadata } from "next";

import { Card, CardContent } from "@/components/ui/card";
import { getCurrentMembership } from "@/features/organizations/queries";
import { ImportExportBar } from "@/features/import-export/components/import-export-bar";
import { PendingInvitesList } from "@/features/teachers/components/pending-invites-list";
import { TeacherFormSheet } from "@/features/teachers/components/teacher-form-sheet";
import { TeachersTable } from "@/features/teachers/components/teachers-table";
import { listPendingTeacherInvites, listTeachers } from "@/features/teachers/queries";

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
  const [teachers, pendingInvites] = await Promise.all([
    listTeachers(membership.organizationId),
    isAdmin ? listPendingTeacherInvites(membership.organizationId) : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Teachers</h1>
        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            <ImportExportBar entity="teachers" label="teachers" />
            <TeacherFormSheet />
          </div>
        )}
      </div>
      {isAdmin && <PendingInvitesList invites={pendingInvites} />}
      <Card>
        <CardContent className="p-0">
          <TeachersTable teachers={teachers} isAdmin={isAdmin} />
        </CardContent>
      </Card>
    </div>
  );
}
