"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { subscribeToOrgAttendance } from "@/features/attendance/realtime";

const DEBOUNCE_MS = 400;

export function AttendanceRealtimeListener({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToOrgAttendance(organizationId, () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => router.refresh(), DEBOUNCE_MS);
    });

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      unsubscribe();
    };
  }, [organizationId, router]);

  return null;
}
