import "dotenv/config";
import express, { type Express } from "express";
import cors from "cors";
import { goalsRouter } from "./routes/goals.js";
import { channelsRouter } from "./routes/channels.js";
import { hooksRouter } from "./routes/hooks.js";
import { agentRouter } from "./routes/agent.js";
import { errorHandler } from "./middleware/error-handler.js";

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

app.listen(PORT, () => {
  console.log(`AgentWise API running on http://localhost:${PORT}`);
  console.log(`Network: ${process.env.NEXT_PUBLIC_NETWORK ?? "testnet"}`);
});

export default app;
