"use client";

import { WifiOff } from "lucide-react";

import { useNetworkStatus } from "@/hooks/use-network-status";

export function OfflineBanner() {
  const isOnline = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="bg-destructive text-destructive-foreground flex items-center justify-center gap-2 px-4 py-2 text-sm">
      <WifiOff className="size-4" />
      You are offline. Some features may be unavailable.
    </div>
  );
}
