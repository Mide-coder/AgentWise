"use client";

import { useWallet } from "@/contexts/WalletContext";
import { Wallet, LogOut, Loader2 } from "lucide-react";

export function ConnectWalletButton() {
  const { address, isConnected, isConnecting, connect, disconnect } = useWallet();

  if (isConnecting) {
    return (
      <button disabled className="btn-secondary text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Connecting…
      </button>
    );
  }

  if (isConnected && address) {
    const short = `${address.slice(0, 6)}…${address.slice(-4)}`;
    return (
      <div className="flex items-center gap-2">
        <span className="hidden sm:flex items-center gap-1.5 text-sm text-brand-700 bg-brand-50 border border-brand-100 px-3 py-1.5 rounded-xl font-mono">
          <span className="w-2 h-2 rounded-full bg-brand-500" aria-hidden="true" />
          {short}
        </span>
        <button
          onClick={disconnect}
          className="btn-secondary text-sm !px-3 !py-2"
          aria-label="Disconnect wallet"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => void connect()} className="btn-primary text-sm">
      <Wallet className="w-4 h-4" />
      Connect Wallet
    </button>
  );
}
