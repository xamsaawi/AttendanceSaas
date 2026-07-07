import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import {
  BarChart3,
  CalendarCheck,
  Contact,
  GraduationCap,
  School,
  UserCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logout } from "@/features/auth/actions";
import { getCurrentMembership } from "@/features/organizations/queries";
import { getAttendanceSummary, getEnrollmentBreakdown } from "@/features/reports/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const quickLinks = [
  { title: "Mark attendance", href: "/dashboard/attendance", icon: CalendarCheck },
  { title: "Students", href: "/dashboard/students", icon: GraduationCap },
  { title: "Teachers", href: "/dashboard/teachers", icon: UserCheck },
  { title: "Parents", href: "/dashboard/parents", icon: Contact },
  { title: "Classes", href: "/dashboard/classes", icon: School },
  { title: "Reports", href: "/dashboard/reports", icon: BarChart3 },
];

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const membership = await getCurrentMembership();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Welcome{user?.email ? `, ${user.email}` : ""}
            {membership ? ` · ${membership.organizationName}` : ""}
          </p>
        </div>
        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      </div>

      {membership ? (
        <DashboardOverview organizationId={membership.organizationId} />
      ) : (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            You&apos;re not part of a school yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

async function DashboardOverview({ organizationId }: { organizationId: string }) {
  const supabase = await createClient();
  const today = format(new Date(), "yyyy-MM-dd");

  const [enrollment, todaysAttendance, { count: teacherCount }, { count: classCount }] =
    await Promise.all([
      getEnrollmentBreakdown(organizationId),
      getAttendanceSummary(organizationId, today, today),
      supabase
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("role", "teacher"),
      supabase
        .from("classes")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId),
    ]);

  const stats = [
    { label: "Active students", value: enrollment.totalActive },
    { label: "Teachers", value: teacherCount ?? 0 },
    { label: "Classes", value: classCount ?? 0 },
    {
      label: "Attendance today",
      value:
        todaysAttendance.markedCount === 0
          ? "Not marked yet"
          : `${todaysAttendance.attendancePercentage ?? "—"}%`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-2xl font-semibold">{stat.value}</CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick links</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Button
              key={link.href}
              variant="outline"
              className="justify-start"
              render={<Link href={link.href} />}
              nativeButton={false}
            >
              <link.icon />
              {link.title}
            </Button>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
