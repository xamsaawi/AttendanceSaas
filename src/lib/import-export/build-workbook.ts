import ExcelJS from "exceljs";

import type { ColumnDef } from "./types";

export async function buildWorkbook<T extends Record<string, unknown>>(
  rows: T[],
  columns: ColumnDef<T>[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Data");

  sheet.columns = columns.map((column) => ({ header: column.header, key: column.key }));
  for (const row of rows) sheet.addRow(row);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}
