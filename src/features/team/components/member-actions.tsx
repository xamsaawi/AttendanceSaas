"use client";

import { useState, useTransition } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { removeMember, updateMemberRole } from "@/features/team/actions";
import type { OrgRole } from "@/types/database";

const ROLE_OPTIONS: { value: OrgRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "teacher", label: "Teacher" },
];

export function MemberActions({ userId, role }: { userId: string; role: OrgRole }) {
  const [currentRole, setCurrentRole] = useState(role);
  const [isPending, startTransition] = useTransition();

  function onRoleChange(nextRole: OrgRole | null) {
    if (!nextRole) return;
    const previousRole = currentRole;
    setCurrentRole(nextRole);
    startTransition(async () => {
      const result = await updateMemberRole({ userId, role: nextRole });
      if (!result.success) {
        setCurrentRole(previousRole);
        toast.error(result.error);
      }
    });
  }

  function onRemove() {
    startTransition(async () => {
      const result = await removeMember(userId);
      if (!result.success) {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <Select value={currentRole} onValueChange={onRoleChange} disabled={isPending}>
        <SelectTrigger size="sm">
          <SelectValue>
            {(value: OrgRole) => ROLE_OPTIONS.find((option) => option.value === value)?.label ?? value}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {ROLE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="outline" size="sm" disabled={isPending} />}>
          Remove
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this member?</AlertDialogTitle>
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
