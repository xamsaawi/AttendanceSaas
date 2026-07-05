import { DownloadIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { attendanceStatusColors, attendanceStatusLabels, sessionTypeLabels } from "@/lib/attendance/status";
import type { AttendanceSessionType, AttendanceStatus } from "@/types/database";

export type HistoryTableRow = {
  sessionDate: string;
  sessionType: AttendanceSessionType;
  status: AttendanceStatus;
  notes: string | null;
  studentName?: string;
};

export function HistoryTable({
  rows,
  exportHref,
}: {
  rows: HistoryTableRow[];
  exportHref?: string;
}) {
  const showStudentColumn = rows.some((r) => r.studentName !== undefined);

  return (
    <div className="space-y-3">
      {exportHref && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" render={<a href={exportHref} />}>
            <DownloadIcon />
            Export CSV
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Session</TableHead>
            {showStudentColumn && <TableHead>Student</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={`${row.sessionDate}-${row.sessionType}-${row.studentName ?? ""}-${i}`}>
              <TableCell>{row.sessionDate}</TableCell>
              <TableCell>{sessionTypeLabels[row.sessionType]}</TableCell>
              {showStudentColumn && <TableCell>{row.studentName}</TableCell>}
              <TableCell>
                <Badge className={attendanceStatusColors[row.status]} variant="outline">
                  {attendanceStatusLabels[row.status]}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">{row.notes ?? ""}</TableCell>
            </TableRow>
          ))}
          {rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={showStudentColumn ? 5 : 4}
                className="text-muted-foreground text-center"
              >
                No attendance records for this range.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
