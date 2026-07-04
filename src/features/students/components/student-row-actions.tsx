"use client";

import { useTransition } from "react";
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
import { deleteStudent } from "@/features/students/actions";
import {
  StudentFormSheet,
  type StudentEditData,
} from "@/features/students/components/student-form-sheet";

export function StudentRowActions({
  student,
  classOptions,
}: {
  student: StudentEditData;
  classOptions: { id: string; label: string }[];
}) {
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      const result = await deleteStudent(student.id);
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <StudentFormSheet student={student} classOptions={classOptions} />
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={isPending} />}>
          Delete
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this student?</AlertDialogTitle>
            <AlertDialogDescription>This can&apos;t be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
