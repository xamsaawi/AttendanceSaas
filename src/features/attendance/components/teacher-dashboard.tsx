"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerField } from "@/features/attendance/components/date-picker-field";
import { RosterEditor } from "@/features/attendance/components/roster-editor";
import { SessionTabs } from "@/features/attendance/components/session-tabs";
import { fetchRosterWithOfflineFallback } from "@/features/attendance/offline/fetch-roster";
import type { HomeroomClassOption } from "@/features/attendance/queries";
import type { AttendanceSessionType } from "@/types/database";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TeacherDashboard({ homeroomClasses }: { homeroomClasses: HomeroomClassOption[] }) {
  const [classId, setClassId] = useState(homeroomClasses[0]?.id ?? "");
  const [sessionDate, setSessionDate] = useState(today());
  const [sessionType, setSessionType] = useState<AttendanceSessionType>("before_break");

  const rosterQuery = useQuery({
    queryKey: ["attendance-roster", classId, sessionDate, sessionType],
    queryFn: () => fetchRosterWithOfflineFallback(classId, sessionDate, sessionType),
    enabled: Boolean(classId),
  });

  if (homeroomClasses.length === 0) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          You aren&apos;t assigned as a homeroom teacher for any class yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle>Mark attendance</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          {homeroomClasses.length > 1 && (
            <Select value={classId} onValueChange={(value) => value && setClassId(value)}>
              <SelectTrigger size="sm">
                <SelectValue>
                  {(value: string) => homeroomClasses.find((c) => c.id === value)?.label ?? value}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {homeroomClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <DatePickerField value={sessionDate} onChange={setSessionDate} />
          <SessionTabs value={sessionType} onChange={setSessionType} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rosterQuery.data?.offline && (
          <p className="text-muted-foreground text-sm">
            Showing cached data — you&apos;re currently offline.
          </p>
        )}
        {rosterQuery.isLoading ? (
          <p className="text-muted-foreground text-sm">Loading roster...</p>
        ) : rosterQuery.data ? (
          <RosterEditor
            key={`${classId}:${sessionDate}:${sessionType}`}
            classId={classId}
            sessionDate={sessionDate}
            sessionType={sessionType}
            students={rosterQuery.data.students}
            initialRecords={rosterQuery.data.recordByStudentId}
            lock={rosterQuery.data.lock}
            onSaved={() => rosterQuery.refetch()}
          />
        ) : (
          <p className="text-destructive text-sm">
            {rosterQuery.error instanceof Error ? rosterQuery.error.message : "Failed to load roster"}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
