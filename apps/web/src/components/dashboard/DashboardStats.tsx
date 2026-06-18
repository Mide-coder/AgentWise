"use client";

import { useGoals } from "@/contexts/GoalsContext";
import { Target, TrendingUp, Layers, CheckCircle } from "lucide-react";

export function DashboardStats() {
  const { goals } = useGoals();

  const totalSaved = goals.reduce((sum, g) => sum + g.savedAmount, 0);
  const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
  const activeGoals = goals.filter((g) => g.status === "active").length;
  const completedGoals = goals.filter((g) => g.status === "completed").length;

  const stats = [
    {
      label: "Total Saved",
      value: `${totalSaved.toFixed(2)} RLUSD`,
      icon: TrendingUp,
      color: "text-brand-600 bg-brand-50",
    },
    {
      label: "Total Target",
      value: `${totalTarget.toFixed(2)} RLUSD`,
      icon: Target,
      color: "text-blue-600 bg-blue-50",
    },
    {
      label: "Active Goals",
      value: String(activeGoals),
      icon: Layers,
      color: "text-accent-500 bg-orange-50",
    },
    {
      label: "Completed",
      value: String(completedGoals),
      icon: CheckCircle,
      color: "text-emerald-600 bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="region" aria-label="Dashboard statistics">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="card">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${stat.color}`}>
              <Icon className="w-4.5 h-4.5" aria-hidden="true" />
            </div>
            <div className="text-2xl font-bold text-surface-900 font-mono">{stat.value}</div>
            <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );
}
