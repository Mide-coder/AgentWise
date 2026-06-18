import type { Request, Response, NextFunction } from "express";
import { AgentWiseError } from "@agentwise/sdk";
import { ZodError } from "zod";

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.flatten().fieldErrors,
    });
    return;
  }

  if (err instanceof AgentWiseError) {
    const statusMap: Record<string, number> = {
      GOAL_NOT_FOUND: 404,
      CHANNEL_NOT_FOUND: 404,
      INVALID_GOAL_NAME: 400,
      INVALID_TARGET_AMOUNT: 400,
      INVALID_DEPOSIT_AMOUNT: 400,
      MAX_GOALS_EXCEEDED: 409,
      CHANNEL_ALREADY_OPEN: 409,
      NO_CHANNEL: 409,
      NO_DEPOSIT_RULE: 409,
    };

    res.status(statusMap[err.code] ?? 500).json({
      error: err.message,
      code: err.code,
    });
    return;
  }

  console.error("[API Error]", err);
  res.status(500).json({ error: "Internal server error" });
}
