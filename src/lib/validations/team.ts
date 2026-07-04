import { z } from "zod";

export const inviteTeacherSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
});

export type InviteTeacherInput = z.infer<typeof inviteTeacherSchema>;

export const updateMemberRoleSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["owner", "admin", "teacher"]),
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;
