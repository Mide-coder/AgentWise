/**
 * Goal Engine — core business logic for savings goal lifecycle.
 *
 * Coordinates between:
 *  - Yellow Nitrolite state channels (off-chain recurring deposits)
 *  - XRPL settlement (net balance → goal account)
 *  - XRPL Hooks (rule enforcement)
 */
import { v4 as uuidv4 } from "uuid";
import type {
  SavingsGoal,
  RecurringDepositRule,
  DepositRecord,
  HookType,
  AutoSaveHookParams,
  SpendingGuardParams,
  GoalReleaseParams,
  AgentWiseConfig,
} from "../types/index.js";
import { AgentWiseError } from "../types/index.js";
import { XrplClient } from "../xrpl/client.js";
import { XrplHooksManager } from "../xrpl/hooks.js";
import { YellowChannelManager } from "../yellow/channel.js";

/** In-memory store — replace with persistent DB adapter in production */
const goals = new Map<string, SavingsGoal>();
const deposits = new Map<string, DepositRecord[]>();

export class GoalManager {
  private readonly xrpl: XrplClient;
  private readonly hooks: XrplHooksManager;
  private readonly yellow: YellowChannelManager;

  constructor(config: AgentWiseConfig) {
    this.xrpl = new XrplClient(config.xrpl);
    this.hooks = new XrplHooksManager();
    this.yellow = new YellowChannelManager(config.yellow);
  }

  // ── Goal CRUD ──────────────────────────────────────────────────────────────

  /**
   * Create a new savings goal.
   * Generates a dedicated XRPL wallet for the goal and sets up RLUSD trust line.
   */
  async createGoal(params: {
    name: string;
    description?: string;
    targetAmount: number;
    deadline: string;
  }): Promise<SavingsGoal> {
    if (!params.name || params.name.length < 1 || params.name.length > 60) {
      throw new AgentWiseError(
        "Goal name must be between 1 and 60 characters",
        "INVALID_GOAL_NAME"
      );
    }
    if (params.targetAmount <= 0 || params.targetAmount > 1_000_000) {
      throw new AgentWiseError(
        "Target amount must be between 0.01 and 1,000,000 RLUSD",
        "INVALID_TARGET_AMOUNT"
      );
    }
    if (goals.size >= 20) {
      throw new AgentWiseError(
        "Maximum of 20 active goals allowed per user",
        "MAX_GOALS_EXCEEDED"
      );
    }

    const { wallet } = this.xrpl.generateGoalWallet();

    const goal: SavingsGoal = {
      id: uuidv4(),
      name: params.name,
      description: params.description,
      targetAmount: params.targetAmount,
      savedAmount: 0,
      deadline: params.deadline,
      xrplAddress: wallet.address,
      status: "active",
      hookIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    goals.set(goal.id, goal);
    deposits.set(goal.id, []);

    console.log(`[GoalEngine] Created goal "${goal.name}" (${goal.id}) → XRPL: ${goal.xrplAddress}`);
    return goal;
  }

  getGoal(goalId: string): SavingsGoal {
    const goal = goals.get(goalId);
    if (!goal) throw new AgentWiseError(`Goal ${goalId} not found`, "GOAL_NOT_FOUND");
    return goal;
  }

  listGoals(): SavingsGoal[] {
    return Array.from(goals.values());
  }

  updateGoal(goalId: string, updates: Partial<Pick<SavingsGoal, "name" | "description" | "status">>): SavingsGoal {
    const goal = this.getGoal(goalId);
    const updated = { ...goal, ...updates, updatedAt: new Date().toISOString() };
    goals.set(goalId, updated);
    return updated;
  }

  // ── State Channel ──────────────────────────────────────────────────────────

  /**
   * Open a Yellow state channel for a goal and attach it.
   */
  async openChannel(
    goalId: string,
    participantAddress: string,
    fundingAmount: number
  ): Promise<SavingsGoal> {
    const goal = this.getGoal(goalId);
    if (goal.channelId) {
      throw new AgentWiseError(
        `Goal ${goalId} already has an open channel: ${goal.channelId}`,
        "CHANNEL_ALREADY_OPEN"
      );
    }

    const channel = await this.yellow.openChannel(participantAddress, goalId, fundingAmount);
    const updated = { ...goal, channelId: channel.channelId, updatedAt: new Date().toISOString() };
    goals.set(goalId, updated);
    return updated;
  }

  // ── Recurring Deposits ─────────────────────────────────────────────────────

  /**
   * Configure a recurring deposit rule on a goal.
   */
  setDepositRule(goalId: string, rule: Omit<RecurringDepositRule, "nextDepositAt">): SavingsGoal {
    const goal = this.getGoal(goalId);
    if (rule.amount < 0.01 || rule.amount > 10_000) {
      throw new AgentWiseError(
        "Recurring deposit amount must be between 0.01 and 10,000 RLUSD",
        "INVALID_DEPOSIT_AMOUNT"
      );
    }

    const nextDepositAt = this.calculateNextDeposit(rule.frequency);
    const depositRule: RecurringDepositRule = { ...rule, nextDepositAt };

    const updated = {
      ...goal,
      depositRule,
      updatedAt: new Date().toISOString(),
    };
    goals.set(goalId, updated);
    console.log(`[GoalEngine] Deposit rule set: ${rule.amount} RLUSD ${rule.frequency} for goal ${goalId}`);
    return updated;
  }

  /**
   * Execute a single micro-deposit on the goal's state channel.
   */
  async executeDeposit(goalId: string): Promise<DepositRecord> {
    const goal = this.getGoal(goalId);
    if (!goal.channelId) {
      throw new AgentWiseError(
        `Goal ${goalId} has no open state channel`,
        "NO_CHANNEL"
      );
    }
    if (!goal.depositRule) {
      throw new AgentWiseError(
        `Goal ${goalId} has no deposit rule configured`,
        "NO_DEPOSIT_RULE"
      );
    }

    await this.yellow.microDeposit(goal.channelId, goal.depositRule.amount, `auto-save ${goal.depositRule.frequency}`);

    const record: DepositRecord = {
      id: uuidv4(),
      goalId,
      amount: goal.depositRule.amount,
      type: "off_chain",
      channelId: goal.channelId,
      timestamp: new Date().toISOString(),
    };

    const goalDeposits = deposits.get(goalId) ?? [];
    goalDeposits.push(record);
    deposits.set(goalId, goalDeposits);

    // Update saved amount and next deposit time
    const nextDepositAt = this.calculateNextDeposit(goal.depositRule.frequency);
    goals.set(goalId, {
      ...goal,
      savedAmount: goal.savedAmount + goal.depositRule.amount,
      depositRule: { ...goal.depositRule, nextDepositAt },
      updatedAt: new Date().toISOString(),
    });

    // Check if goal completed
    this.checkGoalCompletion(goalId);

    return record;
  }

  // ── Settlement ─────────────────────────────────────────────────────────────

  /**
   * Close the state channel and settle the net RLUSD to the goal XRPL account.
   */
  async settleGoal(goalId: string): Promise<DepositRecord> {
    const goal = this.getGoal(goalId);
    if (!goal.channelId) {
      throw new AgentWiseError(`Goal ${goalId} has no open channel to settle`, "NO_CHANNEL");
    }

    const { netAmount, txHash } = await this.yellow.closeAndSettle(goal.channelId);

    const record: DepositRecord = {
      id: uuidv4(),
      goalId,
      amount: netAmount,
      type: "settlement",
      channelId: goal.channelId,
      txHash,
      timestamp: new Date().toISOString(),
    };

    const goalDeposits = deposits.get(goalId) ?? [];
    goalDeposits.push(record);
    deposits.set(goalId, goalDeposits);

    goals.set(goalId, {
      ...goal,
      channelId: undefined,
      updatedAt: new Date().toISOString(),
    });

    console.log(`[GoalEngine] Goal ${goalId} settled. Net: ${netAmount} RLUSD. Tx: ${txHash}`);
    return record;
  }

  // ── Hooks ──────────────────────────────────────────────────────────────────

  /**
   * Deploy an XRPL Hook rule on a goal account.
   * Requires a Hooks-enabled XRPL node.
   */
  async deployHook(
    goalId: string,
    type: HookType,
    params: AutoSaveHookParams | SpendingGuardParams | GoalReleaseParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walletForSigning: any
  ): Promise<void> {
    const goal = this.getGoal(goalId);
    const rawClient = this.xrpl.getRawClient();

    const hook = await this.hooks.deployHook(rawClient, walletForSigning, goalId, type, params);

    goals.set(goalId, {
      ...goal,
      hookIds: [...goal.hookIds, hook.hookId],
      updatedAt: new Date().toISOString(),
    });

    console.log(`[GoalEngine] Hook deployed: ${type} on goal ${goalId}`);
  }

  // ── Deposit History ────────────────────────────────────────────────────────

  getDepositHistory(goalId: string): DepositRecord[] {
    this.getGoal(goalId); // validate goal exists
    return deposits.get(goalId) ?? [];
  }

  // ── Progress ───────────────────────────────────────────────────────────────

  getGoalProgress(goalId: string): {
    savedAmount: number;
    targetAmount: number;
    percentComplete: number;
    daysRemaining: number;
    onTrack: boolean;
  } {
    const goal = this.getGoal(goalId);
    const percentComplete = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
    const deadlineDate = new Date(goal.deadline);
    const now = new Date();
    const daysRemaining = Math.max(
      0,
      Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );

    // On-track = daily required savings vs daily deposit rule
    let onTrack = false;
    if (goal.depositRule && daysRemaining > 0) {
      const remaining = goal.targetAmount - goal.savedAmount;
      const dailyRequired = remaining / daysRemaining;
      const dailyDeposit =
        goal.depositRule.frequency === "daily"
          ? goal.depositRule.amount
          : goal.depositRule.frequency === "weekly"
          ? goal.depositRule.amount / 7
          : goal.depositRule.frequency === "monthly"
          ? goal.depositRule.amount / 30
          : goal.depositRule.amount * 24; // hourly
      onTrack = dailyDeposit >= dailyRequired;
    }

    return { savedAmount: goal.savedAmount, targetAmount: goal.targetAmount, percentComplete, daysRemaining, onTrack };
  }

  // ── Private Helpers ────────────────────────────────────────────────────────

  private calculateNextDeposit(frequency: RecurringDepositRule["frequency"]): string {
    const now = new Date();
    switch (frequency) {
      case "hourly":
        now.setHours(now.getHours() + 1);
        break;
      case "daily":
        now.setDate(now.getDate() + 1);
        break;
      case "weekly":
        now.setDate(now.getDate() + 7);
        break;
      case "monthly":
        now.setMonth(now.getMonth() + 1);
        break;
    }
    return now.toISOString();
  }

  private checkGoalCompletion(goalId: string): void {
    const goal = goals.get(goalId);
    if (!goal) return;
    if (goal.savedAmount >= goal.targetAmount && goal.status === "active") {
      goals.set(goalId, { ...goal, status: "completed", updatedAt: new Date().toISOString() });
      console.log(`[GoalEngine] 🎉 Goal "${goal.name}" (${goalId}) COMPLETED!`);
    }
  }
}
