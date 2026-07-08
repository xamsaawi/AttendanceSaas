"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { PhotoUpload } from "@/components/shared/photo-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  inviteTeacherWithProfile,
  updateTeacherProfile,
  uploadTeacherPhoto,
} from "@/features/teachers/actions";
import type { TeacherRow } from "@/features/teachers/queries";
import {
  teacherInviteSchema,
  teacherProfileSchema,
  type TeacherInviteInput,
  type TeacherProfileInput,
} from "@/lib/validations/teachers";

export function TeacherFormSheet({ teacher }: { teacher?: TeacherRow }) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {!teacher && (
        <Button onClick={() => setOpen(true)} type="button">
          <PlusIcon />
          Add teacher
        </Button>
      )}
      {teacher && (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} type="button">
          Edit
        </Button>
      )}
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{teacher ? "Edit teacher" : "Add a teacher"}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 px-4">
          {teacher ? (
            <EditTeacherForm teacher={teacher} onDone={() => setOpen(false)} />
          ) : (
            <InviteTeacherForm onDone={() => setOpen(false)} />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function InviteTeacherForm({ onDone }: { onDone: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TeacherInviteInput>({ resolver: zodResolver(teacherInviteSchema) });

  async function onSubmit(data: TeacherInviteInput) {
    setIsSubmitting(true);
    const result = await inviteTeacherWithProfile(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(`Invited — they can sign in with Google using ${data.email}`);
    reset();
    onDone();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="teacher-full-name">Full name</Label>
        <Input id="teacher-full-name" autoComplete="name" {...register("fullName")} />
        {errors.fullName && <p className="text-destructive text-sm">{errors.fullName.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="teacher-email">Gmail address</Label>
        <Input id="teacher-email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
        <p className="text-muted-foreground text-xs">
          They&apos;ll sign in with this Google account — no password to set or share.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="teacher-staff-id">Staff ID</Label>
        <Input id="teacher-staff-id" {...register("staffId")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="teacher-phone">Phone</Label>
        <Input id="teacher-phone" {...register("phone")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="teacher-subjects">Subjects (comma separated)</Label>
        <Input id="teacher-subjects" placeholder="Math, Science" {...register("subjects")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="teacher-qualification">Qualification</Label>
        <Input id="teacher-qualification" {...register("qualification")} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="teacher-hire-date">Hire date</Label>
        <Input id="teacher-hire-date" type="date" {...register("hireDate")} />
      </div>
      <SheetFooter className="px-0">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Adding teacher..." : "Add teacher"}
        </Button>
      </SheetFooter>
    </form>
  );
}

function EditTeacherForm({ teacher, onDone }: { teacher: TeacherRow; onDone: () => void }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeacherProfileInput>({
    resolver: zodResolver(teacherProfileSchema),
    defaultValues: {
      staffId: teacher.staffId ?? "",
      phone: teacher.phone ?? "",
      subjects: teacher.subjects.join(", "),
      qualification: teacher.qualification ?? "",
      hireDate: teacher.hireDate ?? "",
    },
  });

  async function onSubmit(data: TeacherProfileInput) {
    setIsSubmitting(true);
    const result = await updateTeacherProfile(teacher.userId, data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Teacher updated");
    onDone();
  }

  return (
    <>
      <PhotoUpload
        currentUrl={teacher.photoSignedUrl}
        fallbackText={(teacher.fullName ?? "?")[0]}
        action={(formData) => {
          formData.set("userId", teacher.userId);
          return uploadTeacherPhoto(formData);
        }}
      />
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-2">
          <Label>Name</Label>
          <p className="text-muted-foreground text-sm">{teacher.fullName ?? "—"}</p>
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <p className="text-muted-foreground text-sm">{teacher.email ?? "—"}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-edit-staff-id">Staff ID</Label>
          <Input id="teacher-edit-staff-id" {...register("staffId")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-edit-phone">Phone</Label>
          <Input id="teacher-edit-phone" {...register("phone")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-edit-subjects">Subjects (comma separated)</Label>
          <Input id="teacher-edit-subjects" {...register("subjects")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-edit-qualification">Qualification</Label>
          <Input id="teacher-edit-qualification" {...register("qualification")} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="teacher-edit-hire-date">Hire date</Label>
          <Input id="teacher-edit-hire-date" type="date" {...register("hireDate")} />
          {errors.hireDate && <p className="text-destructive text-sm">{errors.hireDate.message}</p>}
        </div>
        <SheetFooter className="px-0">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </SheetFooter>
      </form>
    </>
  );
}
