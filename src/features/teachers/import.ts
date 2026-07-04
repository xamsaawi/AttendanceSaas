import { z } from "zod";

import type { ColumnDef } from "@/lib/import-export/types";

const toTrimmedString = (value: unknown) => (value == null ? "" : String(value).trim());
const toOptionalString = (value: unknown) => {
  const str = toTrimmedString(value);
  return str === "" ? undefined : str;
};
const toDateString = (value: unknown) => {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return toTrimmedString(value);
};

export const TEACHER_IMPORT_BATCH_LIMIT = 50;

export type TeacherImportRow = {
  fullName: string;
  email: string;
  staffId?: string;
  phone?: string;
  subjects?: string;
  qualification?: string;
  hireDate?: string;
};

export const teacherImportColumns: ColumnDef<TeacherImportRow>[] = [
  { header: "Full Name", key: "fullName" },
  { header: "Email", key: "email" },
  { header: "Staff ID", key: "staffId" },
  { header: "Phone", key: "phone" },
  { header: "Subjects", key: "subjects" },
  { header: "Qualification", key: "qualification" },
  { header: "Hire Date", key: "hireDate" },
];

export const teacherImportRowSchema = z.object({
  fullName: z.preprocess(toTrimmedString, z.string().min(2, "Full name is required")),
  email: z.preprocess(toTrimmedString, z.string().email("Enter a valid email")),
  staffId: z.preprocess(toOptionalString, z.string().optional()),
  phone: z.preprocess(toOptionalString, z.string().optional()),
  subjects: z.preprocess(toOptionalString, z.string().optional()),
  qualification: z.preprocess(toOptionalString, z.string().optional()),
  hireDate: z.preprocess(toDateString, z.string().optional()),
});
