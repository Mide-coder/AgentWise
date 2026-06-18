/**
 * XRPL Hooks deployment and management.
 *
 * NOTE: XRPL Hooks require Hooks-enabled nodes (hooks-testnet2.xrpl-labs.com).
 * This module provides helpers to set Hook parameters on goal accounts via
 * the SetHook transaction type.
 *
 * Hook WASM binaries are expected to be pre-compiled and stored in
 * packages/sdk/src/xrpl/hook-binaries/. During MVP we use pre-compiled
 * reference hooks from the XRPL Hooks Builder toolkit.
 */
import { Wallet } from "xrpl";
import type { XrplHook, HookType, AutoSaveHookParams, SpendingGuardParams, GoalReleaseParams } from "../types/index.js";
import { AgentWiseError } from "../types/index.js";
import { v4 as uuidv4 } from "uuid";

/** Hooks-enabled XRPL testnet node */
export const HOOKS_TESTNET_URL = "wss://hooks-testnet2.xrpl-labs.com";

/**
 * Maps hook types to their pre-compiled WASM hex strings.
 * In production, load from hook-binaries/ directory or IPFS CID.
 * Placeholder values here – replace with real compiled WASM.
 */
const HOOK_WASM_PLACEHOLDERS: Record<HookType, string> = {
  auto_save_percentage: "DEADBEEF_AUTO_SAVE_WASM_HEX",
  spending_guard: "DEADBEEF_SPENDING_GUARD_WASM_HEX",
  goal_release: "DEADBEEF_GOAL_RELEASE_WASM_HEX",
};

/**
 * Encode hook parameters as XRPL HookParameters array.
 */
function encodeHookParameters(
  type: HookType,
  params: AutoSaveHookParams | SpendingGuardParams | GoalReleaseParams
): Array<{ HookParameter: { HookParameterName: string; HookParameterValue: string } }> {
  const toHex = (n: number) =>
    Math.floor(n).toString(16).toUpperCase().padStart(8, "0");

  switch (type) {
    case "auto_save_percentage": {
      const p = params as AutoSaveHookParams;
      return [
        {
          HookParameter: {
            HookParameterName: "50455243454E54", // "PERCENT" hex
            HookParameterValue: toHex(p.percentage),
          },
        },
      ];
    }
    case "spending_guard": {
      const p = params as SpendingGuardParams;
      return [
        {
          HookParameter: {
            HookParameterName: "4441494C594C4D54", // "DAILYLMT" hex
            HookParameterValue: toHex(p.dailyLimit * 1_000_000), // drops
          },
        },
      ];
    }
    case "goal_release": {
      const p = params as GoalReleaseParams;
      return [
        {
          HookParameter: {
            HookParameterName: "5448524553484F4C44", // "THRESHOLD" hex
            HookParameterValue: toHex(p.releaseThreshold),
          },
        },
      ];
    }
  }
}

export class XrplHooksManager {
  /**
   * Deploy a hook on a goal wallet account using a SetHook transaction.
   *
   * @param client   - Raw xrpl.js Client (must be connected to Hooks-enabled node)
   * @param wallet   - Goal account wallet signing the SetHook tx
   * @param goalId   - The goal this hook protects
   * @param type     - Which hook to deploy
   * @param params   - Hook-specific parameters
   */
  async deployHook(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any,
    wallet: Wallet,
    goalId: string,
    type: HookType,
    params: AutoSaveHookParams | SpendingGuardParams | GoalReleaseParams
  ): Promise<XrplHook> {
    const wasmHex = HOOK_WASM_PLACEHOLDERS[type];

    if (wasmHex.startsWith("DEADBEEF")) {
      // In MVP demo mode, log but don't fail — WASM not compiled yet
      console.warn(
        `[AgentWise Hooks] WASM placeholder for ${type}. ` +
          "Replace with real compiled Hook binary before production."
      );
    }

    const hookParameters = encodeHookParameters(type, params);

    const setHookTx = {
      TransactionType: "SetHook",
      Account: wallet.address,
      Hooks: [
        {
          Hook: {
            CreateCode: wasmHex,
            HookApiVersion: 0,
            HookNamespace: Buffer.from(goalId.replace(/-/g, "")).toString("hex").slice(0, 64).padEnd(64, "0"),
            HookOn: "FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFBFFFFF",
            HookParameters: hookParameters,
          },
        },
      ],
    };

    try {
      await client.submitAndWait(setHookTx, { wallet });
    } catch (err) {
      throw new AgentWiseError(
        `Hook deployment failed for type ${type}`,
        "HOOK_DEPLOY_FAILED",
        err
      );
    }

    const hook: XrplHook = {
      hookId: uuidv4(),
      goalId,
      type,
      parameters: params,
      deployedAt: new Date().toISOString(),
    };

    return hook;
  }

  /**
   * Remove all hooks from a goal account (e.g., when goal is completed).
   */
  async removeHooks(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client: any,
    wallet: Wallet
  ): Promise<void> {
    const clearHookTx = {
      TransactionType: "SetHook",
      Account: wallet.address,
      Hooks: [{ Hook: {} }], // empty Hook object = delete
    };

    try {
      await client.submitAndWait(clearHookTx, { wallet });
    } catch (err) {
      throw new AgentWiseError(
        "Failed to remove hooks from goal account",
        "HOOK_REMOVE_FAILED",
        err
      );
    }
  }
}
