import * as PdfPrinterImport from "pdfmake/js/Printer.js";

import type { ColumnDef } from "./types";

// pdfmake's server-side Printer is CJS (`exports.default = PdfPrinter`) with no
// official server-side type declarations (@types/pdfmake only covers the
// browser API). Depending on how the bundler applies CJS/ESM interop, the
// class ends up at .default or .default.default — unwrap defensively rather
// than assume one level.
const maybeDefault = (PdfPrinterImport as unknown as { default?: unknown }).default;
const PdfPrinter = ((maybeDefault as { default?: unknown } | undefined)?.default ??
  maybeDefault ??
  PdfPrinterImport) as new (
  fontDescriptors: unknown,
  virtualfs?: unknown,
  urlResolver?: unknown,
) => {
  createPdfKitDocument(docDefinition: unknown): Promise<NodeJS.ReadableStream & { end(): void }>;
};

const FONTS = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique",
  },
};

// pdfmake always tries to run font paths through a urlResolver, even for the
// built-in standard fonts referenced by name — a no-op resolver keeps it from
// throwing when there's nothing to actually resolve.
const NOOP_URL_RESOLVER = {
  resolve: (url: string) => url,
  resolved: () => Promise.resolve(),
};

export async function buildPdf<T extends Record<string, unknown>>(
  rows: T[],
  columns: ColumnDef<T>[],
  title: string,
): Promise<Buffer> {
  const printer = new PdfPrinter(FONTS, undefined, NOOP_URL_RESOLVER);

  const docDefinition = {
    defaultStyle: { font: "Helvetica", fontSize: 9 },
    pageOrientation: columns.length > 5 ? "landscape" : "portrait",
    content: [
      { text: title, style: "header" },
      {
        table: {
          headerRows: 1,
          widths: columns.map(() => "*"),
          body: [
            columns.map((c) => ({ text: c.header, bold: true })),
            ...rows.map((row) => columns.map((c) => String(row[c.key] ?? ""))),
          ],
        },
      },
    ],
    styles: { header: { fontSize: 16, bold: true, margin: [0, 0, 0, 12] } },
  };

  const doc = await printer.createPdfKitDocument(docDefinition);

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });
}
