/**
 * @agentwise/sdk — Public API
 *
 * AgentWise core SDK combining:
 *  - Yellow Nitrolite state channels (off-chain recurring micro-deposits)
 *  - XRPL wallet + RLUSD settlement
 *  - XRPL Hooks for programmable savings rules
 */

// Types
export * from "./types/index.js";

// XRPL
export { XrplClient } from "./xrpl/client.js";
export { XrplHooksManager, HOOKS_TESTNET_URL } from "./xrpl/hooks.js";

// Yellow
export { YellowChannelManager } from "./yellow/channel.js";

// Goal Engine
export { GoalManager } from "./goal-engine/goal-manager.js";
export { closeDb, initializeDb } from "./db.js";

// Config helpers
export function createTestnetConfig(yellowApiKey: string) {
  return {
    xrpl: {
      environment: "testnet" as const,
      nodeUrl: "wss://s.altnet.rippletest.net:51233",
      rlusdIssuer: "rHb9CJAWyB4rj91VRWn96DkukG4bwdtyTh",
      rlusdCurrency: "RLUSD",
    },
    yellow: {
      environment: "sandbox" as const,
      brokerUrl: "wss://broker.sandbox.yellow.com",
      apiKey: yellowApiKey,
    },
  };
}

export function createMainnetConfig(yellowApiKey: string, rlusdIssuer: string) {
  return {
    xrpl: {
      environment: "mainnet" as const,
      nodeUrl: "wss://xrplcluster.com",
      rlusdIssuer,
      rlusdCurrency: "RLUSD",
    },
    yellow: {
      environment: "production" as const,
      brokerUrl: "wss://broker.yellow.com",
      apiKey: yellowApiKey,
    },
  };
}
