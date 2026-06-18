import { Router, type IRouter } from "express";
import { z } from "zod";
import { goalManager } from "../lib/goal-manager-singleton.js";
import { Wallet } from "xrpl";

export const hooksRouter: IRouter = Router();

const deployHookSchema = z.object({
  goalId: z.string().uuid(),
  type: z.enum(["auto_save_percentage", "spending_guard", "goal_release"]),
  params: z.union([
    z.object({ percentage: z.number().min(1).max(100) }),
    z.object({ dailyLimit: z.number().positive() }),
    z.object({ releaseThreshold: z.number().min(1).max(100) }),
  ]),
  /** The goal wallet seed for signing the SetHook transaction (handle with care!) */
  walletSeed: z.string().min(29),
});

// ── POST /api/hooks/deploy ─────────────────────────────────────────────────────

hooksRouter.post("/deploy", async (req, res, next) => {
  try {
    const body = deployHookSchema.parse(req.body);
    const wallet = Wallet.fromSeed(body.walletSeed);

    await goalManager.deployHook(body.goalId, body.type, body.params, wallet);

    res.status(201).json({ success: true, message: `Hook ${body.type} deployed on goal ${body.goalId}` });
  } catch (err) {
    next(err);
  }
});
