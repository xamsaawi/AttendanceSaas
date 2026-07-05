import type { ColumnDef } from "./types";

function escapeCsvField(value: unknown): string {
  const str = value == null ? "" : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: ColumnDef<T>[],
): Buffer {
  const lines = [columns.map((c) => escapeCsvField(c.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((c) => escapeCsvField(row[c.key])).join(","));
  }
  return Buffer.from(lines.join("\r\n"), "utf-8");
}
