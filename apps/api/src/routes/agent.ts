/**
 * AI Agent endpoint.
 * Receives signals from the Python AI agent (e.g., income detected → trigger top-up).
 */
import { Router, type IRouter } from "express";
import { z } from "zod";
import { goalManager } from "../lib/goal-manager-singleton.js";

export const agentRouter: IRouter = Router();

const agentTopUpSchema = z.object({
  goalId: z.string().uuid(),
  /** Income amount detected by the agent */
  incomeAmount: z.number().positive(),
  /** XRPL address of the agent/user */
  participantAddress: z.string().min(25).max(35),
  /** Optional additional funding to add to the channel */
  additionalFunding: z.number().min(0.01).optional(),
});

// ── POST /api/agent/top-up ─────────────────────────────────────────────────────
// Called by the Python AI agent when income is detected above threshold.

agentRouter.post("/top-up", async (req, res, next) => {
  try {
    const body = agentTopUpSchema.parse(req.body);
    const goal = goalManager.getGoal(body.goalId);

    // If the goal has an open channel, execute a deposit
    if (goal.channelId && goal.depositRule) {
      const record = await goalManager.executeDeposit(body.goalId);
      res.json({
        action: "deposit_executed",
        deposit: record,
        progress: goalManager.getGoalProgress(body.goalId),
      });
    } else if (!goal.channelId) {
      // Open a new channel if none exists
      const funding = body.additionalFunding ?? body.incomeAmount * 0.1;
      const updatedGoal = await goalManager.openChannel(
        body.goalId,
        body.participantAddress,
        funding
      );
      res.json({
        action: "channel_opened",
        channelId: updatedGoal.channelId,
        progress: goalManager.getGoalProgress(body.goalId),
      });
    } else {
      res.json({
        action: "no_action",
        reason: "Goal has channel but no deposit rule configured",
      });
    }
  } catch (err) {
    next(err);
  }
});

// ── GET /api/agent/status/:goalId ──────────────────────────────────────────────

agentRouter.get("/status/:goalId", (req, res, next) => {
  try {
    const progress = goalManager.getGoalProgress(req.params.goalId);
    const goal = goalManager.getGoal(req.params.goalId);
    res.json({
      goal: { id: goal.id, name: goal.name, status: goal.status },
      progress,
      hasChannel: !!goal.channelId,
      hasDepositRule: !!goal.depositRule,
    });
  } catch (err) {
    next(err);
  }
});
