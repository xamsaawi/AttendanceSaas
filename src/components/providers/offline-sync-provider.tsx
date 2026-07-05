"use client";

import { useEffect } from "react";

import { registerAttendanceSyncListeners } from "@/features/attendance/offline/sync";

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    return registerAttendanceSyncListeners();
  }, []);

  return <>{children}</>;
}
