import { z } from "zod";

const timeSchema = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM format");

export const schoolSettingsSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  timezone: z.string().min(1, "Timezone is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  contactEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
  workingDays: z
    .array(z.coerce.number().int().min(1).max(7))
    .min(1, "Select at least one working day"),
  beforeBreakCutoff: timeSchema,
  afterBreakCutoff: timeSchema,
  attendanceLockGraceHours: z.coerce.number().int().min(0),
});

export type SchoolSettingsInput = z.infer<typeof schoolSettingsSchema>;
