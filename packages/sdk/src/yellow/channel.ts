/**
 * Yellow Nitrolite state channel wrapper.
 *
 * Yellow SDK (when available) manages channel lifecycle via its broker.
 * This module provides a typed facade over the Yellow SDK channel primitives
 * and a mock implementation for testing without a live broker.
 *
 * Reference: https://github.com/layer-3/yellow-sdk
 */
import { v4 as uuidv4 } from "uuid";
import type { StateChannel, YellowConfig } from "../types/index.js";
import { AgentWiseError } from "../types/index.js";

// ── Yellow SDK type stubs ─────────────────────────────────────────────────────
// Replace with real @yellow-network/sdk imports once the package is available.

interface YellowChannelCreateParams {
  participantA: string;
  participantB: string;
  fundingAmount: number; // in RLUSD
  asset: string;
}

interface YellowTransferParams {
  channelId: string;
  amount: number;
  memo?: string;
}

// ── Mock broker for local development / testnet demo ────────────────────────

const mockChannels = new Map<string, StateChannel>();

class MockYellowBroker {
  async createChannel(params: YellowChannelCreateParams, goalId: string): Promise<StateChannel> {
    const channel: StateChannel = {
      channelId: `ch_${uuidv4()}`,
      goalId,
      fundedAmount: params.fundingAmount,
      transferredAmount: 0,
      status: "open",
      openedAt: new Date().toISOString(),
    };
    mockChannels.set(channel.channelId, channel);
    console.log(`[MockYellow] Channel opened: ${channel.channelId} funded ${params.fundingAmount} RLUSD`);
    return channel;
  }

  async transfer(params: YellowTransferParams): Promise<void> {
    const channel = mockChannels.get(params.channelId);
    if (!channel) {
      throw new AgentWiseError(`Channel ${params.channelId} not found`, "CHANNEL_NOT_FOUND");
    }
    if (channel.status !== "open") {
      throw new AgentWiseError(`Channel ${params.channelId} is not open`, "CHANNEL_NOT_OPEN");
    }
    const remaining = channel.fundedAmount - channel.transferredAmount;
    if (params.amount > remaining) {
      throw new AgentWiseError(
        `Insufficient channel balance: need ${params.amount}, have ${remaining}`,
        "CHANNEL_INSUFFICIENT_BALANCE"
      );
    }
    channel.transferredAmount += params.amount;
    console.log(
      `[MockYellow] Transfer ${params.amount} RLUSD on channel ${params.channelId}. ` +
        `Total transferred: ${channel.transferredAmount}/${channel.fundedAmount}`
    );
  }

  async closeAndSettle(channelId: string): Promise<{ netAmount: number; txHash: string }> {
    const channel = mockChannels.get(channelId);
    if (!channel) {
      throw new AgentWiseError(`Channel ${channelId} not found`, "CHANNEL_NOT_FOUND");
    }
    channel.status = "settled";
    channel.settledAt = new Date().toISOString();
    const txHash = `mock_tx_${uuidv4().replace(/-/g, "")}`;
    console.log(
      `[MockYellow] Channel ${channelId} settled. Net: ${channel.transferredAmount} RLUSD. TxHash: ${txHash}`
    );
    return { netAmount: channel.transferredAmount, txHash };
  }

  getChannel(channelId: string): StateChannel | undefined {
    return mockChannels.get(channelId);
  }
}

// ── Main Channel Manager ──────────────────────────────────────────────────────

export class YellowChannelManager {
  private readonly config: YellowConfig;
  private readonly broker: MockYellowBroker;

  constructor(config: YellowConfig) {
    this.config = config;
    // TODO: replace MockYellowBroker with real Yellow SDK broker when available
    this.broker = new MockYellowBroker();
  }

  /**
   * Open a new state channel funded with `amount` RLUSD for a given goal.
   *
   * @param participantAddress - The user's XRPL address (channel participant A)
   * @param goalId             - The savings goal this channel serves
   * @param fundingAmount      - Initial funding in RLUSD
   */
  async openChannel(
    participantAddress: string,
    goalId: string,
    fundingAmount: number
  ): Promise<StateChannel> {
    if (fundingAmount < 0.01) {
      throw new AgentWiseError(
        "Minimum channel funding is 0.01 RLUSD",
        "CHANNEL_FUNDING_TOO_LOW"
      );
    }

    const channel = await this.broker.createChannel(
      {
        participantA: participantAddress,
        participantB: this.config.brokerUrl, // broker acts as counterparty
        fundingAmount,
        asset: "RLUSD",
      },
      goalId
    );

    return channel;
  }

  /**
   * Execute a recurring micro-deposit off-chain.
   * This is a pure off-chain state update — no on-chain gas.
   *
   * @param channelId - Open state channel
   * @param amount    - Deposit amount in RLUSD
   * @param memo      - Optional memo (e.g., "auto-save daily")
   */
  async microDeposit(channelId: string, amount: number, memo?: string): Promise<void> {
    if (amount < 0.01 || amount > 10_000) {
      throw new AgentWiseError(
        "Deposit amount must be between 0.01 and 10,000 RLUSD",
        "DEPOSIT_AMOUNT_OUT_OF_RANGE"
      );
    }
    await this.broker.transfer({ channelId, amount, memo });
  }

  /**
   * Close the channel and settle the net balance to the XRPL goal account.
   * Returns the XRPL transaction hash of the final settlement.
   *
   * @param channelId - Channel to settle
   */
  async closeAndSettle(channelId: string): Promise<{ netAmount: number; txHash: string }> {
    return this.broker.closeAndSettle(channelId);
  }

  /**
   * Get the current in-memory state of a channel.
   */
  getChannelState(channelId: string): StateChannel | undefined {
    return this.broker.getChannel(channelId);
  }

  /**
   * Top up an existing channel with additional RLUSD.
   * Closes and reopens with combined balance in the mock;
   * real Yellow SDK may support direct top-up.
   */
  async topUpChannel(
    channelId: string,
    additionalAmount: number,
    participantAddress: string,
    goalId: string
  ): Promise<StateChannel> {
    const existing = this.broker.getChannel(channelId);
    if (!existing) {
      throw new AgentWiseError(`Channel ${channelId} not found`, "CHANNEL_NOT_FOUND");
    }
    // Settle old channel and open new one with combined remaining + new amount
    const { netAmount } = await this.closeAndSettle(channelId);
    const newFunding = netAmount - existing.transferredAmount + additionalAmount;
    return this.openChannel(participantAddress, goalId, Math.max(newFunding, additionalAmount));
  }
}
