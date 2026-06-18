"use client";

import { useParams } from "next/navigation";
import { WalletGuard } from "@/components/wallet/WalletGuard";
import { GoalDetail } from "@/components/goals/GoalDetail";

export default function GoalDetailPage() {
  const params = useParams();
  const goalId = params.id as string;

  return (
    <WalletGuard>
      <GoalDetail goalId={goalId} />
    </WalletGuard>
  );
}
