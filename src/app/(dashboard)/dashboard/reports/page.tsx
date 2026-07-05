import type { Metadata } from "next";
import { format, subDays } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listAuditLogs } from "@/features/audit/queries";
import { getCurrentMembership } from "@/features/organizations/queries";
import { AttendanceTrendChart } from "@/features/reports/components/attendance-trend-chart";
import { ClassComparisonChart } from "@/features/reports/components/class-comparison-chart";
import { EnrollmentBreakdownChart } from "@/features/reports/components/enrollment-breakdown-chart";
import { ExportLinks } from "@/features/reports/components/export-links";
import {
  getAttendanceSummary,
  getAttendanceTrend,
  getClassAttendanceComparison,
  getEnrollmentBreakdown,
  getLowAttendanceStudents,
  listReportRuns,
} from "@/features/reports/queries";
import { listMembers } from "@/features/team/queries";
import { listWhatsappMessages } from "@/features/whatsapp/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Reports" };

const TREND_RANGE_DAYS = 30;

export default async function ReportsPage() {
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

  const today = format(new Date(), "yyyy-MM-dd");
  const dateFrom = format(subDays(new Date(), TREND_RANGE_DAYS), "yyyy-MM-dd");

  const [trend, classComparison, enrollment, lowAttendance, summary, reportRuns] = await Promise.all(
    [
      getAttendanceTrend(organizationId, dateFrom, today),
      getClassAttendanceComparison(organizationId),
      getEnrollmentBreakdown(organizationId),
      getLowAttendanceStudents(organizationId),
      getAttendanceSummary(organizationId, dateFrom, today),
      listReportRuns(organizationId),
    ],
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>

      <Tabs defaultValue="analytics">
        <TabsList>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          {isAdmin && <TabsTrigger value="audit">Audit Log</TabsTrigger>}
          {isAdmin && <TabsTrigger value="health">System Health</TabsTrigger>}
        </TabsList>

        <TabsContent value="analytics" className="space-y-6 pt-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Attendance rate (30d)</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {summary.attendancePercentage == null ? "—" : `${summary.attendancePercentage}%`}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Present / Absent (30d)</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">
                {summary.presentCount + summary.lateCount} / {summary.absentCount}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Active students</CardTitle>
              </CardHeader>
              <CardContent className="text-2xl font-semibold">{enrollment.totalActive}</CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Attendance trend (last {TREND_RANGE_DAYS} days)</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendanceTrendChart data={trend} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Attendance by class</CardTitle>
            </CardHeader>
            <CardContent>
              <ClassComparisonChart data={classComparison} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enrollment by status</CardTitle>
            </CardHeader>
            <CardContent>
              <EnrollmentBreakdownChart data={enrollment} />
            </CardContent>
          </Card>

          {lowAttendance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Students below 75% attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Admission #</TableHead>
                      <TableHead>Attendance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowAttendance.map((row) => (
                      <TableRow key={row.studentId}>
                        <TableCell>{row.studentName}</TableCell>
                        <TableCell>{row.admissionNumber}</TableCell>
                        <TableCell>
                          <Badge variant="destructive">{row.attendancePercentage}%</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Export reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ExportLinks
                baseHref={`/api/export/attendance-summary?dateFrom=${dateFrom}&dateTo=${today}`}
                label="Attendance summary (last 30 days)"
              />
              <ExportLinks baseHref="/api/export/students" label="Student roster" />
              <ExportLinks baseHref="/api/export/teachers" label="Teachers" />
              <ExportLinks baseHref="/api/export/guardians" label="Parents / guardians" />
              {isAdmin && <ExportLinks baseHref="/api/export/audit-log" label="Audit log" />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Daily report history</CardTitle>
            </CardHeader>
            <CardContent>
              {reportRuns.length === 0 ? (
                <p className="text-muted-foreground text-sm">
                  No daily reports have run yet — they generate automatically once a day.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>{run.runDate}</TableCell>
                        <TableCell>{run.reportType.replaceAll("_", " ")}</TableCell>
                        <TableCell>
                          <Badge variant={run.status === "success" ? "default" : "destructive"}>
                            {run.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="audit" className="space-y-6 pt-4">
            <AuditLogTabContent organizationId={organizationId} />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="health" className="space-y-6 pt-4">
            <SystemHealthTabContent
              organizationId={organizationId}
              reportRuns={reportRuns}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

async function AuditLogTabContent({ organizationId }: { organizationId: string }) {
  const [logs, members] = await Promise.all([
    listAuditLogs(organizationId, { limit: 100 }),
    listMembers(organizationId),
  ]);
  const actorNameById = new Map(members.map((m) => [m.userId, m.fullName ?? m.email ?? "Unnamed"]));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Audit log</CardTitle>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <p className="text-muted-foreground text-sm">No activity logged yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Actor</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Entity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.createdAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>{log.actorId ? (actorNameById.get(log.actorId) ?? "Unknown") : "System"}</TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell className="text-muted-foreground">{log.entityType}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

async function checkDatabaseHealth(
  organizationId: string,
): Promise<{ isHealthy: boolean; latencyMs: number }> {
  const start = Date.now();
  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .select("id", { count: "exact", head: true })
    .eq("id", organizationId);
  return { isHealthy: !error, latencyMs: Date.now() - start };
}

async function SystemHealthTabContent({
  organizationId,
  reportRuns,
}: {
  organizationId: string;
  reportRuns: { runDate: string; status: string; createdAt: string }[];
}) {
  const { isHealthy, latencyMs: dbLatencyMs } = await checkDatabaseHealth(organizationId);
  const supabase = await createClient();

  const [{ count: auditCountToday }, whatsappMessages] = await Promise.all([
    supabase
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", format(new Date(), "yyyy-MM-dd")),
    listWhatsappMessages(organizationId, 50),
  ]);

  const failedWhatsappCount = whatsappMessages.filter((m) => m.status === "failed").length;
  const lastReportRun = reportRuns[0];
  const deploySha = process.env.VERCEL_GIT_COMMIT_SHA;

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Database connectivity</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Badge variant={isHealthy ? "default" : "destructive"}>{isHealthy ? "Healthy" : "Down"}</Badge>
          <span className="text-muted-foreground text-sm">{dbLatencyMs}ms</span>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Last daily report</CardTitle>
        </CardHeader>
        <CardContent>
          {lastReportRun ? (
            <div className="flex items-center gap-2">
              <Badge variant={lastReportRun.status === "success" ? "default" : "destructive"}>
                {lastReportRun.status}
              </Badge>
              <span className="text-muted-foreground text-sm">{lastReportRun.runDate}</span>
            </div>
          ) : (
            <span className="text-muted-foreground text-sm">Not run yet</span>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Audit events today</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{auditCountToday ?? 0}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Failed WhatsApp messages</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-semibold">{failedWhatsappCount}</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Deployment</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground text-sm">
          {deploySha ? deploySha.slice(0, 7) : "n/a (local dev)"}
        </CardContent>
      </Card>
    </div>
  );
}
