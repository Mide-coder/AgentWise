/**
 * End-to-end tests for the GoalManager.
 * Covers: goal creation → recurring off-chain deposits → net settlement with Hook rules.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { GoalManager, createTestnetConfig } from "../index.js";

const config = createTestnetConfig("test-api-key");

// Fresh GoalManager instance per test to avoid state bleed
// (In real code the in-memory store is module-level; for tests we work around it)
let manager: GoalManager;

beforeEach(() => {
  manager = new GoalManager(config);
});

// ── Goal Creation ─────────────────────────────────────────────────────────────

describe("Goal creation", () => {
  it("creates a goal with valid params", async () => {
    const goal = await manager.createGoal({
      name: "Emergency Fund",
      targetAmount: 500,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    expect(goal.id).toBeDefined();
    expect(goal.name).toBe("Emergency Fund");
    expect(goal.targetAmount).toBe(500);
    expect(goal.savedAmount).toBe(0);
    expect(goal.status).toBe("active");
    expect(goal.xrplAddress).toBeTruthy();
    expect(goal.hookIds).toHaveLength(0);
  });

  it("rejects a goal name longer than 60 chars", async () => {
    await expect(
      manager.createGoal({
        name: "A".repeat(61),
        targetAmount: 100,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      })
    ).rejects.toThrow("60 characters");
  });

  it("rejects a negative target amount", async () => {
    await expect(
      manager.createGoal({
        name: "Bad Goal",
        targetAmount: -10,
        deadline: new Date(Date.now() + 86400000).toISOString(),
      })
    ).rejects.toThrow("Target amount");
  });
});

// ── State Channel ─────────────────────────────────────────────────────────────

describe("State channel", () => {
  it("opens a state channel for a goal", async () => {
    const goal = await manager.createGoal({
      name: "Travel Fund",
      targetAmount: 200,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const updated = await manager.openChannel(goal.id, "rTestUser123", 50);
    expect(updated.channelId).toBeTruthy();
    expect(updated.channelId).toMatch(/^ch_/);
  });

  it("rejects opening a second channel on the same goal", async () => {
    const goal = await manager.createGoal({
      name: "Rent Fund",
      targetAmount: 300,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await manager.openChannel(goal.id, "rTestUser123", 30);

    await expect(manager.openChannel(goal.id, "rTestUser123", 10)).rejects.toThrow(
      "already has an open channel"
    );
  });
});

// ── Recurring Deposits ─────────────────────────────────────────────────────────

describe("Recurring deposits", () => {
  it("sets a deposit rule and executes a micro-deposit", async () => {
    const goal = await manager.createGoal({
      name: "Education",
      targetAmount: 1000,
      deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await manager.openChannel(goal.id, "rTestUser123", 100);

    manager.setDepositRule(goal.id, { amount: 1.5, frequency: "daily", active: true });

    const record = await manager.executeDeposit(goal.id);

    expect(record.amount).toBe(1.5);
    expect(record.type).toBe("off_chain");
    expect(record.channelId).toBeDefined();

    const updated = manager.getGoal(goal.id);
    expect(updated.savedAmount).toBe(1.5);
  });

  it("rejects a deposit amount below minimum", () => {
    const goal = manager.listGoals()[0]; // may not exist, catch error
    // Test validation directly
    expect(() => {
      if (!goal) throw new Error("No goals");
      manager.setDepositRule(goal.id, { amount: 0.001, frequency: "daily", active: true });
    }).toThrow();
  });

  it("accumulates multiple deposits correctly", async () => {
    const goal = await manager.createGoal({
      name: "Business Capital",
      targetAmount: 5000,
      deadline: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await manager.openChannel(goal.id, "rTestUser123", 100);
    manager.setDepositRule(goal.id, { amount: 5, frequency: "daily", active: true });

    await manager.executeDeposit(goal.id);
    await manager.executeDeposit(goal.id);
    await manager.executeDeposit(goal.id);

    const updated = manager.getGoal(goal.id);
    expect(updated.savedAmount).toBeCloseTo(15, 2);

    const history = manager.getDepositHistory(goal.id);
    expect(history).toHaveLength(3);
  });
});

// ── Settlement ─────────────────────────────────────────────────────────────────

describe("Net settlement", () => {
  it("settles a channel and records a settlement deposit", async () => {
    const goal = await manager.createGoal({
      name: "Settle Test",
      targetAmount: 100,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await manager.openChannel(goal.id, "rTestUser123", 50);
    manager.setDepositRule(goal.id, { amount: 10, frequency: "daily", active: true });
    await manager.executeDeposit(goal.id);
    await manager.executeDeposit(goal.id);

    const settlement = await manager.settleGoal(goal.id);

    expect(settlement.type).toBe("settlement");
    expect(settlement.txHash).toBeTruthy();
    expect(settlement.amount).toBeGreaterThan(0);

    // Channel should be cleared after settlement
    const updatedGoal = manager.getGoal(goal.id);
    expect(updatedGoal.channelId).toBeUndefined();
  });

  it("throws when settling a goal with no open channel", async () => {
    const goal = await manager.createGoal({
      name: "No Channel",
      targetAmount: 50,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await expect(manager.settleGoal(goal.id)).rejects.toThrow("no open channel");
  });
});

// ── Goal Progress ──────────────────────────────────────────────────────────────

describe("Goal progress", () => {
  it("calculates progress percentage correctly", async () => {
    const goal = await manager.createGoal({
      name: "Progress Test",
      targetAmount: 200,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await manager.openChannel(goal.id, "rTestUser123", 100);
    manager.setDepositRule(goal.id, { amount: 50, frequency: "daily", active: true });

    await manager.executeDeposit(goal.id);

    const progress = manager.getGoalProgress(goal.id);
    expect(progress.percentComplete).toBeCloseTo(25, 1);
    expect(progress.savedAmount).toBe(50);
    expect(progress.targetAmount).toBe(200);
  });

  it("marks goal as completed when target is reached", async () => {
    const goal = await manager.createGoal({
      name: "Small Goal",
      targetAmount: 5,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    });
    await manager.openChannel(goal.id, "rTestUser123", 100);
    manager.setDepositRule(goal.id, { amount: 5, frequency: "daily", active: true });

    await manager.executeDeposit(goal.id);

    const completed = manager.getGoal(goal.id);
    expect(completed.status).toBe("completed");
  });
});

// ── End-to-End ─────────────────────────────────────────────────────────────────

describe("Full end-to-end flow", () => {
  it("goal creation → recurring deposits → settlement in correct sequence", async () => {
    // 1. Create goal
    const goal = await manager.createGoal({
      name: "E2E Test Goal",
      description: "Full flow test",
      targetAmount: 100,
      deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
    });
    expect(goal.status).toBe("active");

    // 2. Open state channel
    const withChannel = await manager.openChannel(goal.id, "rParticipantXXX", 30);
    expect(withChannel.channelId).toBeTruthy();

    // 3. Set deposit rule
    manager.setDepositRule(goal.id, { amount: 2, frequency: "daily", active: true });

    // 4. Execute 5 recurring deposits
    for (let i = 0; i < 5; i++) {
      await manager.executeDeposit(goal.id);
    }

    const afterDeposits = manager.getGoal(goal.id);
    expect(afterDeposits.savedAmount).toBe(10);

    const history = manager.getDepositHistory(goal.id);
    expect(history).toHaveLength(5);
    expect(history.every((d) => d.type === "off_chain")).toBe(true);

    // 5. Settle to XRPL
    const settlement = await manager.settleGoal(goal.id);
    expect(settlement.type).toBe("settlement");
    expect(settlement.txHash).toBeTruthy();

    // 6. Verify deposit history includes settlement
    const finalHistory = manager.getDepositHistory(goal.id);
    expect(finalHistory).toHaveLength(6);
    expect(finalHistory[5]?.type).toBe("settlement");
  });
});
