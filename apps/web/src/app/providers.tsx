"use client";

import React from "react";
import { WalletProvider } from "@/contexts/WalletContext";
import { GoalsProvider } from "@/contexts/GoalsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <GoalsProvider>{children}</GoalsProvider>
    </WalletProvider>
  );
}
