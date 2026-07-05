"use client";

import { formatDistanceToNow, isPast } from "date-fns";

import { Badge } from "@/components/ui/badge";

export function LockBadge({
  isLocked,
  effectiveLockAt,
}: {
  isLocked: boolean;
  effectiveLockAt: string;
}) {
  if (isLocked) {
    return <Badge variant="destructive">Locked</Badge>;
  }

  const lockDate = new Date(effectiveLockAt);
  if (isPast(lockDate)) {
    return <Badge variant="destructive">Locked</Badge>;
  }

  return (
    <Badge variant="outline">Locks {formatDistanceToNow(lockDate, { addSuffix: true })}</Badge>
  );
}
