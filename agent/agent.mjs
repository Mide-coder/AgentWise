/**
 * AgentWise AI Agent — Node.js version
 * =====================================
 * Equivalent to agent.py but runs on Node.js (no Python needed).
 * 
 * Usage:
 *   node agent.mjs
 *
 * Set environment variables (or create agent/.env):
 *   NEXT_PUBLIC_API_URL      - API base URL (default: http://localhost:4000)
 *   AGENT_GOAL_ID            - Goal ID to monitor
 *   AGENT_XRPL_ADDRESS       - Participant XRPL address
 *   AGENT_TOP_UP_THRESHOLD_RLUSD - Min income to trigger top-up (default: 10)
 *   AGENT_POLL_INTERVAL_MS   - Poll interval in ms (default: 5000)
 */

import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// ── Load .env manually (no dotenv dep needed in Node 20+) ────────────────────
const __dir = dirname(fileURLToPath(import.meta.url));
const envFile = join(__dir, ".env");
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (key && rest.length) process.env[key.trim()] = rest.join("=").trim();
  }
}

// ── Config ────────────────────────────────────────────────────────────────────
const API_URL          = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const GOAL_ID          = process.env.AGENT_GOAL_ID ?? "";
const PARTICIPANT_ADDR = process.env.AGENT_XRPL_ADDRESS ?? "";
const THRESHOLD        = parseFloat(process.env.AGENT_TOP_UP_THRESHOLD_RLUSD ?? "10");
const POLL_MS          = parseInt(process.env.AGENT_POLL_INTERVAL_MS ?? "5000", 10);

// ── Logger ────────────────────────────────────────────────────────────────────
function log(level, msg) {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  console.log(`${ts} [AgentWise] ${level.padEnd(5)}  ${msg}`);
}

// ── Mock income detector ──────────────────────────────────────────────────────
function checkIncome() {
  // Simulate income arriving ~40% of the time, 5–50 RLUSD
  if (Math.random() < 0.4) {
    const amount = parseFloat((5 + Math.random() * 45).toFixed(2));
    log("INFO", `Income detected: ${amount} RLUSD`);
    return amount;
  }
  return 0;
}

// ── API calls ─────────────────────────────────────────────────────────────────
async function getStatus() {
  const res = await fetch(`${API_URL}/api/agent/status/${GOAL_ID}`);
  if (!res.ok) throw new Error(`Status fetch failed: ${res.status}`);
  return res.json();
}

async function triggerTopUp(incomeAmount) {
  const res = await fetch(`${API_URL}/api/agent/top-up`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      goalId: GOAL_ID,
      incomeAmount,
      participantAddress: PARTICIPANT_ADDR,
      additionalFunding: parseFloat((incomeAmount * 0.1).toFixed(4)),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Top-up failed ${res.status}: ${body}`);
  }
  return res.json();
}

// ── Main loop ─────────────────────────────────────────────────────────────────
async function run() {
  console.log("=".repeat(60));
  log("INFO", "AgentWise Autonomous Savings Agent (Node.js) starting...");
  log("INFO", `API:              ${API_URL}`);
  log("INFO", `Goal ID:          ${GOAL_ID || "⚠ NOT SET"}`);
  log("INFO", `Participant:      ${PARTICIPANT_ADDR || "⚠ NOT SET"}`);
  log("INFO", `Threshold:        ${THRESHOLD} RLUSD`);
  log("INFO", `Poll interval:    ${POLL_MS}ms`);
  console.log("=".repeat(60));

  if (!GOAL_ID) {
    log("ERROR", "AGENT_GOAL_ID not set. Create a goal first via the dashboard.");
    process.exit(1);
  }

  let errors = 0;
  let cycles = 0;

  while (true) {
    cycles++;
    try {
      // 1. Get current goal status
      const status = await getStatus();
      const p = status.progress;
      log("INFO", `[Cycle ${cycles}] ${status.goal.name} | Saved: ${p.savedAmount.toFixed(2)}/${p.targetAmount.toFixed(2)} RLUSD (${p.percentComplete.toFixed(1)}%) | ${p.daysRemaining}d left`);

      // 2. Check for income
      const income = checkIncome();

      // 3. Act if above threshold
      if (income >= THRESHOLD) {
        log("INFO", `Income ${income} >= threshold ${THRESHOLD}. Triggering top-up...`);
        const result = await triggerTopUp(income);
        const action = result.action;

        if (action === "deposit_executed") {
          log("INFO", `  ✓ Deposit: ${result.deposit.amount} RLUSD | channel: ${result.deposit.channelId}`);
          log("INFO", `  → Progress: ${result.progress.percentComplete.toFixed(1)}%`);
        } else if (action === "channel_opened") {
          log("INFO", `  ✓ New channel opened: ${result.channelId}`);
        } else {
          log("INFO", `  Action: ${action}`);
        }

        if (p.percentComplete >= 100) {
          log("INFO", "🎉 Goal COMPLETED! Agent shutting down.");
          break;
        }
      } else {
        log("DEBUG", `Income ${income.toFixed(2)} below threshold. No action.`);
      }

      errors = 0;
    } catch (err) {
      errors++;
      log("ERROR", `${err.message} (consecutive errors: ${errors})`);
      if (errors >= 5) {
        const backoff = POLL_MS * 4;
        log("WARN", `5 consecutive errors. Backing off ${backoff}ms...`);
        await new Promise(r => setTimeout(r, backoff));
        errors = 0;
        continue;
      }
    }

    await new Promise(r => setTimeout(r, POLL_MS));
  }
}

run().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
