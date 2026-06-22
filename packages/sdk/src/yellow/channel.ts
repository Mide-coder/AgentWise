import { v4 as uuidv4 } from "uuid";
import type { StateChannel, YellowConfig } from "../types/index.js";
import { AgentWiseError } from "../types/index.js";
import {
  addAmountStrings,
  amountStringToNumber,
  compareAmountStrings,
  currentUnixSeconds,
  getDb,
  toAmountString,
  unixSecondsToIso,
} from "../db.js";

export class YellowChannelManager {
  private readonly config: YellowConfig;

  constructor(config: YellowConfig) {
    this.config = config;
  }

  async openChannel(
    participantAddress: string,
    goalId: string,
    fundingAmount: number
  ): Promise<StateChannel> {
    if (fundingAmount < 0.01) {
      throw new AgentWiseError("Minimum channel funding is 0.01 RLUSD", "CHANNEL_FUNDING_TOO_LOW");
    }

    const channelId = `ch_${uuidv4()}`;
    const openedAt = currentUnixSeconds();
    const fundedAmount = toAmountString(fundingAmount);

    getDb().prepare(
      `INSERT INTO channels (id, goal_id, status, funded_amount, settled_amount, created_at, closed_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)`
    ).run(channelId, goalId, "open", fundedAmount, "0", openedAt);

    console.log(
      `[MockYellow] Channel opened: ${channelId} funded ${fundingAmount} RLUSD for ${participantAddress}`
    );

    return {
      channelId,
      goalId,
      fundedAmount: fundingAmount,
      transferredAmount: 0,
      status: "open",
      openedAt: unixSecondsToIso(openedAt) ?? new Date().toISOString(),
    };
  }

  async microDeposit(channelId: string, amount: number, memo?: string): Promise<void> {
    if (amount < 0.01 || amount > 10_000) {
      throw new AgentWiseError(
        "Deposit amount must be between 0.01 and 10,000 RLUSD",
        "DEPOSIT_AMOUNT_OUT_OF_RANGE"
      );
    }

    const db = getDb();
    const channel = db
      .prepare(
        `SELECT id, goal_id, status, funded_amount, settled_amount, created_at, closed_at
         FROM channels
         WHERE id = ?`
      )
      .get(channelId) as
      | {
          id: string;
          goal_id: string;
          status: string;
          funded_amount: string;
          settled_amount: string;
          created_at: number;
          closed_at: number | null;
        }
      | undefined;

    if (!channel) {
      throw new AgentWiseError(`Channel ${channelId} not found`, "CHANNEL_NOT_FOUND");
    }
    if (channel.status !== "open") {
      throw new AgentWiseError(`Channel ${channelId} is not open`, "CHANNEL_NOT_OPEN");
    }

    const newSettledAmount = addAmountStrings(channel.settled_amount, toAmountString(amount));
    if (compareAmountStrings(newSettledAmount, channel.funded_amount) > 0) {
      throw new AgentWiseError(
        `Insufficient channel balance: need ${amount}, have ${amountStringToNumber(channel.funded_amount) - amountStringToNumber(channel.settled_amount)}`,
        "CHANNEL_INSUFFICIENT_BALANCE"
      );
    }

    db.prepare(
      `UPDATE channels
       SET settled_amount = ?
       WHERE id = ?`
    ).run(newSettledAmount, channelId);

    console.log(
      `[MockYellow] Transfer ${amount} RLUSD on channel ${channelId}` +
        (memo ? ` (${memo})` : "")
    );
  }

  async closeAndSettle(channelId: string): Promise<{ netAmount: number; txHash: string }> {
    const db = getDb();
    const channel = db
      .prepare(
        `SELECT id, goal_id, status, funded_amount, settled_amount, created_at, closed_at
         FROM channels
         WHERE id = ?`
      )
      .get(channelId) as
      | {
          id: string;
          goal_id: string;
          status: string;
          funded_amount: string;
          settled_amount: string;
          created_at: number;
          closed_at: number | null;
        }
      | undefined;

    if (!channel) {
      throw new AgentWiseError(`Channel ${channelId} not found`, "CHANNEL_NOT_FOUND");
    }
    if (channel.status !== "open") {
      throw new AgentWiseError(`Channel ${channelId} is not open`, "CHANNEL_NOT_OPEN");
    }

    const txHash = `mock_tx_${uuidv4().replace(/-/g, "")}`;
    const closedAt = currentUnixSeconds();

    db.prepare(
      `UPDATE channels
       SET status = ?,
           closed_at = ?
       WHERE id = ?`
    ).run("settled", closedAt, channelId);

    return { netAmount: amountStringToNumber(channel.settled_amount), txHash };
  }

  getChannelState(channelId: string): StateChannel | undefined {
    const row = getDb()
      .prepare(
        `SELECT id, goal_id, status, funded_amount, settled_amount, created_at, closed_at
         FROM channels
         WHERE id = ?`
      )
      .get(channelId) as
      | {
          id: string;
          goal_id: string;
          status: string;
          funded_amount: string;
          settled_amount: string;
          created_at: number;
          closed_at: number | null;
        }
      | undefined;

    if (!row) {
      return undefined;
    }

    return {
      channelId: row.id,
      goalId: row.goal_id,
      fundedAmount: amountStringToNumber(row.funded_amount),
      transferredAmount: amountStringToNumber(row.settled_amount),
      status: row.status as StateChannel["status"],
      openedAt: unixSecondsToIso(row.created_at) ?? new Date().toISOString(),
      settledAt: unixSecondsToIso(row.closed_at),
    };
  }

  async topUpChannel(
    channelId: string,
    additionalAmount: number,
    participantAddress: string,
    goalId: string
  ): Promise<StateChannel> {
    const existing = this.getChannelState(channelId);
    if (!existing) {
      throw new AgentWiseError(`Channel ${channelId} not found`, "CHANNEL_NOT_FOUND");
    }

    await this.closeAndSettle(channelId);
    const remaining = existing.fundedAmount - existing.transferredAmount;
    const newFunding = remaining + additionalAmount;
    return this.openChannel(participantAddress, goalId, Math.max(newFunding, additionalAmount));
  }
}
