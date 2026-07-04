import { z } from "zod";

export const schoolSettingsSchema = z.object({
  name: z.string().min(2, "School name must be at least 2 characters"),
  timezone: z.string().min(1, "Timezone is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  contactEmail: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

export type SchoolSettingsInput = z.infer<typeof schoolSettingsSchema>;
