"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { SavingsGoal, DepositRecord } from "@agentwise/sdk";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

interface GoalsState {
  goals: SavingsGoal[];
  loading: boolean;
  error: string | null;
  refreshGoals: () => Promise<void>;
  createGoal: (params: {
    name: string;
    description?: string;
    targetAmount: number;
    deadline: string;
  }) => Promise<SavingsGoal>;
  openChannel: (goalId: string, participantAddress: string, fundingAmount: number) => Promise<void>;
  setDepositRule: (goalId: string, rule: { amount: number; frequency: string }) => Promise<void>;
  executeDeposit: (goalId: string) => Promise<DepositRecord>;
  settleGoal: (goalId: string) => Promise<DepositRecord>;
  getDeposits: (goalId: string) => Promise<DepositRecord[]>;
}

const GoalsContext = createContext<GoalsState | null>(null);

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<SavingsGoal[]>("/api/goals");
      setGoals(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshGoals();
  }, [refreshGoals]);

  const createGoal = useCallback(
    async (params: { name: string; description?: string; targetAmount: number; deadline: string }) => {
      const goal = await apiFetch<SavingsGoal>("/api/goals", {
        method: "POST",
        body: JSON.stringify(params),
      });
      setGoals((prev) => [...prev, goal]);
      return goal;
    },
    []
  );

  const openChannel = useCallback(
    async (goalId: string, participantAddress: string, fundingAmount: number) => {
      await apiFetch("/api/channels/open", {
        method: "POST",
        body: JSON.stringify({ goalId, participantAddress, fundingAmount }),
      });
      await refreshGoals();
    },
    [refreshGoals]
  );

  const setDepositRule = useCallback(
    async (goalId: string, rule: { amount: number; frequency: string }) => {
      await apiFetch(`/api/goals/${goalId}/deposit-rule`, {
        method: "POST",
        body: JSON.stringify({ ...rule, active: true }),
      });
      await refreshGoals();
    },
    [refreshGoals]
  );

  const executeDeposit = useCallback(async (goalId: string) => {
    const record = await apiFetch<DepositRecord>(`/api/goals/${goalId}/deposit`, {
      method: "POST",
    });
    await refreshGoals();
    return record;
  }, [refreshGoals]);

  const settleGoal = useCallback(async (goalId: string) => {
    const record = await apiFetch<DepositRecord>(`/api/goals/${goalId}/settle`, {
      method: "POST",
    });
    await refreshGoals();
    return record;
  }, [refreshGoals]);

  const getDeposits = useCallback(async (goalId: string) => {
    return apiFetch<DepositRecord[]>(`/api/goals/${goalId}/deposits`);
  }, []);

  return (
    <GoalsContext.Provider
      value={{
        goals,
        loading,
        error,
        refreshGoals,
        createGoal,
        openChannel,
        setDepositRule,
        executeDeposit,
        settleGoal,
        getDeposits,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals(): GoalsState {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error("useGoals must be used within GoalsProvider");
  return ctx;
}
