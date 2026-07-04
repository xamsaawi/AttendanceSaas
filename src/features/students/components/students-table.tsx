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
import { StudentRowActions } from "@/features/students/components/student-row-actions";
import type { StudentEditData } from "@/features/students/components/student-form-sheet";
import type { StudentStatus } from "@/types/database";

const STATUS_VARIANT: Record<StudentStatus, "default" | "secondary" | "outline"> = {
  active: "default",
  inactive: "secondary",
  graduated: "outline",
  withdrawn: "outline",
};

export type StudentTableRow = StudentEditData & { classLabel: string };

export function StudentsTable({
  rows,
  classOptions,
  isAdmin,
}: {
  rows: StudentTableRow[];
  classOptions: { id: string; label: string }[];
  isAdmin: boolean;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No students found" description="Try adjusting your filters." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead></TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Admission #</TableHead>
          <TableHead>Class</TableHead>
          <TableHead>Status</TableHead>
          {isAdmin && <TableHead className="text-right">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell>
              <Avatar>
                <AvatarImage src={row.photoSignedUrl ?? undefined} alt="" />
                <AvatarFallback>
                  {row.first_name[0]}
                  {row.last_name[0]}
                </AvatarFallback>
              </Avatar>
            </TableCell>
            <TableCell>
              {row.first_name} {row.last_name}
            </TableCell>
            <TableCell>{row.admission_number}</TableCell>
            <TableCell>{row.classLabel}</TableCell>
            <TableCell>
              <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
            </TableCell>
            {isAdmin && (
              <TableCell>
                <StudentRowActions student={row} classOptions={classOptions} />
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
