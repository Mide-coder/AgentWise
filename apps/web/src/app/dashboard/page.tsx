"use client";

import { GoalsList } from "@/components/goals/GoalsList";
import { WalletGuard } from "@/components/wallet/WalletGuard";
import { CreateGoalButton } from "@/components/goals/CreateGoalButton";
import { DashboardStats } from "@/components/dashboard/DashboardStats";

export default function DashboardPage() {
  return (
    <WalletGuard>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-surface-900">My Savings</h1>
            <p className="text-slate-500 mt-1">Track your goals and automated deposits</p>
          </div>
          <CreateGoalButton />
        </div>
        <DashboardStats />
        <GoalsList />
      </div>
    </WalletGuard>
  );
}
