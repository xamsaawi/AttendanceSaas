import type { MarkAttendanceInput } from "@/lib/validations/attendance";

import { getAttendanceOfflineDB, rosterCacheKey } from "./db";
import type { CachedRoster, FailedMutation, QueuedMutation } from "./types";

export async function cacheRoster(roster: CachedRoster): Promise<void> {
  const db = await getAttendanceOfflineDB();
  await db.put("roster-cache", roster);
}

export async function getCachedRoster(
  classId: string,
  sessionDate: string,
  sessionType: string,
): Promise<CachedRoster | undefined> {
  const db = await getAttendanceOfflineDB();
  return db.get("roster-cache", rosterCacheKey(classId, sessionDate, sessionType));
}

export async function enqueueMutation(payload: MarkAttendanceInput): Promise<void> {
  const db = await getAttendanceOfflineDB();
  const mutation: QueuedMutation = { payload, createdAt: new Date().toISOString(), attempts: 0 };
  await db.add("mutation-queue", mutation);
}

export async function listQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await getAttendanceOfflineDB();
  return db.getAll("mutation-queue");
}

export async function dequeueMutation(id: number): Promise<void> {
  const db = await getAttendanceOfflineDB();
  await db.delete("mutation-queue", id);
}

export async function updateQueuedMutation(
  id: number,
  attempts: number,
  lastError: string,
): Promise<void> {
  const db = await getAttendanceOfflineDB();
  const existing = await db.get("mutation-queue", id);
  if (!existing) return;
  await db.put("mutation-queue", { ...existing, id, attempts, lastError });
}

export async function logFailedMutation(payload: MarkAttendanceInput, reason: string): Promise<void> {
  const db = await getAttendanceOfflineDB();
  const failed: FailedMutation = { payload, reason, failedAt: new Date().toISOString() };
  await db.add("failed-log", failed);
}

export async function listFailedMutations(): Promise<FailedMutation[]> {
  const db = await getAttendanceOfflineDB();
  return db.getAll("failed-log");
}

export async function clearFailedMutation(id: number): Promise<void> {
  const db = await getAttendanceOfflineDB();
  await db.delete("failed-log", id);
}
