import { z } from "zod";

export const studentStatusValues = ["active", "inactive", "graduated", "withdrawn"] as const;

export const studentSchema = z.object({
  admissionNumber: z.string().min(1, "Admission number is required"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "other"]).optional(),
  classId: z.string().uuid().optional(),
  status: z.enum(studentStatusValues),
  enrollmentDate: z.string().min(1, "Enrollment date is required"),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type StudentInput = z.infer<typeof studentSchema>;
