import type { ZodType } from "zod";

import type { RowValidationResult } from "./types";

export function validateRows<T>(
  rows: Record<string, unknown>[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- schemas use z.preprocess, whose Input type differs from Output
  schema: ZodType<T, any, any>,
): RowValidationResult<T>[] {
  return rows.map((row, index) => {
    const parsed = schema.safeParse(row);
    const rowNumber = index + 2; // +1 for header row, +1 for 1-indexing

    if (parsed.success) {
      return { row: rowNumber, success: true, data: parsed.data };
    }

    return {
      row: rowNumber,
      success: false,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`),
    };
  });
}
