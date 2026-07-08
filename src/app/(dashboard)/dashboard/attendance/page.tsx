import type { Metadata } from "next";
import { addDays, format, subDays } from "date-fns";
import type { ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminClassDrilldown } from "@/features/attendance/components/admin-class-drilldown";
import { AdminOverview } from "@/features/attendance/components/admin-overview";
import { AdminOverviewFilters } from "@/features/attendance/components/admin-overview-filters";
import { AttendanceCalendar } from "@/features/attendance/components/attendance-calendar";
import { AttendanceRealtimeListener } from "@/features/attendance/components/attendance-realtime-listener";
import { ClassSelectFilter } from "@/features/attendance/components/class-select-filter";
import { HistoryTable, type HistoryTableRow } from "@/features/attendance/components/history-table";
import { OfflineStatusBanner } from "@/features/attendance/components/offline-status-banner";
import { type RosterEditValue } from "@/features/attendance/components/roster-table";
import { TeacherDashboard } from "@/features/attendance/components/teacher-dashboard";
import {
  getAdminDailyOverview,
  getClassAttendanceCalendarMarks,
  getClassAttendanceHistory,
  getClassRosterForSession,
  getHomeroomClassesForUser,
  getSchoolCalendarConfig,
} from "@/features/attendance/queries";
import { listClassOptions } from "@/features/classes/queries";
import { getCurrentMembership } from "@/features/organizations/queries";
import { listMembers } from "@/features/team/queries";
import { createClient } from "@/lib/supabase/server";
import type { AttendanceSessionType } from "@/types/database";

export const metadata: Metadata = { title: "Attendance" };

const SESSION_TYPES: AttendanceSessionType[] = ["before_break", "after_break"];

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; date?: string; session?: string; classId?: string }>;
}) {
  const params = await searchParams;
  const membership = await getCurrentMembership();

  if (!membership) {
    return (
      <Card>
        <CardContent className="text-muted-foreground p-6 text-sm">
          You&apos;re not part of a school yet.
        </CardContent>
      </Card>
    );
  }

  const isAdmin = membership.role === "owner" || membership.role === "admin";
  const organizationId = membership.organizationId;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [homeroomClasses, classOptions, members] = await Promise.all([
    user ? getHomeroomClassesForUser(organizationId, user.id) : Promise.resolve([]),
    listClassOptions(organizationId),
    isAdmin ? listMembers(organizationId) : Promise.resolve([]),
  ]);

  const teacherNameById = new Map(members.map((m) => [m.userId, m.fullName ?? m.email ?? "Unnamed"]));
  const classLabelById = new Map(classOptions.map((c) => [c.id, c.label]));

  const defaultTab = isAdmin ? "admin" : "mine";
  const activeTab = params.tab ?? defaultTab;

  const selectedClassId =
    params.classId ?? homeroomClasses[0]?.id ?? classOptions[0]?.id ?? "";

  return (
    <div className="space-y-6">
      {user && <AttendanceRealtimeListener organizationId={organizationId} />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
      </div>

      <OfflineStatusBanner />

      <Tabs defaultValue={activeTab}>
        <TabsList>
          {!isAdmin && <TabsTrigger value="mine">Mark Attendance</TabsTrigger>}
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          {isAdmin && <TabsTrigger value="admin">Admin Overview</TabsTrigger>}
        </TabsList>

        {!isAdmin && (
          <TabsContent value="mine" className="space-y-6 pt-4">
            <TeacherDashboard homeroomClasses={homeroomClasses} />
          </TabsContent>
        )}

        <TabsContent value="calendar" className="space-y-4 pt-4">
          {classOptions.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground p-6 text-sm">
                No classes found yet.
              </CardContent>
            </Card>
          ) : (
            <CalendarTabContent
              organizationId={organizationId}
              classOptions={classOptions}
              classId={selectedClassId}
            />
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4 pt-4">
          {classOptions.length === 0 ? (
            <Card>
              <CardContent className="text-muted-foreground p-6 text-sm">
                No classes found yet.
              </CardContent>
            </Card>
          ) : (
            <HistoryTabContent classOptions={classOptions} classId={selectedClassId} />
          )}
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin" className="space-y-4 pt-4">
            <AdminTabContent
              organizationId={organizationId}
              date={params.date ?? todayStr()}
              sessionType={SESSION_TYPES.includes(params.session as AttendanceSessionType) ? (params.session as AttendanceSessionType) : "before_break"}
              classId={params.classId}
              classLabelById={classLabelById}
              teacherNameById={teacherNameById}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

async function CalendarTabContent({
  organizationId,
  classOptions,
  classId,
}: {
  organizationId: string;
  classOptions: { id: string; label: string }[];
  classId: string;
}) {
  const today = new Date();
  const monthStart = format(subDays(today, 60), "yyyy-MM-dd");
  const monthEnd = format(addDays(today, 30), "yyyy-MM-dd");

  const [calendarConfig, marks] = await Promise.all([
    getSchoolCalendarConfig(organizationId),
    getClassAttendanceCalendarMarks(classId, monthStart, monthEnd),
  ]);

  return (
    <div className="space-y-4">
      <ClassSelectFilter tab="calendar" classId={classId} classOptions={classOptions} />
      <Card>
        <CardContent className="p-4">
          <AttendanceCalendar calendarConfig={calendarConfig} marks={marks} />
        </CardContent>
      </Card>
    </div>
  );
}

async function HistoryTabContent({
  classOptions,
  classId,
}: {
  classOptions: { id: string; label: string }[];
  classId: string;
}) {
  const today = new Date();
  const dateFrom = format(subDays(today, 30), "yyyy-MM-dd");
  const dateTo = format(today, "yyyy-MM-dd");

  const history = await getClassAttendanceHistory(classId, dateFrom, dateTo);
  const rows: HistoryTableRow[] = history.map((h) => ({
    sessionDate: h.sessionDate,
    sessionType: h.sessionType,
    status: h.status,
    notes: h.notes,
    studentName: h.studentName,
  }));

  return (
    <div className="space-y-4">
      <ClassSelectFilter tab="history" classId={classId} classOptions={classOptions} />
      <Card>
        <CardContent className="p-4">
          <HistoryTable
            rows={rows}
            exportHref={`/api/export/attendance?classId=${classId}&dateFrom=${dateFrom}&dateTo=${dateTo}`}
          />
        </CardContent>
      </Card>
    </div>
  );
}

async function AdminTabContent({
  organizationId,
  date,
  sessionType,
  classId,
  classLabelById,
  teacherNameById,
}: {
  organizationId: string;
  date: string;
  sessionType: AttendanceSessionType;
  classId?: string;
  classLabelById: Map<string, string>;
  teacherNameById: Map<string, string>;
}) {
  const rows = await getAdminDailyOverview(organizationId, date, sessionType);

  let drilldown: ReactNode = null;
  if (classId) {
    const roster = await getClassRosterForSession(classId, date, sessionType);
    const initialValues: Record<string, RosterEditValue> = {};
    for (const student of roster.students) {
      const record = roster.recordByStudentId.get(student.id);
      initialValues[student.id] = { status: record?.status ?? "present", notes: record?.notes ?? "" };
    }

    drilldown = (
      <AdminClassDrilldown
        classId={classId}
        sessionDate={date}
        sessionType={sessionType}
        students={roster.students}
        initialValues={initialValues}
        markedCount={roster.recordByStudentId.size}
        lock={roster.lock}
      />
    );
  }

  return (
    <div className="space-y-4">
      <AdminOverviewFilters date={date} sessionType={sessionType} />
      <Card>
        <CardContent className="p-0">
          <AdminOverview
            rows={rows}
            classLabelById={classLabelById}
            teacherNameById={teacherNameById}
            buildDrilldownHref={(id) => `/dashboard/attendance?tab=admin&date=${date}&session=${sessionType}&classId=${id}`}
          />
        </CardContent>
      </Card>
      {drilldown}
    </div>
  );
}
