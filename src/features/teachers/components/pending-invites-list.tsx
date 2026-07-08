"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { removeTeacherInvite } from "@/features/teachers/actions";
import type { PendingTeacherInvite } from "@/features/teachers/queries";

export function PendingInvitesList({ invites }: { invites: PendingTeacherInvite[] }) {
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  if (invites.length === 0) return null;

  async function onCancel(id: string) {
    setPendingIds((prev) => new Set(prev).add(id));
    const result = await removeTeacherInvite(id);
    if (!result.success) {
      toast.error(result.error);
      setPendingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pending invites</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {invites.map((invite) => (
          <div key={invite.id} className="flex items-center justify-between text-sm">
            <div>
              <p className="font-medium">{invite.fullName}</p>
              <p className="text-muted-foreground">
                {invite.email} — waiting for them to sign in with Google
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pendingIds.has(invite.id)}
              onClick={() => onCancel(invite.id)}
            >
              Cancel
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
