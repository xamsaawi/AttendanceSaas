"use client";

import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { ImportExportBar } from "@/features/import-export/components/import-export-bar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteGuardian } from "@/features/parents/actions";
import { GuardianFormDialog } from "@/features/parents/components/guardian-form-dialog";
import { ManageStudentLinksDialog } from "@/features/parents/components/manage-student-links-dialog";
import type { GuardianLink, GuardianRow } from "@/features/parents/queries";

type GuardianWithLinks = GuardianRow & { links: GuardianLink[] };

export function GuardiansSection({
  guardians,
  studentOptions,
  isAdmin,
}: {
  guardians: GuardianWithLinks[];
  studentOptions: { id: string; label: string }[];
  isAdmin: boolean;
}) {
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<GuardianRow | null>(null);
  const [managingLinksId, setManagingLinksId] = useState<string | null>(null);
  const managingLinks = guardians.find((g) => g.id === managingLinksId) ?? null;

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(guardian: GuardianRow) {
    setEditing(guardian);
    setFormOpen(true);
  }

  async function onDelete(id: string) {
    const result = await deleteGuardian(id);
    if (!result.success) toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Parents</h1>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <ImportExportBar entity="guardians" label="parents" />
            <Button onClick={openCreate}>
              <PlusIcon />
              Add guardian
            </Button>
          </div>
        )}
      </div>

      {guardians.length === 0 ? (
        <EmptyState
          title="No guardians yet"
          description="Add a parent or guardian contact and link them to a student."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Linked students</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {guardians.map((guardian) => (
              <TableRow key={guardian.id}>
                <TableCell>{guardian.full_name}</TableCell>
                <TableCell>{guardian.phone ?? "—"}</TableCell>
                <TableCell>{guardian.email ?? "—"}</TableCell>
                <TableCell>{guardian.links.length}</TableCell>
                {isAdmin && (
                  <TableCell className="text-right space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setManagingLinksId(guardian.id)}>
                      Manage students
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openEdit(guardian)}>
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
                        Delete
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this guardian?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will also remove their links to any students.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            variant="destructive"
                            onClick={() => onDelete(guardian.id)}
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {isAdmin && (
        <GuardianFormDialog open={formOpen} onOpenChange={setFormOpen} editing={editing} />
      )}
      {isAdmin && managingLinks && (
        <ManageStudentLinksDialog
          open={Boolean(managingLinks)}
          onOpenChange={(open) => !open && setManagingLinksId(null)}
          guardianId={managingLinks.id}
          guardianName={managingLinks.full_name}
          links={managingLinks.links}
          studentOptions={studentOptions}
        />
      )}
    </div>
  );
}
