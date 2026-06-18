"use client";

import type { SavingsGoal, DepositRecord } from "@agentwise/sdk";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface ProgressChartProps {
  deposits: DepositRecord[];
  goal: SavingsGoal;
}

export function ProgressChart({ deposits, goal }: ProgressChartProps) {
  // Build cumulative savings series
  let cumulative = 0;
  const data = deposits.map((d) => {
    cumulative += d.amount;
    return {
      date: new Date(d.timestamp).toLocaleDateString("en-NG", { month: "short", day: "numeric" }),
      saved: parseFloat(cumulative.toFixed(2)),
    };
  });

  return (
    <div className="card">
      <h2 className="font-semibold text-surface-900 mb-4">Savings Progress</h2>
      <div className="h-48" role="img" aria-label="Savings progress chart">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="savedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={40}
            />
            <Tooltip
              formatter={(value: number) => [`${value} RLUSD`, "Saved"]}
              contentStyle={{
                borderRadius: "0.75rem",
                border: "1px solid #f1f5f9",
                fontSize: "12px",
              }}
            />
            <ReferenceLine
              y={goal.targetAmount}
              stroke="#22c55e"
              strokeDasharray="4 4"
              label={{ value: "Target", position: "right", fontSize: 10, fill: "#16a34a" }}
            />
            <Area
              type="monotone"
              dataKey="saved"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#savedGradient)"
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
