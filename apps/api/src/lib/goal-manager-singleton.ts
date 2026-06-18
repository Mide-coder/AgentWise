/**
 * Singleton GoalManager instance for the API process.
 * Reads config from environment variables.
 */
import { GoalManager, createTestnetConfig, createMainnetConfig } from "@agentwise/sdk";

function buildConfig() {
  const network = process.env.NEXT_PUBLIC_NETWORK ?? "testnet";
  const yellowApiKey = process.env.YELLOW_SDK_API_KEY ?? "dev-key";

  if (network === "mainnet") {
    const rlusdIssuer = process.env.NEXT_PUBLIC_RLUSD_ISSUER_MAINNET;
    if (!rlusdIssuer) {
      throw new Error("NEXT_PUBLIC_RLUSD_ISSUER_MAINNET must be set for mainnet");
    }
    return createMainnetConfig(yellowApiKey, rlusdIssuer);
  }

  return createTestnetConfig(yellowApiKey);
}

export const goalManager = new GoalManager(buildConfig());
