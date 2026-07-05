"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { ClassAttendanceComparisonRow } from "@/features/reports/queries";

export function ClassComparisonChart({ data }: { data: ClassAttendanceComparisonRow[] }) {
  if (data.length === 0) {
    return <p className="text-muted-foreground py-8 text-center text-sm">No attendance data yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 40)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          unit="%"
        />
        <YAxis
          type="category"
          dataKey="classLabel"
          tick={{ fontSize: 12, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={140}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            color: "var(--popover-foreground)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            fontSize: 12,
          }}
          formatter={(value) => [`${value}%`, "Attendance"]}
        />
        <Bar
          dataKey="attendancePercentage"
          fill="var(--color-chart-1)"
          radius={[0, 4, 4, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
