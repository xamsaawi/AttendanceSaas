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
import { TeacherFormSheet } from "@/features/teachers/components/teacher-form-sheet";
import { removeTeacher } from "@/features/teachers/actions";
import type { TeacherRow } from "@/features/teachers/queries";

export function TeacherRowActions({ teacher }: { teacher: TeacherRow }) {
  const [isPending, startTransition] = useTransition();

  function onRemove() {
    startTransition(async () => {
      const result = await removeTeacher(teacher.userId);
      if (!result.success) toast.error(result.error);
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <TeacherFormSheet teacher={teacher} />
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={isPending} />}>
          Remove
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this teacher?</AlertDialogTitle>
            <AlertDialogDescription>
              They&apos;ll immediately lose access to this school.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onRemove}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
