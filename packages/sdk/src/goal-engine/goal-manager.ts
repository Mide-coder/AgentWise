/**
 * Goal Engine — core business logic for savings goal lifecycle.
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
import {
  addAmountStrings,
  amountStringToNumber,
  compareAmountStrings,
  currentUnixSeconds,
  getDb,
  isoToUnixSeconds,
  toAmountString,
  unixSecondsToIso,
} from "../db.js";
import { XrplClient } from "../xrpl/client.js";
import { XrplHooksManager } from "../xrpl/hooks.js";
import { YellowChannelManager } from "../yellow/channel.js";

type GoalRow = {
  id: string;
  name: string;
  description: string | null;
  type: string;
  target_amount: string;
  saved_amount: string;
  deadline: number | null;
  auto_save_percent: number;
  auto_save_amount: string;
  auto_save_frequency: string;
  hook_address: string | null;
  channel_id: string | null;
  status: string;
  wallet_address: string;
  created_at: number;
  updated_at: number;
};

type DepositRow = {
  id: string;
  goal_id: string;
  amount: string;
  source: string;
  status: string;
  tx_hash: string | null;
  created_at: number;
};

function goalSelectSql(): string {
  return `
    SELECT id, name, description, type, target_amount, saved_amount, deadline,
           auto_save_percent, auto_save_amount, auto_save_frequency, hook_address,
           channel_id, status, wallet_address, created_at, updated_at
    FROM goals
  `;
}

function calculateNextDepositAt(frequency: RecurringDepositRule["frequency"], baseMs = Date.now()): string {
  const date = new Date(baseMs);
  switch (frequency) {
    case "hourly":
      date.setHours(date.getHours() + 1);
      break;
    case "daily":
      date.setDate(date.getDate() + 1);
      break;
    case "weekly":
      date.setDate(date.getDate() + 7);
      break;
    case "monthly":
      date.setMonth(date.getMonth() + 1);
      break;
  }
  return date.toISOString();
}

function rowToGoal(row: GoalRow): SavingsGoal {
  const hookIds = row.hook_address ? row.hook_address.split(",").filter(Boolean) : [];
  const hasDepositRule = row.auto_save_amount !== "0" || row.auto_save_percent > 0;

  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    targetAmount: amountStringToNumber(row.target_amount),
    savedAmount: amountStringToNumber(row.saved_amount),
    deadline: unixSecondsToIso(row.deadline) ?? new Date(0).toISOString(),
    xrplAddress: row.wallet_address,
    channelId: row.channel_id ?? undefined,
    status: row.status as SavingsGoal["status"],
    depositRule: hasDepositRule
      ? {
          amount: amountStringToNumber(row.auto_save_amount),
          frequency: row.auto_save_frequency as RecurringDepositRule["frequency"],
          active: true,
          nextDepositAt: calculateNextDepositAt(row.auto_save_frequency as RecurringDepositRule["frequency"], row.updated_at * 1000),
        }
      : undefined,
    hookIds,
    createdAt: unixSecondsToIso(row.created_at) ?? new Date(0).toISOString(),
    updatedAt: unixSecondsToIso(row.updated_at) ?? new Date(0).toISOString(),
  };
}

function rowToDeposit(row: DepositRow, currentChannelId?: string | null): DepositRecord {
  return {
    id: row.id,
    goalId: row.goal_id,
    amount: amountStringToNumber(row.amount),
    type: row.source as DepositRecord["type"],
    channelId: currentChannelId ?? undefined,
    txHash: row.tx_hash ?? undefined,
    timestamp: unixSecondsToIso(row.created_at) ?? new Date(0).toISOString(),
  };
}

export class GoalManager {
  private readonly xrpl: XrplClient;
  private readonly hooks: XrplHooksManager;
  private readonly yellow: YellowChannelManager;

  constructor(config: AgentWiseConfig) {
    this.xrpl = new XrplClient(config.xrpl);
    this.hooks = new XrplHooksManager();
    this.yellow = new YellowChannelManager(config.yellow);
  }

  async createGoal(params: {
    name: string;
    description?: string;
    targetAmount: number;
    deadline: string;
  }): Promise<SavingsGoal> {
    if (!params.name || params.name.length < 1 || params.name.length > 60) {
      throw new AgentWiseError("Goal name must be between 1 and 60 characters", "INVALID_GOAL_NAME");
    }
    if (params.targetAmount <= 0 || params.targetAmount > 1_000_000) {
      throw new AgentWiseError("Target amount must be between 0.01 and 1,000,000 RLUSD", "INVALID_TARGET_AMOUNT");
    }

    const db = getDb();
    const activeGoals = db.prepare(`SELECT COUNT(*) AS count FROM goals WHERE status = ?`).get("active") as { count: number };
    if (activeGoals.count >= 20) {
      throw new AgentWiseError("Maximum of 20 active goals allowed per user", "MAX_GOALS_EXCEEDED");
    }

    const { wallet } = this.xrpl.generateGoalWallet();
    const goalId = uuidv4();
    const now = currentUnixSeconds();

    db.prepare(
      `INSERT INTO goals (
        id, name, description, type, target_amount, saved_amount, deadline,
        auto_save_percent, auto_save_amount, auto_save_frequency, hook_address,
        channel_id, status, wallet_address, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      goalId,
      params.name,
      params.description ?? null,
      "custom",
      toAmountString(params.targetAmount),
      "0",
      isoToUnixSeconds(params.deadline),
      0,
      "0",
      "daily",
      null,
      null,
      "active",
      wallet.address,
      now,
      now
    );

    const goal = this.getGoal(goalId);
    if (!goal) {
      throw new AgentWiseError(`Goal ${goalId} not found`, "GOAL_NOT_FOUND");
    }

    console.log(`[GoalEngine] Created goal "${goal.name}" (${goal.id}) → XRPL: ${goal.xrplAddress}`);
    return goal;
  }

  getGoal(goalId: string): SavingsGoal | null {
    const row = getDb().prepare(`${goalSelectSql()} WHERE id = ?`).get(goalId) as GoalRow | undefined;
    return row ? rowToGoal(row) : null;
  }

  listGoals(): SavingsGoal[] {
    const rows = getDb().prepare(`${goalSelectSql()} ORDER BY created_at ASC`).all() as GoalRow[];
    return rows.map(rowToGoal);
  }

  updateGoal(
    goalId: string,
    updates: Partial<Pick<SavingsGoal, "name" | "description" | "status">>
  ): SavingsGoal | null {
    const goal = this.getGoal(goalId);
    if (!goal) {
      return null;
    }

    const now = currentUnixSeconds();
    getDb().prepare(
      `UPDATE goals
       SET name = COALESCE(?, name),
           description = COALESCE(?, description),
           status = COALESCE(?, status),
           updated_at = ?
       WHERE id = ?`
    ).run(updates.name ?? null, updates.description ?? null, updates.status ?? null, now, goalId);

    return this.getGoal(goalId);
  }

  async openChannel(goalId: string, participantAddress: string, fundingAmount: number): Promise<SavingsGoal | null> {
    const goal = this.getGoal(goalId);
    if (!goal) {
      return null;
    }
    if (goal.channelId) {
      throw new AgentWiseError(`Goal ${goalId} already has an open channel: ${goal.channelId}`, "CHANNEL_ALREADY_OPEN");
    }

    const channel = await this.yellow.openChannel(participantAddress, goalId, fundingAmount);
    getDb().prepare(
      `UPDATE goals
       SET channel_id = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(channel.channelId, currentUnixSeconds(), goalId);

    return this.getGoal(goalId);
  }

  setDepositRule(goalId: string, rule: Omit<RecurringDepositRule, "nextDepositAt">): SavingsGoal | null {
    const goal = this.getGoal(goalId);
    if (!goal) {
      return null;
    }
    if (rule.amount < 0.01 || rule.amount > 10_000) {
      throw new AgentWiseError("Recurring deposit amount must be between 0.01 and 10,000 RLUSD", "INVALID_DEPOSIT_AMOUNT");
    }

    const now = currentUnixSeconds();
    getDb().prepare(
      `UPDATE goals
       SET auto_save_percent = ?,
           auto_save_amount = ?,
           auto_save_frequency = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(0, toAmountString(rule.amount), rule.frequency, now, goalId);

    const updated = this.getGoal(goalId);
    if (!updated) {
      return null;
    }

    console.log(`[GoalEngine] Deposit rule set: ${rule.amount} RLUSD ${rule.frequency} for goal ${goalId}`);
    return updated;
  }

  async executeDeposit(goalId: string): Promise<DepositRecord | null> {
    const goal = this.getGoal(goalId);
    if (!goal) {
      return null;
    }
    if (!goal.channelId) {
      throw new AgentWiseError(`Goal ${goalId} has no open state channel`, "NO_CHANNEL");
    }
    if (!goal.depositRule) {
      throw new AgentWiseError(`Goal ${goalId} has no deposit rule configured`, "NO_DEPOSIT_RULE");
    }

    await this.yellow.microDeposit(goal.channelId, goal.depositRule.amount, `auto-save ${goal.depositRule.frequency}`);

    const now = currentUnixSeconds();
    const record: DepositRecord = {
      id: uuidv4(),
      goalId,
      amount: goal.depositRule.amount,
      type: "off_chain",
      channelId: goal.channelId,
      timestamp: unixSecondsToIso(now) ?? new Date(0).toISOString(),
    };

    getDb().prepare(
      `INSERT INTO deposits (id, goal_id, amount, source, status, tx_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(record.id, goalId, toAmountString(record.amount), "off_chain", "settled", null, now);

    getDb().prepare(
      `UPDATE goals
       SET saved_amount = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(addAmountStrings(toAmountString(goal.savedAmount), toAmountString(goal.depositRule.amount)), now, goalId);

    this.checkGoalCompletion(goalId);
    return record;
  }

  async settleGoal(goalId: string): Promise<DepositRecord | null> {
    const goal = this.getGoal(goalId);
    if (!goal) {
      return null;
    }
    if (!goal.channelId) {
      throw new AgentWiseError(`Goal ${goalId} has no open channel to settle`, "NO_CHANNEL");
    }

    const { netAmount, txHash } = await this.yellow.closeAndSettle(goal.channelId);
    const now = currentUnixSeconds();

    const record: DepositRecord = {
      id: uuidv4(),
      goalId,
      amount: netAmount,
      type: "settlement",
      channelId: goal.channelId,
      txHash,
      timestamp: unixSecondsToIso(now) ?? new Date(0).toISOString(),
    };

    getDb().prepare(
      `INSERT INTO deposits (id, goal_id, amount, source, status, tx_hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(record.id, goalId, toAmountString(record.amount), "settlement", "settled", txHash, now);

    getDb().prepare(
      `UPDATE goals
       SET channel_id = NULL,
           updated_at = ?
       WHERE id = ?`
    ).run(now, goalId);

    console.log(`[GoalEngine] Goal ${goalId} settled. Net: ${netAmount} RLUSD. Tx: ${txHash}`);
    return record;
  }

  async deployHook(
    goalId: string,
    type: HookType,
    params: AutoSaveHookParams | SpendingGuardParams | GoalReleaseParams,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    walletForSigning: any
  ): Promise<void | null> {
    const goal = this.getGoal(goalId);
    if (!goal) {
      return null;
    }

    const rawClient = this.xrpl.getRawClient();
    const hook = await this.hooks.deployHook(rawClient, walletForSigning, goalId, type, params);
    const nextHookIds = [...goal.hookIds, hook.hookId];

    getDb().prepare(
      `UPDATE goals
       SET hook_address = ?,
           updated_at = ?
       WHERE id = ?`
    ).run(nextHookIds.join(","), currentUnixSeconds(), goalId);

    console.log(`[GoalEngine] Hook deployed: ${type} on goal ${goalId}`);
  }

  getDepositHistory(goalId: string): DepositRecord[] | null {
    const goal = this.getGoal(goalId);
    if (!goal) {
      return null;
    }

    const rows = getDb().prepare(
      `SELECT id, goal_id, amount, source, status, tx_hash, created_at
       FROM deposits
       WHERE goal_id = ?
       ORDER BY created_at ASC`
    ).all(goalId) as DepositRow[];

    return rows.map((row) => rowToDeposit(row, goal.channelId));
  }

  getGoalProgress(goalId: string):
    | {
        savedAmount: number;
        targetAmount: number;
        percentComplete: number;
        daysRemaining: number;
        onTrack: boolean;
      }
    | null {
    const goal = this.getGoal(goalId);
    if (!goal) {
      return null;
    }

    const percentComplete = Math.min((goal.savedAmount / goal.targetAmount) * 100, 100);
    const deadlineDate = new Date(goal.deadline);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

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
              : goal.depositRule.amount * 24;
      onTrack = dailyDeposit >= dailyRequired;
    }

    return { savedAmount: goal.savedAmount, targetAmount: goal.targetAmount, percentComplete, daysRemaining, onTrack };
  }

  private checkGoalCompletion(goalId: string): void {
    const goal = this.getGoal(goalId);
    if (!goal) {
      return;
    }

    if (goal.savedAmount >= goal.targetAmount && goal.status === "active") {
      getDb().prepare(
        `UPDATE goals
         SET status = ?,
             updated_at = ?
         WHERE id = ?`
      ).run("completed", currentUnixSeconds(), goalId);
      console.log(`[GoalEngine] Goal "${goal.name}" (${goalId}) COMPLETED!`);
    }
  }
}
