"use client";

import { useGoals } from "@/contexts/GoalsContext";
import { GoalCard } from "./GoalCard";
import { PiggyBank, Loader2 } from "lucide-react";
import { CreateGoalButton } from "./CreateGoalButton";

export function GoalsList() {
  const { goals, loading, error } = useGoals();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin mr-2" />
        Loading goals…
      </div>
    );
  }

  if (error) {
    return (
      <div className="card border-red-100 bg-red-50 text-red-600 text-sm">
        Failed to load goals: {error}
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-6">
          <PiggyBank className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-semibold text-surface-900 mb-2">No goals yet</h3>
        <p className="text-slate-500 max-w-xs mb-8">
          Create your first savings goal to start automating your deposits.
        </p>
        <CreateGoalButton />
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-surface-900 mb-4">Your Goals</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}
