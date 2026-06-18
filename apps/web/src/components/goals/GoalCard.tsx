"use client";

import Link from "next/link";
import type { SavingsGoal } from "@agentwise/sdk";
import { clsx } from "clsx";
import { ArrowRight, Zap } from "lucide-react";

interface GoalCardProps {
  goal: SavingsGoal;
}

export function GoalCard({ goal }: GoalCardProps) {
  const pct = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Link
      href={`/dashboard/goals/${goal.id}`}
      className="card hover:shadow-md hover:border-brand-100 transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={clsx("badge", {
                "badge-active": goal.status === "active",
                "badge-completed": goal.status === "completed",
                "badge-paused": goal.status === "paused",
              })}
            >
              {goal.status}
            </span>
            {goal.channelId && (
              <span className="badge bg-yellow-100 text-yellow-700" title="State channel open">
                <Zap className="w-2.5 h-2.5 mr-0.5" />
                Channel open
              </span>
            )}
          </div>
          <h3 className="font-semibold text-surface-900 truncate">{goal.name}</h3>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 transition-colors flex-shrink-0 mt-1" />
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{pct.toFixed(0)}% saved</span>
          <span>{daysLeft} days left</span>
        </div>
        <div
          className="h-2 bg-slate-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${goal.name} progress`}
        >
          <div
            className={clsx("h-full rounded-full transition-all", {
              "bg-brand-500": pct < 80,
              "bg-emerald-500": pct >= 80,
            })}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Amounts */}
      <div className="flex justify-between items-end">
        <div>
          <div className="text-lg font-bold text-surface-900 font-mono">
            {goal.savedAmount.toFixed(2)}
            <span className="text-xs text-slate-400 font-normal ml-1">RLUSD</span>
          </div>
          <div className="text-xs text-slate-400">
            of {goal.targetAmount.toFixed(2)} RLUSD target
          </div>
        </div>
        {goal.depositRule && (
          <div className="text-right">
            <div className="text-xs font-medium text-brand-600">
              {goal.depositRule.amount} RLUSD {goal.depositRule.frequency}
            </div>
            <div className="text-xs text-slate-400">auto-save</div>
          </div>
        )}
      </div>
    </Link>
  );
}
