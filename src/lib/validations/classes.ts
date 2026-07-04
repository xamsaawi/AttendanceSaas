import { z } from "zod";

export const gradeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  sortOrder: z.coerce.number().int(),
});

export type GradeInput = z.infer<typeof gradeSchema>;

export const sectionSchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export type SectionInput = z.infer<typeof sectionSchema>;

export const classSchema = z.object({
  academicYearId: z.string().uuid("Academic year is required"),
  gradeId: z.string().uuid("Grade is required"),
  sectionId: z.string().uuid("Section is required"),
  homeroomTeacherId: z.string().uuid().optional(),
  capacity: z.coerce.number().int().positive().optional(),
});

export type ClassInput = z.infer<typeof classSchema>;
