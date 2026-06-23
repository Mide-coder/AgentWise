"use client";

import React from "react";
import { ThemeProvider } from "next-themes";
import { WalletProvider } from "@/contexts/WalletContext";
import { GoalsProvider } from "@/contexts/GoalsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <WalletProvider>
        <GoalsProvider>{children}</GoalsProvider>
      </WalletProvider>
    </ThemeProvider>
  );
}
