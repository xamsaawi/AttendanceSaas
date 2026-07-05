import {
  dequeueMutation,
  listQueuedMutations,
  logFailedMutation,
  updateQueuedMutation,
} from "./queue";

let replaying = false;

export async function replayQueuedMutations(): Promise<void> {
  if (replaying) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  replaying = true;

  try {
    const queued = await listQueuedMutations();
    for (const mutation of queued) {
      if (mutation.id == null) continue;

      try {
        const res = await fetch("/api/attendance/mark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(mutation.payload),
        });

        if (res.ok) {
          await dequeueMutation(mutation.id);
          continue;
        }

        if (res.status === 423) {
          const body = await res.json().catch(() => ({ error: "Session locked" }));
          await logFailedMutation(mutation.payload, body.error ?? "Session locked");
          await dequeueMutation(mutation.id);
          continue;
        }

        const body = await res.json().catch(() => ({ error: "Failed to sync" }));
        await updateQueuedMutation(mutation.id, mutation.attempts + 1, body.error ?? "Failed to sync");
      } catch (error) {
        await updateQueuedMutation(
          mutation.id,
          mutation.attempts + 1,
          error instanceof Error ? error.message : "Network error",
        );
      }
    }
  } finally {
    replaying = false;
  }
}

const REPLAY_INTERVAL_MS = 60_000;

export function registerAttendanceSyncListeners(): () => void {
  const triggerReplay = () => void replayQueuedMutations();
  const handleVisibility = () => {
    if (document.visibilityState === "visible") triggerReplay();
  };

  window.addEventListener("online", triggerReplay);
  document.addEventListener("visibilitychange", handleVisibility);
  const interval = setInterval(triggerReplay, REPLAY_INTERVAL_MS);
  triggerReplay();

  return () => {
    window.removeEventListener("online", triggerReplay);
    document.removeEventListener("visibilitychange", handleVisibility);
    clearInterval(interval);
  };
}
