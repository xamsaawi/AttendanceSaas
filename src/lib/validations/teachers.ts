import { z } from "zod";

export const teacherInviteSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  staffId: z.string().optional(),
  phone: z.string().optional(),
  subjects: z.string().optional(),
  qualification: z.string().optional(),
  hireDate: z.string().optional(),
});

export type TeacherInviteInput = z.infer<typeof teacherInviteSchema>;

export const teacherProfileSchema = z.object({
  staffId: z.string().optional(),
  phone: z.string().optional(),
  subjects: z.string().optional(),
  qualification: z.string().optional(),
  hireDate: z.string().optional(),
});

export type TeacherProfileInput = z.infer<typeof teacherProfileSchema>;
