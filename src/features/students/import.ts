import { z } from "zod";

import type { ColumnDef } from "@/lib/import-export/types";
import { studentStatusValues } from "@/lib/validations/students";

const toTrimmedString = (value: unknown) => (value == null ? "" : String(value).trim());
const toOptionalString = (value: unknown) => {
  const str = toTrimmedString(value);
  return str === "" ? undefined : str;
};
const toDateString = (value: unknown) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return toTrimmedString(value);
};

export type StudentImportRow = {
  admissionNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: string;
  className?: string;
  status: string;
  enrollmentDate: string;
  address?: string;
  notes?: string;
};

export const studentImportColumns: ColumnDef<StudentImportRow>[] = [
  { header: "Admission Number", key: "admissionNumber" },
  { header: "First Name", key: "firstName" },
  { header: "Last Name", key: "lastName" },
  { header: "Date Of Birth", key: "dateOfBirth" },
  { header: "Gender", key: "gender" },
  { header: "Class", key: "className" },
  { header: "Status", key: "status" },
  { header: "Enrollment Date", key: "enrollmentDate" },
  { header: "Address", key: "address" },
  { header: "Notes", key: "notes" },
];

export const studentImportRowSchema = z.object({
  admissionNumber: z.preprocess(toTrimmedString, z.string().min(1, "Admission number is required")),
  firstName: z.preprocess(toTrimmedString, z.string().min(1, "First name is required")),
  lastName: z.preprocess(toTrimmedString, z.string().min(1, "Last name is required")),
  dateOfBirth: z.preprocess(toDateString, z.string().optional()),
  gender: z.preprocess(toOptionalString, z.enum(["male", "female", "other"]).optional()),
  className: z.preprocess(toOptionalString, z.string().optional()),
  status: z.preprocess(
    (v) => toTrimmedString(v).toLowerCase() || "active",
    z.enum(studentStatusValues),
  ),
  enrollmentDate: z.preprocess(
    (v) => toDateString(v) || new Date().toISOString().slice(0, 10),
    z.string(),
  ),
  address: z.preprocess(toOptionalString, z.string().optional()),
  notes: z.preprocess(toOptionalString, z.string().optional()),
});
