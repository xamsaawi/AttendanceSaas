import { NextResponse } from "next/server";

import { env } from "@/config/env";
import { createNotification } from "@/features/notifications/create";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

function yesterday(): string {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// Vercel Cron sends `Authorization: Bearer $CRON_SECRET` automatically when
// CRON_SECRET is set as a project env var — this route has no user session,
// so that header is the only auth check available.
export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (!env.CRON_SECRET || authHeader !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const runDate = yesterday();

  const { data: orgs, error: orgsError } = await supabase.from("organizations").select("id");
  if (orgsError) {
    logger.error("Daily report cron: failed to list organizations", { message: orgsError.message });
    return NextResponse.json({ error: "Failed to list organizations" }, { status: 500 });
  }

  let processed = 0;

  for (const org of orgs ?? []) {
    try {
      const { data: overview, error } = await supabase
        .from("attendance_session_overview")
        .select("marked_count, present_count, absent_count, late_count, excused_count, half_day_count")
        .eq("organization_id", org.id)
        .eq("session_date", runDate);
      if (error) throw error;

      const totals = (overview ?? []).reduce(
        (acc, row) => ({
          marked: acc.marked + (row.marked_count ?? 0),
          present: acc.present + (row.present_count ?? 0),
          absent: acc.absent + (row.absent_count ?? 0),
          late: acc.late + (row.late_count ?? 0),
          excused: acc.excused + (row.excused_count ?? 0),
          halfDay: acc.halfDay + (row.half_day_count ?? 0),
        }),
        { marked: 0, present: 0, absent: 0, late: 0, excused: 0, halfDay: 0 },
      );

      // No attendance activity that day (weekend/holiday/nothing marked yet) —
      // skip so we don't create a noisy empty report_runs row + notification.
      if (totals.marked === 0) continue;

      await supabase.from("report_runs").insert({
        organization_id: org.id,
        report_type: "daily_attendance_summary",
        run_date: runDate,
        status: "success",
        summary: totals,
      });

      const { data: admins } = await supabase
        .from("organization_members")
        .select("user_id")
        .eq("organization_id", org.id)
        .in("role", ["owner", "admin"]);

      for (const admin of admins ?? []) {
        await createNotification(supabase, {
          organizationId: org.id,
          recipientId: admin.user_id,
          type: "daily_report",
          title: `Daily attendance report for ${runDate}`,
          body: `${totals.present + totals.late} present, ${totals.absent} absent out of ${totals.marked} marked.`,
          link: "/dashboard/reports",
        });
      }

      processed++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error("Daily report cron: failed for organization", { organizationId: org.id, message });
      await supabase.from("report_runs").insert({
        organization_id: org.id,
        report_type: "daily_attendance_summary",
        run_date: runDate,
        status: "failed",
        summary: { error: message },
      });
    }
  }

  return NextResponse.json({ processed, runDate });
}
