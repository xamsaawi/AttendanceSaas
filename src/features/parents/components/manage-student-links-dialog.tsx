"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { linkGuardianToStudent, unlinkGuardianFromStudent } from "@/features/parents/actions";
import type { GuardianLink } from "@/features/parents/queries";
import {
  relationshipValues,
  studentGuardianLinkSchema,
  type StudentGuardianLinkInput,
} from "@/lib/validations/guardians";

export function ManageStudentLinksDialog({
  open,
  onOpenChange,
  guardianId,
  guardianName,
  links,
  studentOptions,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  guardianId: string;
  guardianName: string;
  links: GuardianLink[];
  studentOptions: { id: string; label: string }[];
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StudentGuardianLinkInput>({
    resolver: zodResolver(studentGuardianLinkSchema),
    defaultValues: { studentId: "", relationship: "guardian", isPrimary: false },
  });

  async function onSubmit(data: StudentGuardianLinkInput) {
    setIsSubmitting(true);
    const result = await linkGuardianToStudent(guardianId, data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success("Student linked");
    reset({ studentId: "", relationship: "guardian", isPrimary: false });
  }

  async function onUnlink(linkId: string) {
    const result = await unlinkGuardianFromStudent(linkId);
    if (!result.success) toast.error(result.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Students linked to {guardianName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {links.length === 0 ? (
            <p className="text-muted-foreground text-sm">No students linked yet.</p>
          ) : (
            <ul className="space-y-2">
              {links.map((link) => (
                <li
                  key={link.id}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                >
                  <span>
                    {link.studentLabel} — {link.relationship}
                    {link.isPrimary && " (primary)"}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => onUnlink(link.id)}>
                    Unlink
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 border-t pt-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="link-student">Student</Label>
            <Controller
              control={control}
              name="studentId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="link-student" className="w-full">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.studentId && (
              <p className="text-destructive text-sm">{errors.studentId.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="link-relationship">Relationship</Label>
            <Controller
              control={control}
              name="relationship"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="link-relationship" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {relationshipValues.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex items-center gap-2">
            <Controller
              control={control}
              name="isPrimary"
              render={({ field }) => (
                <Checkbox
                  id="link-primary"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                />
              )}
            />
            <Label htmlFor="link-primary">Primary guardian for this student</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Linking..." : "Link student"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
