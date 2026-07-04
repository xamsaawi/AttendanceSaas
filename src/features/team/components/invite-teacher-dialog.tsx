"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { UserPlusIcon } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { inviteTeacher } from "@/features/team/actions";
import { inviteTeacherSchema, type InviteTeacherInput } from "@/lib/validations/team";

export function InviteTeacherDialog() {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InviteTeacherInput>({ resolver: zodResolver(inviteTeacherSchema) });

  async function onSubmit(data: InviteTeacherInput) {
    setIsSubmitting(true);
    const result = await inviteTeacher(data);
    setIsSubmitting(false);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    reset();
    setTempPassword(result.tempPassword);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setTempPassword(null);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button />}>
        <UserPlusIcon />
        Add teacher
      </DialogTrigger>
      <DialogContent>
        {tempPassword ? (
          <>
            <DialogHeader>
              <DialogTitle>Teacher account created</DialogTitle>
              <DialogDescription>
                Share this temporary password with them so they can sign in. It won&apos;t be
                shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center gap-2">
              <Input readOnly value={tempPassword} className="font-mono" />
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(tempPassword);
                  toast.success("Copied to clipboard");
                }}
              >
                Copy
              </Button>
            </div>
            <DialogFooter>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add a teacher</DialogTitle>
              <DialogDescription>
                We&apos;ll create their account with a temporary password.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" autoComplete="name" {...register("fullName")} />
                {errors.fullName && (
                  <p className="text-destructive text-sm">{errors.fullName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" autoComplete="email" {...register("email")} />
                {errors.email && (
                  <p className="text-destructive text-sm">{errors.email.message}</p>
                )}
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account"}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
