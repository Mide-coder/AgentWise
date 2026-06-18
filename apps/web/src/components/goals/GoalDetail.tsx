"use client";

import { useEffect, useState, useCallback } from "react";
import { useGoals } from "@/contexts/GoalsContext";
import type { SavingsGoal, DepositRecord } from "@agentwise/sdk";
import {
  TrendingUp,
  Zap,
  ArrowLeft,
  Loader2,
  Play,
  CheckCircle,
  Copy,
} from "lucide-react";
import Link from "next/link";
import { clsx } from "clsx";
import { ProgressChart } from "@/components/charts/ProgressChart";

interface GoalDetailProps {
  goalId: string;
}

export function GoalDetail({ goalId }: GoalDetailProps) {
  const { goals, loading, executeDeposit, settleGoal, getDeposits } = useGoals();
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const goal: SavingsGoal | undefined = goals.find((g) => g.id === goalId);

  const loadDeposits = useCallback(async () => {
    setDepositsLoading(true);
    try {
      const data = await getDeposits(goalId);
      setDeposits(data);
    } finally {
      setDepositsLoading(false);
    }
  }, [getDeposits, goalId]);

  useEffect(() => {
    if (goal) void loadDeposits();
  }, [goal, loadDeposits]);

  const handleDeposit = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await executeDeposit(goalId);
      await loadDeposits();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Deposit failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleSettle = async () => {
    setActionLoading(true);
    setActionError(null);
    try {
      await settleGoal(goalId);
      await loadDeposits();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Settlement failed");
    } finally {
      setActionLoading(false);
    }
  };

  const copyAddress = (address: string) => {
    void navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading || !goal) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading goal…
      </div>
    );
  }

  const pct = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  );

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* Goal header */}
      <div className="card">
        <div className="flex items-start justify-between mb-4">
          <div>
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
                <span className="badge bg-yellow-100 text-yellow-700">
                  <Zap className="w-2.5 h-2.5 mr-0.5" aria-hidden="true" />
                  Channel active
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-surface-900">{goal.name}</h1>
            {goal.description && (
              <p className="text-slate-500 mt-1 text-sm">{goal.description}</p>
            )}
          </div>
          <TrendingUp className="w-6 h-6 text-brand-500" aria-hidden="true" />
        </div>

        {/* XRPL address */}
        <button
          onClick={() => copyAddress(goal.xrplAddress)}
          className="flex items-center gap-2 text-xs text-slate-400 bg-slate-50 rounded-xl px-3 py-2 mb-6 hover:bg-slate-100 transition-colors w-full text-left"
          aria-label="Copy XRPL address"
        >
          <span className="font-mono truncate flex-1">{goal.xrplAddress}</span>
          {copied ? (
            <CheckCircle className="w-3.5 h-3.5 text-brand-500 flex-shrink-0" />
          ) : (
            <Copy className="w-3.5 h-3.5 flex-shrink-0" />
          )}
        </button>

        {/* Progress */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div>
            <div className="text-xl font-bold text-surface-900 font-mono">{goal.savedAmount.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Saved (RLUSD)</div>
          </div>
          <div>
            <div className="text-xl font-bold text-surface-900 font-mono">{goal.targetAmount.toFixed(2)}</div>
            <div className="text-xs text-slate-400">Target (RLUSD)</div>
          </div>
          <div>
            <div className="text-xl font-bold text-surface-900">{daysLeft}</div>
            <div className="text-xs text-slate-400">Days left</div>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="h-3 bg-slate-100 rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={clsx("h-full rounded-full transition-all duration-500", {
              "bg-brand-500": pct < 80,
              "bg-emerald-500": pct >= 80,
            })}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="text-right text-xs text-slate-400 mt-1">{pct.toFixed(1)}% complete</div>
      </div>

      {/* Chart */}
      {deposits.length > 0 && <ProgressChart deposits={deposits} goal={goal} />}

      {/* Auto-save rule */}
      {goal.depositRule && (
        <div className="card">
          <h2 className="font-semibold text-surface-900 mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-yellow-500" aria-hidden="true" />
            Auto-Save Rule
          </h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-bold text-surface-900 font-mono">
                {goal.depositRule.amount} RLUSD
                <span className="text-sm text-slate-400 font-normal ml-2">{goal.depositRule.frequency}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">
                Next deposit:{" "}
                {new Date(goal.depositRule.nextDepositAt).toLocaleDateString("en-NG", {
                  dateStyle: "medium",
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => void handleDeposit()}
                disabled={actionLoading || !goal.channelId}
                className="btn-primary text-sm"
                aria-label="Execute deposit now"
              >
                {actionLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Deposit Now
              </button>
              {goal.channelId && (
                <button
                  onClick={() => void handleSettle()}
                  disabled={actionLoading}
                  className="btn-secondary text-sm"
                  aria-label="Settle goal to XRPL"
                >
                  Settle to XRPL
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {actionError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3" role="alert">
          {actionError}
        </div>
      )}

      {/* Deposit history */}
      <div className="card">
        <h2 className="font-semibold text-surface-900 mb-4">Deposit History</h2>
        {depositsLoading ? (
          <div className="flex items-center justify-center py-8 text-slate-400">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            Loading…
          </div>
        ) : deposits.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-8">No deposits yet</p>
        ) : (
          <div className="space-y-2">
            {[...deposits].reverse().map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between py-2.5 border-b border-slate-50 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx("w-2 h-2 rounded-full", {
                      "bg-brand-500": d.type === "off_chain",
                      "bg-emerald-500": d.type === "settlement",
                      "bg-blue-500": d.type === "manual",
                    })}
                    aria-hidden="true"
                  />
                  <div>
                    <div className="text-sm font-medium text-surface-900">
                      {d.type === "off_chain" ? "Off-chain deposit" : d.type === "settlement" ? "Settlement" : "Manual deposit"}
                    </div>
                    <div className="text-xs text-slate-400">
                      {new Date(d.timestamp).toLocaleString("en-NG")}
                    </div>
                  </div>
                </div>
                <div className="text-sm font-mono font-semibold text-surface-900">
                  +{d.amount.toFixed(2)} RLUSD
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
