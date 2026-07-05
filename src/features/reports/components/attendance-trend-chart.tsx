"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AttendanceTrendPoint } from "@/features/reports/queries";

export function AttendanceTrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  if (data.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">No attendance data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={36}
          unit="%"
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            fontSize: 12,
          }}
          formatter={(value) => [`${value}%`, "Present rate"]}
        />
        <Line
          type="monotone"
          dataKey="presentRate"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          dot={false}
          connectNulls
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
