"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createGuardian, updateGuardian } from "@/features/parents/actions";
import type { GuardianRow } from "@/features/parents/queries";
import { guardianSchema, type GuardianInput } from "@/lib/validations/guardians";

export function GuardianFormDialog({
  open,
  onOpenChange,
  editing,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GuardianRow | null;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GuardianInput>({
    resolver: zodResolver(guardianSchema),
    values: editing
      ? {
          fullName: editing.full_name,
          phone: editing.phone ?? "",
          email: editing.email ?? "",
          address: editing.address ?? "",
          notes: editing.notes ?? "",
        }
      : { fullName: "", phone: "", email: "", address: "", notes: "" },
  });

  async function onSubmit(data: GuardianInput) {
    setIsSubmitting(true);
    const result = editing ? await updateGuardian(editing.id, data) : await createGuardian(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }
    toast.success(editing ? "Guardian updated" : "Guardian added");
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit guardian" : "Add guardian"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="guardian-name">Full name</Label>
            <Input id="guardian-name" {...register("fullName")} />
            {errors.fullName && (
              <p className="text-destructive text-sm">{errors.fullName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian-phone">Phone</Label>
            <Input id="guardian-phone" {...register("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian-email">Email</Label>
            <Input id="guardian-email" type="email" {...register("email")} />
            {errors.email && <p className="text-destructive text-sm">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian-address">Address</Label>
            <Textarea id="guardian-address" {...register("address")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="guardian-notes">Notes</Label>
            <Textarea id="guardian-notes" {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : editing ? "Save changes" : "Add guardian"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
