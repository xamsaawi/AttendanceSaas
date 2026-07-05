// pdfmake ships no type declarations for its server-side Printer (only
// @types/pdfmake, which covers the browser API). See build-pdf.ts for the
// defensive unwrap this requires.
declare module "pdfmake/js/Printer.js";
