"use client";

import type { RosterStudent } from "@/features/attendance/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { attendanceStatusOptions } from "@/lib/attendance/status";
import type { AttendanceStatus } from "@/types/database";

export type RosterEditValue = { status: AttendanceStatus; notes: string };

export function RosterTable({
  students,
  values,
  onChange,
  onMarkAllPresent,
  disabled,
}: {
  students: RosterStudent[];
  values: Record<string, RosterEditValue>;
  onChange: (studentId: string, patch: Partial<RosterEditValue>) => void;
  onMarkAllPresent: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {students.length} student{students.length === 1 ? "" : "s"}
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onMarkAllPresent}
          disabled={disabled}
        >
          Mark all present
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Admission #</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {students.map((student) => {
            const value = values[student.id] ?? { status: "present" as AttendanceStatus, notes: "" };
            return (
              <TableRow key={student.id}>
                <TableCell className="font-medium">{student.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{student.admissionNumber}</TableCell>
                <TableCell>
                  <Select
                    value={value.status}
                    onValueChange={(status) =>
                      onChange(student.id, { status: status as AttendanceStatus })
                    }
                    disabled={disabled}
                  >
                    <SelectTrigger size="sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {attendanceStatusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Input
                    value={value.notes}
                    onChange={(e) => onChange(student.id, { notes: e.target.value })}
                    placeholder="Optional note"
                    disabled={disabled}
                    className="min-w-40"
                  />
                </TableCell>
              </TableRow>
            );
          })}
          {students.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-muted-foreground text-center">
                No active students in this class.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
