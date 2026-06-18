"use client";

/**
 * WalletContext — manages XRPL wallet connection state.
 *
 * Supports:
 *  - GEM Wallet (browser extension) if available
 *  - Manual seed entry (for testnet demos)
 */
import React, { createContext, useContext, useState, useCallback } from "react";

interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      // Try GEM Wallet first (production path)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gemWallet = (window as any).gemWallet;
      if (gemWallet) {
        const response = await gemWallet.getAddress();
        if (response?.result?.address) {
          setAddress(response.result.address);
          return;
        }
      }

      // Crossmark wallet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const crossmark = (window as any).crossmark;
      if (crossmark) {
        const result = await crossmark.signIn();
        if (result?.response?.data?.address) {
          setAddress(result.response.data.address);
          return;
        }
      }

      // Fallback: generate a testnet demo address
      // In production, never auto-generate — always require user wallet
      const { Client, Wallet } = await import("xrpl");
      const client = new Client("wss://s.altnet.rippletest.net:51233");
      await client.connect();
      const { wallet } = await client.fundWallet();
      await client.disconnect();
      setAddress(wallet.address);

      console.warn(
        "[WalletContext] Using auto-generated testnet wallet. For production, connect GEM or Crossmark."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Wallet connection failed");
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setError(null);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        isConnected: !!address,
        isConnecting,
        error,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
}
