import { Router, type IRouter } from "express";
import { z } from "zod";
import { goalManager } from "../lib/goal-manager-singleton.js";

export const channelsRouter: IRouter = Router();

const openChannelSchema = z.object({
  goalId: z.string().uuid(),
  participantAddress: z.string().min(25).max(35),
  fundingAmount: z.number().min(0.01),
});

// ── POST /api/channels/open ────────────────────────────────────────────────────

channelsRouter.post("/open", async (req, res, next) => {
  try {
    const body = openChannelSchema.parse(req.body);
    const goal = await goalManager.openChannel(
      body.goalId,
      body.participantAddress,
      body.fundingAmount
    );
    res.status(201).json({ channelId: goal.channelId, goal });
  } catch (err) {
    next(err);
  }
});
