/**
 * XRPL client wrapper.
 * Handles connection lifecycle, RLUSD transfers, and wallet utilities.
 */
import { Client, Wallet, Payment, convertStringToHex, xrpToDrops } from "xrpl";
import type { XrplConfig } from "../types/index.js";
import { AgentWiseError } from "../types/index.js";

/** RLUSD currency code as 3-letter ISO or 20-byte hex */
const RLUSD_CURRENCY = "524C555344000000000000000000000000000000"; // "RLUSD" hex-padded

export class XrplClient {
  private client: Client;
  private readonly config: XrplConfig;

  constructor(config: XrplConfig) {
    this.config = config;
    this.client = new Client(config.nodeUrl);
  }

  /** Open WebSocket connection to the XRPL node */
  async connect(): Promise<void> {
    if (!this.client.isConnected()) {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    if (this.client.isConnected()) {
      await this.client.disconnect();
    }
  }

  get isConnected(): boolean {
    return this.client.isConnected();
  }

  /**
   * Generate a fresh XRPL wallet for a savings goal.
   * Returns the wallet and its seed (store the seed securely).
   */
  generateGoalWallet(): { wallet: Wallet; seed: string } {
    const wallet = Wallet.generate();
    if (!wallet.seed) {
      throw new AgentWiseError(
        "Failed to generate wallet seed",
        "WALLET_GENERATION_FAILED"
      );
    }
    return { wallet, seed: wallet.seed };
  }

  /**
   * Fund a new account from an existing wallet (testnet auto-fund via faucet or manual).
   * On testnet, accounts need to be funded with a minimum reserve of 10 XRP.
   */
  async fundAccountFromFaucet(address: string): Promise<void> {
    if (this.config.environment !== "testnet") {
      throw new AgentWiseError(
        "Faucet funding is only available on testnet",
        "FAUCET_MAINNET_BLOCKED"
      );
    }
    await this.connect();
    try {
      await this.client.fundWallet(Wallet.fromSeed("sEdTMock")); // placeholder – real call below
    } catch {
      // Intentional: fund via HTTP faucet instead
    }
    // Use the XRPL testnet faucet REST API
    const res = await fetch("https://faucet.altnet.rippletest.net/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ destination: address }),
    });
    if (!res.ok) {
      throw new AgentWiseError(
        `Faucet request failed: ${res.statusText}`,
        "FAUCET_REQUEST_FAILED"
      );
    }
  }

  /**
   * Send RLUSD from one address to another.
   * @param senderWallet - The wallet signing the transaction
   * @param destination  - Destination XRPL address
   * @param amount       - Amount in RLUSD (string for precision, e.g. "10.50")
   */
  async sendRlusd(
    senderWallet: Wallet,
    destination: string,
    amount: string
  ): Promise<string> {
    await this.connect();

    const payment: Payment = {
      TransactionType: "Payment",
      Account: senderWallet.address,
      Destination: destination,
      Amount: {
        currency: RLUSD_CURRENCY,
        value: amount,
        issuer: this.config.rlusdIssuer,
      },
    };

    try {
      const result = await this.client.submitAndWait(payment, {
        wallet: senderWallet,
      });

      const meta = result.result.meta as { TransactionResult?: string } | undefined;
      if (meta?.TransactionResult !== "tesSUCCESS") {
        throw new AgentWiseError(
          `RLUSD payment failed: ${meta?.TransactionResult}`,
          "PAYMENT_FAILED"
        );
      }

      return result.result.hash;
    } catch (err) {
      if (err instanceof AgentWiseError) throw err;
      throw new AgentWiseError(
        "RLUSD payment submission failed",
        "PAYMENT_SUBMISSION_ERROR",
        err
      );
    }
  }

  /**
   * Fetch the RLUSD balance for an address.
   * Returns 0 if the trust line doesn't exist.
   */
  async getRlusdBalance(address: string): Promise<number> {
    await this.connect();

    try {
      const response = await this.client.request({
        command: "account_lines",
        account: address,
        peer: this.config.rlusdIssuer,
      });

      const rlusdLine = response.result.lines.find(
        (line) =>
          line.currency === RLUSD_CURRENCY ||
          line.currency === this.config.rlusdCurrency
      );

      return rlusdLine ? parseFloat(rlusdLine.balance) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Set up a trust line for RLUSD on a wallet.
   * Required before RLUSD can be received.
   */
  async setRlusdTrustLine(wallet: Wallet, limitAmount = "1000000"): Promise<string> {
    await this.connect();

    const trustSet = {
      TransactionType: "TrustSet" as const,
      Account: wallet.address,
      LimitAmount: {
        currency: RLUSD_CURRENCY,
        issuer: this.config.rlusdIssuer,
        value: limitAmount,
      },
    };

    const result = await this.client.submitAndWait(trustSet, { wallet });
    return result.result.hash;
  }

  /**
   * Get raw xrpl.js Client for advanced operations.
   */
  getRawClient(): Client {
    return this.client;
  }
}
