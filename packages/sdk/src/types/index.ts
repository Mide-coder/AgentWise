/**
 * Core AgentWise domain types.
 * All monetary amounts are in RLUSD (6 decimal precision).
 */

// ── Goal ──────────────────────────────────────────────────────────────────────

export type GoalStatus = "active" | "completed" | "paused" | "cancelled";

export interface SavingsGoal {
  /** Unique identifier (UUID v4) */
  id: string;
  /** Human-readable name (1–60 characters) */
  name: string;
  /** Optional description (max 240 characters) */
  description?: string;
  /** Target amount in RLUSD */
  targetAmount: number;
  /** Current saved amount in RLUSD */
  savedAmount: number;
  /** ISO 8601 deadline date */
  deadline: string;
  /** XRPL goal account address */
  xrplAddress: string;
  /** Yellow state channel ID, if open */
  channelId?: string;
  status: GoalStatus;
  /** Recurring deposit rule, if configured */
  depositRule?: RecurringDepositRule;
  /** XRPL Hook IDs attached to this goal */
  hookIds: string[];
  createdAt: string;
  updatedAt: string;
}

// ── Deposit Rule ──────────────────────────────────────────────────────────────

export type DepositFrequency = "hourly" | "daily" | "weekly" | "monthly";

export interface RecurringDepositRule {
  /** Amount per deposit in RLUSD (0.01 – 10,000) */
  amount: number;
  frequency: DepositFrequency;
  /** Whether the rule is currently active */
  active: boolean;
  /** ISO 8601 timestamp of next scheduled deposit */
  nextDepositAt: string;
}

// ── State Channel ─────────────────────────────────────────────────────────────

export type ChannelStatus =
  | "pending"
  | "open"
  | "closing"
  | "settled"
  | "error";

export interface StateChannel {
  /** Yellow Nitrolite channel identifier */
  channelId: string;
  goalId: string;
  /** Funded amount in RLUSD */
  fundedAmount: number;
  /** Amount already transferred off-chain */
  transferredAmount: number;
  status: ChannelStatus;
  openedAt: string;
  settledAt?: string;
}

// ── XRPL Hook ─────────────────────────────────────────────────────────────────

export type HookType = "auto_save_percentage" | "spending_guard" | "goal_release";

export interface XrplHook {
  hookId: string;
  goalId: string;
  type: HookType;
  parameters: AutoSaveHookParams | SpendingGuardParams | GoalReleaseParams;
  deployedAt: string;
}

export interface AutoSaveHookParams {
  /** Percentage of incoming payment to auto-save (1–100) */
  percentage: number;
}

export interface SpendingGuardParams {
  /** Maximum daily outflow in RLUSD */
  dailyLimit: number;
}

export interface GoalReleaseParams {
  /** Minimum goal completion % before withdrawal is allowed (e.g., 80) */
  releaseThreshold: number;
}

// ── Deposit History ───────────────────────────────────────────────────────────

export type DepositType = "off_chain" | "settlement" | "manual";

export interface DepositRecord {
  id: string;
  goalId: string;
  amount: number;
  type: DepositType;
  /** Yellow state channel ID (for off_chain deposits) */
  channelId?: string;
  /** XRPL transaction hash (for settlement deposits) */
  txHash?: string;
  timestamp: string;
}

// ── Network Config ────────────────────────────────────────────────────────────

export type NetworkEnvironment = "testnet" | "mainnet";

export interface XrplConfig {
  environment: NetworkEnvironment;
  nodeUrl: string;
  rlusdIssuer: string;
  rlusdCurrency: string;
}

export interface YellowConfig {
  environment: "sandbox" | "production";
  brokerUrl: string;
  apiKey: string;
}

export interface AgentWiseConfig {
  xrpl: XrplConfig;
  yellow: YellowConfig;
}

// ── Errors ────────────────────────────────────────────────────────────────────

export class AgentWiseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "AgentWiseError";
  }
}
