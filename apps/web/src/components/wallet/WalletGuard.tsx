"use client";

import { useWallet } from "@/contexts/WalletContext";
import { ConnectWalletButton } from "./ConnectWalletButton";
import { ShieldCheck } from "lucide-react";

export function WalletGuard({ children }: { children: React.ReactNode }) {
  const { isConnected } = useWallet();

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center mb-6">
          <ShieldCheck className="w-8 h-8 text-brand-600" />
        </div>
        <h2 className="text-xl font-semibold text-surface-900 mb-2">Connect your wallet</h2>
        <p className="text-slate-500 max-w-xs mb-8">
          AgentWise is non-custodial. Connect your XRPL wallet to access your savings goals.
        </p>
        <ConnectWalletButton />
      </div>
    );
  }

  return <>{children}</>;
}
