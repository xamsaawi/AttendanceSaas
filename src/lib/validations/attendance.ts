import { z } from "zod";

export const attendanceStatusSchema = z.enum(["present", "absent", "late", "excused", "half_day"]);
export const sessionTypeSchema = z.enum(["before_break", "after_break"]);

export const markAttendanceSchema = z.object({
  classId: z.string().uuid(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  sessionType: sessionTypeSchema,
  records: z
    .array(
      z.object({
        studentId: z.string().uuid(),
        status: attendanceStatusSchema,
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1, "At least one student is required"),
});

export type MarkAttendanceInput = z.infer<typeof markAttendanceSchema>;

export const lockOverrideSchema = z.object({
  sessionId: z.string().uuid(),
});

export type LockOverrideInput = z.infer<typeof lockOverrideSchema>;

export const sendParentReportSchema = z.object({
  classId: z.string().uuid(),
  sessionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
  sessionType: sessionTypeSchema,
  messageTemplate: z.string().trim().min(1, "Message is required").max(1000),
});

export type SendParentReportInput = z.infer<typeof sendParentReportSchema>;
