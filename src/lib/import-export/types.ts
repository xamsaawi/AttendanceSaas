export type ColumnDef<T> = {
  header: string;
  key: keyof T & string;
};

export type RowValidationResult<T> =
  | { row: number; success: true; data: T }
  | { row: number; success: false; errors: string[] };
