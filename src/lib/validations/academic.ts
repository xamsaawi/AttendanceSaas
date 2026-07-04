import { z } from "zod";

const dateRangeRefinement = <T extends { startDate: string; endDate: string }>(data: T) =>
  data.endDate > data.startDate;

export const academicYearSchema = z
  .object({
    name: z.string().min(2, "Name is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    isCurrent: z.boolean(),
  })
  .refine(dateRangeRefinement, { message: "End date must be after start date", path: ["endDate"] });

export type AcademicYearInput = z.infer<typeof academicYearSchema>;

export const termSchema = z
  .object({
    academicYearId: z.string().uuid(),
    name: z.string().min(1, "Name is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine(dateRangeRefinement, { message: "End date must be after start date", path: ["endDate"] });

export type TermInput = z.infer<typeof termSchema>;

export const holidaySchema = z
  .object({
    academicYearId: z.string().uuid().optional(),
    name: z.string().min(1, "Name is required"),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export type HolidayInput = z.infer<typeof holidaySchema>;
