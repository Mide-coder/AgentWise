import { Router, type IRouter } from "express";
import { z } from "zod";
import { goalManager } from "../lib/goal-manager-singleton.js";

export const goalsRouter: IRouter = Router();

// ── Schemas ────────────────────────────────────────────────────────────────────

const createGoalSchema = z.object({
  name: z.string().min(1).max(60),
  description: z.string().max(240).optional(),
  targetAmount: z.number().positive().max(1_000_000),
  deadline: z.string().datetime(),
});

const depositRuleSchema = z.object({
  amount: z.number().min(0.01).max(10_000),
  frequency: z.enum(["hourly", "daily", "weekly", "monthly"]),
  active: z.boolean().default(true),
});

// ── GET /api/goals ─────────────────────────────────────────────────────────────

goalsRouter.get("/", (_req, res) => {
  res.json(goalManager.listGoals());
});

// ── POST /api/goals ────────────────────────────────────────────────────────────

goalsRouter.post("/", async (req, res, next) => {
  try {
    const body = createGoalSchema.parse(req.body);
    const goal = await goalManager.createGoal(body);
    res.status(201).json(goal);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/goals/:id ─────────────────────────────────────────────────────────

goalsRouter.get("/:id", (req, res, next) => {
  try {
    const goal = goalManager.getGoal(req.params.id);
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/goals/:id/progress ────────────────────────────────────────────────

goalsRouter.get("/:id/progress", (req, res, next) => {
  try {
    const progress = goalManager.getGoalProgress(req.params.id);
    res.json(progress);
  } catch (err) {
    next(err);
  }
});

// ── GET /api/goals/:id/deposits ────────────────────────────────────────────────

goalsRouter.get("/:id/deposits", (req, res, next) => {
  try {
    const history = goalManager.getDepositHistory(req.params.id);
    res.json(history);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/goals/:id/deposit-rule ──────────────────────────────────────────

goalsRouter.post("/:id/deposit-rule", (req, res, next) => {
  try {
    const body = depositRuleSchema.parse(req.body);
    const goal = goalManager.setDepositRule(req.params.id, body);
    res.json(goal);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/goals/:id/deposit ────────────────────────────────────────────────

goalsRouter.post("/:id/deposit", async (req, res, next) => {
  try {
    const record = await goalManager.executeDeposit(req.params.id);
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
});

// ── POST /api/goals/:id/settle ─────────────────────────────────────────────────

goalsRouter.post("/:id/settle", async (req, res, next) => {
  try {
    const record = await goalManager.settleGoal(req.params.id);
    res.json(record);
  } catch (err) {
    next(err);
  }
});
