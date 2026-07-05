import { openDB, type DBSchema, type IDBPDatabase } from "idb";

import type { CachedRoster, FailedMutation, QueuedMutation } from "./types";

interface AttendanceOfflineDB extends DBSchema {
  "roster-cache": {
    key: string;
    value: CachedRoster;
  };
  "mutation-queue": {
    key: number;
    value: QueuedMutation;
  };
  "failed-log": {
    key: number;
    value: FailedMutation;
  };
}

const DB_NAME = "attendance-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AttendanceOfflineDB>> | null = null;

export function getAttendanceOfflineDB() {
  if (typeof window === "undefined") {
    throw new Error("Attendance offline DB is only available in the browser");
  }
  if (!dbPromise) {
    dbPromise = openDB<AttendanceOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("roster-cache")) {
          db.createObjectStore("roster-cache", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("mutation-queue")) {
          db.createObjectStore("mutation-queue", { keyPath: "id", autoIncrement: true });
        }
        if (!db.objectStoreNames.contains("failed-log")) {
          db.createObjectStore("failed-log", { keyPath: "id", autoIncrement: true });
        }
      },
    });
  }
  return dbPromise;
}

export function rosterCacheKey(classId: string, sessionDate: string, sessionType: string): string {
  return `${classId}:${sessionDate}:${sessionType}`;
}
