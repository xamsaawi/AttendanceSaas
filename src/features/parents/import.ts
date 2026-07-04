import { z } from "zod";

import type { ColumnDef } from "@/lib/import-export/types";
import { relationshipValues } from "@/lib/validations/guardians";

const toTrimmedString = (value: unknown) => (value == null ? "" : String(value).trim());
const toOptionalString = (value: unknown) => {
  const str = toTrimmedString(value);
  return str === "" ? undefined : str;
};

export type GuardianImportRow = {
  fullName: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  studentAdmissionNumber?: string;
  relationship?: string;
};

export const guardianImportColumns: ColumnDef<GuardianImportRow>[] = [
  { header: "Full Name", key: "fullName" },
  { header: "Phone", key: "phone" },
  { header: "Email", key: "email" },
  { header: "Address", key: "address" },
  { header: "Notes", key: "notes" },
  { header: "Student Admission Number", key: "studentAdmissionNumber" },
  { header: "Relationship", key: "relationship" },
];

export const guardianImportRowSchema = z.object({
  fullName: z.preprocess(toTrimmedString, z.string().min(1, "Name is required")),
  phone: z.preprocess(toOptionalString, z.string().optional()),
  email: z.preprocess(toOptionalString, z.string().email("Enter a valid email").optional()),
  address: z.preprocess(toOptionalString, z.string().optional()),
  notes: z.preprocess(toOptionalString, z.string().optional()),
  studentAdmissionNumber: z.preprocess(toOptionalString, z.string().optional()),
  relationship: z.preprocess(
    (v) => toOptionalString(v)?.toLowerCase(),
    z.enum(relationshipValues).optional(),
  ),
});
