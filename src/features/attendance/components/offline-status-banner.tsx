"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { clearFailedMutation, listFailedMutations, listQueuedMutations } from "@/features/attendance/offline/queue";
import { replayQueuedMutations } from "@/features/attendance/offline/sync";

const POLL_MS = 5000;
const QUERY_KEY = ["attendance-offline-status"];

function useIsOnline(): boolean {
  const [isOnline, setIsOnline] = useState(() =>
    typeof window === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

export function OfflineStatusBanner() {
  const isOnline = useIsOnline();
  const queryClient = useQueryClient();
  const [isSyncing, setIsSyncing] = useState(false);

  const { data } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const [queued, failed] = await Promise.all([listQueuedMutations(), listFailedMutations()]);
      return { pendingCount: queued.length, failed };
    },
    refetchInterval: POLL_MS,
  });

  const pendingCount = data?.pendingCount ?? 0;
  const failed = data?.failed ?? [];

  async function handleSyncNow() {
    setIsSyncing(true);
    await replayQueuedMutations();
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    setIsSyncing(false);
  }

  async function dismissFailed(id: number | undefined) {
    if (id == null) return;
    await clearFailedMutation(id);
    await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
  }

  if (isOnline && pendingCount === 0 && failed.length === 0) return null;

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={isOnline ? "outline" : "destructive"}>{isOnline ? "Online" : "Offline"}</Badge>
        {pendingCount > 0 && (
          <span className="text-muted-foreground">
            {pendingCount} attendance submission{pendingCount === 1 ? "" : "s"} queued
          </span>
        )}
        {pendingCount > 0 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleSyncNow}
            disabled={isSyncing || !isOnline}
          >
            {isSyncing ? "Syncing..." : "Sync now"}
          </Button>
        )}
      </div>
      {failed.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-2 text-destructive">
          <span>
            Could not sync attendance for {item.payload.sessionDate} — {item.reason}
          </span>
          <Button type="button" size="sm" variant="ghost" onClick={() => dismissFailed(item.id)}>
            Dismiss
          </Button>
        </div>
      ))}
    </div>
  );
}
