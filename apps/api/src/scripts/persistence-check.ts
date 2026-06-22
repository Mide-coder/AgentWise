/**
 * Persistence check script.
 * Creates a goal, closes the DB, reopens it, and verifies the goal survived.
 * Run with: node --import tsx/esm src/scripts/persistence-check.ts
 */
import path from "node:path";
import fs from "node:fs";
import { GoalManager, initializeDb, closeDb, createTestnetConfig } from "@agentwise/sdk";

async function main(): Promise<void> {
  const dbPath = path.resolve(process.cwd(), "./agentwise.persistence-check.db");
  process.env.DATABASE_PATH = dbPath;

  // Clean slate
  if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);

  const config = createTestnetConfig("persistence-check-key");

  // ── Pass 1: create a goal ────────────────────────────────────────────────
  await initializeDb();
  const manager1 = new GoalManager(config);
  const created = await manager1.createGoal({
    name: "Persistence Check Goal",
    targetAmount: 99.99,
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
  console.log(`[1] Created: ${created.id} | ${created.name} | ${created.targetAmount} RLUSD`);
  closeDb();

  // ── Pass 2: reopen and verify ────────────────────────────────────────────
  await initializeDb();
  const manager2 = new GoalManager(config);
  const reloaded = manager2.getGoal(created.id);

  if (!reloaded) {
    throw new Error(`FAIL: goal ${created.id} not found after reopening DB`);
  }
  if (reloaded.name !== created.name) {
    throw new Error(`FAIL: name mismatch — got "${reloaded.name}" expected "${created.name}"`);
  }
  if (reloaded.targetAmount !== created.targetAmount) {
    throw new Error(`FAIL: amount mismatch — got ${reloaded.targetAmount} expected ${created.targetAmount}`);
  }

  console.log(`[2] Reloaded: ${reloaded.id} | ${reloaded.name} | ${reloaded.targetAmount} RLUSD`);
  console.log(`\n✅ Persistence check PASSED — DB at ${dbPath}`);

  closeDb();
  fs.unlinkSync(dbPath);
}

main().catch((err) => {
  console.error(`\n❌ Persistence check FAILED: ${err.message}`);
  closeDb();
  process.exit(1);
});
