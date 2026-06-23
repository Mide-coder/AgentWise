"use client";

import { useState } from "react";
import { useGoals } from "@/contexts/GoalsContext";
import { useWallet } from "@/contexts/WalletContext";
import { X, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

const GOAL_PRESETS = [
  { name: "Emergency Fund", label: "Emergency Fund", emoji: "🛡️" },
  { name: "Travel",         label: "Travel",         emoji: "✈️" },
  { name: "Education",      label: "Education",      emoji: "📚" },
  { name: "Business",       label: "Business",       emoji: "💼" },
  { name: "Rent",           label: "Rent",           emoji: "🏠" },
  { name: "Custom",         label: "Custom",         emoji: "✏️" },
];

interface CreateGoalModalProps {
  onClose: () => void;
}

export function CreateGoalModal({ onClose }: CreateGoalModalProps) {
  const { createGoal, openChannel, setDepositRule } = useGoals();
  const { address } = useWallet();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Goal details
  const [selectedPreset, setSelectedPreset] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");

  // Step 2: Deposit rule
  const [depositAmount, setDepositAmount] = useState("1");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("daily");
  const [fundingAmount, setFundingAmount] = useState("10");

  const [createdGoalId, setCreatedGoalId] = useState<string | null>(null);

  const handlePresetSelect = (preset: string) => {
    setSelectedPreset(preset);
    if (preset !== "Custom") setName(preset);
    else setName("");
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      // Create goal
      const goal = await createGoal({
        name,
        description: description || undefined,
        targetAmount: parseFloat(targetAmount),
        deadline: new Date(deadline).toISOString(),
      });

      setCreatedGoalId(goal.id);

      // Open state channel
      if (address) {
        await openChannel(goal.id, address, parseFloat(fundingAmount));
      }

      // Set deposit rule
      await setDepositRule(goal.id, {
        amount: parseFloat(depositAmount),
        frequency,
      });

      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    onClose();
    if (createdGoalId) router.push(`/dashboard/goals/${createdGoalId}`);
  };

  // Min deadline = tomorrow
  const minDeadline = new Date();
  minDeadline.setDate(minDeadline.getDate() + 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Create savings goal"
    >
      <div className="bg-white dark:bg-surface-800 rounded-3xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-700">
          <div>
            <h2 className="font-bold text-surface-900 dark:text-slate-100">Create a savings goal</h2>
            <p className="text-xs text-slate-400 mt-0.5">Step {step} of 3</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Goal details */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="p-6 space-y-5">
            {/* Presets */}
            <div>
              <label className="label">Goal type</label>
              <div className="grid grid-cols-3 gap-2">
                {GOAL_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handlePresetSelect(preset.name)}
                    className={`rounded-xl border py-2 px-3 text-xs font-medium transition-all text-center ${
                      selectedPreset === preset.name
                        ? "border-brand-500 bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
                        : "border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 dark:text-slate-300"
                    }`}
                  >
                    <span className="block text-xl mb-1" role="img" aria-label={preset.name}>
                      {preset.emoji}
                    </span>
                    <span className="block">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="goal-name" className="label">Goal name</label>
              <input
                id="goal-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={60}
                required
                placeholder="e.g. Lagos Trip Fund"
              />
            </div>

            <div>
              <label htmlFor="goal-desc" className="label">Description (optional)</label>
              <input
                id="goal-desc"
                className="input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={240}
                placeholder="What are you saving for?"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="target-amount" className="label">Target (RLUSD)</label>
                <input
                  id="target-amount"
                  type="number"
                  className="input"
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                  placeholder="500"
                />
              </div>
              <div>
                <label htmlFor="deadline" className="label">Deadline</label>
                <input
                  id="deadline"
                  type="date"
                  className="input"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={minDeadline.toISOString().split("T")[0]}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn-primary w-full">
              Continue → Auto-Save Setup
            </button>
          </form>
        )}

        {/* Step 2: Deposit rule */}
        {step === 2 && (
          <form onSubmit={(e) => void handleStep2(e)} className="p-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="deposit-amount" className="label">Deposit amount (RLUSD)</label>
                <input
                  id="deposit-amount"
                  type="number"
                  className="input"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  min="0.01"
                  max="10000"
                  step="0.01"
                  required
                />
              </div>
              <div>
                <label htmlFor="frequency" className="label">Frequency</label>
                <select
                  id="frequency"
                  className="input"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="funding" className="label">Initial channel funding (RLUSD)</label>
              <input
                id="funding"
                type="number"
                className="input"
                value={fundingAmount}
                onChange={(e) => setFundingAmount(e.target.value)}
                min="0.01"
                step="0.01"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                This funds the Yellow state channel for off-chain deposits. You can top up anytime.
              </p>
            </div>

            {error && (
              <div
                className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl px-4 py-3"
                role="alert"
              >
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-secondary flex-1"
                disabled={submitting}
              >
                Back
              </button>
              <button type="submit" className="btn-primary flex-1" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Setting up…
                  </>
                ) : (
                  "Start Auto-Save"
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="p-6 text-center">
            <div className="text-5xl mb-4">🎉</div>
            <h3 className="text-lg font-bold text-surface-900 mb-2">Goal created!</h3>
            <p className="text-slate-500 text-sm mb-6">
              Your savings goal is active. Recurring {depositAmount} RLUSD {frequency} deposits will
              run automatically through a Yellow state channel.
            </p>
            <button onClick={handleDone} className="btn-primary w-full">
              View Goal Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
