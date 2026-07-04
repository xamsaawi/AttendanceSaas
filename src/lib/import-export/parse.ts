import ExcelJS from "exceljs";

import type { ColumnDef } from "./types";

export async function parseWorkbook<T>(
  buffer: ArrayBuffer,
  columns: ColumnDef<T>[],
): Promise<Record<string, unknown>[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const headerRow = sheet.getRow(1);
  const columnIndexByKey = new Map<string, number>();

  headerRow.eachCell((cell, colNumber) => {
    const headerText = String(cell.value ?? "").trim().toLowerCase();
    const match = columns.find((c) => c.header.toLowerCase() === headerText);
    if (match) columnIndexByKey.set(match.key, colNumber);
  });

  const rows: Record<string, unknown>[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const isEmpty = row.values == null || (Array.isArray(row.values) && row.values.every((v) => v == null || v === ""));
    if (isEmpty) return;

    const record: Record<string, unknown> = {};
    for (const column of columns) {
      const colIndex = columnIndexByKey.get(column.key);
      if (!colIndex) continue;
      const cell = row.getCell(colIndex);
      const value = cell.value;
      record[column.key] =
        value && typeof value === "object" && "text" in value
          ? (value as { text: string }).text
          : value;
    }
    rows.push(record);
  });

  return rows;
}
