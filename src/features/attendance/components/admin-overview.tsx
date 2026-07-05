import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AdminOverviewRow, AdminOverviewStatus } from "@/features/attendance/queries";

const STATUS_LABELS: Record<AdminOverviewStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  complete: "Complete",
};

const STATUS_VARIANTS: Record<AdminOverviewStatus, "outline" | "secondary" | "default"> = {
  not_started: "outline",
  in_progress: "secondary",
  complete: "default",
};

export function AdminOverview({
  rows,
  classLabelById,
  teacherNameById,
  buildDrilldownHref,
}: {
  rows: AdminOverviewRow[];
  classLabelById: Map<string, string>;
  teacherNameById: Map<string, string>;
  buildDrilldownHref: (classId: string) => string;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Class</TableHead>
          <TableHead>Homeroom teacher</TableHead>
          <TableHead>Marked</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Lock</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.classId}>
            <TableCell className="font-medium">
              <Link href={buildDrilldownHref(row.classId)} className="hover:underline">
                {classLabelById.get(row.classId) ?? "—"}
              </Link>
            </TableCell>
            <TableCell className="text-muted-foreground">
              {row.homeroomTeacherId ? (teacherNameById.get(row.homeroomTeacherId) ?? "—") : "—"}
            </TableCell>
            <TableCell>
              {row.markedCount}/{row.totalStudents}
            </TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANTS[row.status]}>{STATUS_LABELS[row.status]}</Badge>
            </TableCell>
            <TableCell>
              {row.isLocked ? (
                <Badge variant="destructive">Locked</Badge>
              ) : (
                <Badge variant="outline">Open</Badge>
              )}
            </TableCell>
          </TableRow>
        ))}
        {rows.length === 0 && (
          <TableRow>
            <TableCell colSpan={5} className="text-muted-foreground text-center">
              No classes found.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );
}
