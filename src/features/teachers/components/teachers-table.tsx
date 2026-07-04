import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TeacherRowActions } from "@/features/teachers/components/teacher-row-actions";
import type { TeacherRow } from "@/features/teachers/queries";

export function TeachersTable({ teachers, isAdmin }: { teachers: TeacherRow[]; isAdmin: boolean }) {
  if (teachers.length === 0) {
    return (
      <EmptyState
        title="No teachers yet"
        description="Invite a teacher to get started."
      />
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead></TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Staff ID</TableHead>
          <TableHead>Subjects</TableHead>
          {isAdmin && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {teachers.map((teacher) => (
          <TableRow key={teacher.userId}>
            <TableCell>
              <Avatar>
                <AvatarImage src={teacher.photoSignedUrl ?? undefined} alt="" />
                <AvatarFallback>{(teacher.fullName ?? "?")[0]}</AvatarFallback>
              </Avatar>
            </TableCell>
            <TableCell>{teacher.fullName ?? "—"}</TableCell>
            <TableCell>{teacher.email ?? "—"}</TableCell>
            <TableCell>{teacher.staffId ?? "—"}</TableCell>
            <TableCell className="space-x-1">
              {teacher.subjects.length === 0
                ? "—"
                : teacher.subjects.map((subject) => (
                    <Badge key={subject} variant="outline">
                      {subject}
                    </Badge>
                  ))}
            </TableCell>
            {isAdmin && (
              <TableCell>
                <TeacherRowActions teacher={teacher} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
