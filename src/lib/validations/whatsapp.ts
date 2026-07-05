import { z } from "zod";

// "none" is a form-layer sentinel for "no provider selected yet" — the
// server action maps it to a null `provider` column.
export const whatsappSettingsSchema = z.object({
  provider: z.enum(["twilio", "none"]),
  accountSid: z.string().trim().max(200).optional(),
  phoneNumberId: z.string().trim().max(200).optional(),
  accessToken: z.string().trim().max(500).optional(),
  isEnabled: z.boolean(),
});

export type WhatsappSettingsInput = z.infer<typeof whatsappSettingsSchema>;
