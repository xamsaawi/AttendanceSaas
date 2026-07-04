import { z } from "zod";

export const guardianSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  notes: z.string().optional(),
});

export type GuardianInput = z.infer<typeof guardianSchema>;

export const relationshipValues = [
  "mother",
  "father",
  "guardian",
  "grandparent",
  "sibling",
  "other",
] as const;

export const studentGuardianLinkSchema = z.object({
  studentId: z.string().uuid("Select a student"),
  relationship: z.enum(relationshipValues),
  isPrimary: z.boolean(),
});

export type StudentGuardianLinkInput = z.infer<typeof studentGuardianLinkSchema>;
