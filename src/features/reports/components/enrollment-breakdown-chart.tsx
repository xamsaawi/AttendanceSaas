"use client";

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from "recharts";
import { ResponsiveContainer } from "recharts";

import type { EnrollmentBreakdown } from "@/features/reports/queries";

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  graduated: "Graduated",
  withdrawn: "Withdrawn",
};

// Fixed categorical order/colors (never cycled) — matches the status key order,
// not sorted by count, so a given status always maps to the same color.
const STATUS_COLORS: Record<string, string> = {
  active: "var(--color-chart-1)",
  inactive: "var(--color-chart-2)",
  graduated: "var(--color-chart-3)",
  withdrawn: "var(--color-chart-4)",
};

export function EnrollmentBreakdownChart({ data }: { data: EnrollmentBreakdown }) {
  const rows = data.byStatus
    .map((row) => ({
      status: row.status,
      label: STATUS_LABELS[row.status] ?? row.status,
      count: row.count,
    }))
    .sort(
      (a, b) =>
        Object.keys(STATUS_LABELS).indexOf(a.status) - Object.keys(STATUS_LABELS).indexOf(b.status),
    );

  if (rows.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">No students yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={rows} margin={{ top: 20, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis hide allowDecimals={false} />
        <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {rows.map((row) => (
            <Cell key={row.status} fill={STATUS_COLORS[row.status] ?? "var(--color-chart-5)"} />
          ))}
          <LabelList dataKey="count" position="top" style={{ fill: "var(--foreground)", fontSize: 12 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
