import "dotenv/config";
import express, { type Express } from "express";
import cors from "cors";
import { goalsRouter } from "./routes/goals.js";
import { channelsRouter } from "./routes/channels.js";
import { hooksRouter } from "./routes/hooks.js";
import { agentRouter } from "./routes/agent.js";
import { errorHandler } from "./middleware/error-handler.js";
import { closeDb, initializeDb } from "@agentwise/sdk";

const app: Express = express();
const PORT = process.env.PORT ?? 4000;

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CORS_ORIGIN ?? "http://localhost:3000" }));
app.use(express.json());

// ── Health ────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString(), version: "0.1.0" });
});

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/goals", goalsRouter);
app.use("/api/channels", channelsRouter);
app.use("/api/hooks", hooksRouter);
app.use("/api/agent", agentRouter);

// ── Error handler ─────────────────────────────────────────────────────────────
app.use(errorHandler);

async function start(): Promise<void> {
  try {
    await initializeDb();
    app.listen(PORT, () => {
      console.log(`AgentWise API running on http://localhost:${PORT}`);
      console.log(`Network: ${process.env.NEXT_PUBLIC_NETWORK ?? "testnet"}`);
    });
  } catch (err) {
    console.error("Failed to initialize database:", err);
    process.exit(1);
  }
}

function shutdown(): void {
  closeDb();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

start();

export default app;
