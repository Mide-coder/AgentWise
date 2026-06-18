# AgentWise

> Non-Custodial Automated Savings & Goal-Based Micro-Investing for Humans and AI Agents

Built on **Yellow SDK (Nitrolite state channels)** + **XRPL (Hooks + RLUSD + final settlement)**

---

## Status

| Component | Build | Tests |
|---|---|---|
| `@agentwise/sdk` | ✅ Passing | ✅ 13/13 |
| `@agentwise/api` | ✅ Passing | — |
| `@agentwise/web` | ✅ Passing | — |
| `agent/agent.mjs` | ✅ Running | ✅ Live E2E |

---

## What is AgentWise?

The first non-custodial "Cowrywise for the agent economy." Humans and AI agents can:

- Create savings goals (emergency fund, travel, education, business capital)
- Automate recurring micro-deposits via **Yellow Nitrolite state channels** — near-instant, near-zero fees
- Enforce savings rules with **XRPL Hooks** (auto-save %, spending guards, goal-release conditions)
- Store value safely in **RLUSD** (USD stablecoin on XRPL)
- Let an AI agent autonomously monitor income and trigger deposits

Primary market: Nigeria and broader Africa — freelancers, gig workers, diaspora remittances.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Frontend  apps/web  (Next.js 15 + Tailwind)            │
│  Routes: /  /dashboard  /dashboard/goals/[id]           │
└────────────────────┬────────────────────────────────────┘
                     │  REST  http://localhost:4000
┌────────────────────▼────────────────────────────────────┐
│  API  apps/api  (Express + TypeScript ESM)              │
│  /api/goals  /api/channels  /api/hooks  /api/agent      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│  @agentwise/sdk  packages/sdk                           │
│  ┌──────────────────┐  ┌───────────────────────────┐   │
│  │ YellowChannel    │  │ XrplClient + HooksManager │   │
│  │ Manager          │  │ (xrpl.js + SetHook tx)    │   │
│  └────────┬─────────┘  └────────────┬──────────────┘   │
│           └──────────────┬──────────┘                   │
│                 ┌────────▼──────────┐                   │
│                 │   GoalManager     │                   │
│                 └───────────────────┘                   │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│  AI Agent  agent/agent.mjs  (Node.js, no deps)          │
│  Polls income → POST /api/agent/top-up autonomously     │
└─────────────────────────────────────────────────────────┘
```

---

## Monorepo Layout

```
agentwise/
├── packages/
│   └── sdk/                    # @agentwise/sdk — core library
│       └── src/
│           ├── types/           # All domain types
│           ├── xrpl/            # XrplClient + XrplHooksManager
│           ├── yellow/          # YellowChannelManager (mock broker)
│           ├── goal-engine/     # GoalManager — full lifecycle
│           └── tests/           # 13 vitest unit + E2E tests
├── apps/
│   ├── api/                    # Express REST API (ESM)
│   │   └── src/
│   │       ├── routes/          # goals, channels, hooks, agent
│   │       ├── middleware/      # typed error handler
│   │       └── lib/             # GoalManager singleton
│   └── web/                    # Next.js 15 frontend
│       └── src/
│           ├── app/             # App Router pages
│           ├── components/      # UI (Navbar, GoalCard, Chart…)
│           └── contexts/        # WalletContext, GoalsContext
├── agent/
│   ├── agent.mjs               # Node.js autonomous AI agent ✅
│   └── agent.py                # Python version (needs Python 3.10+)
├── start-dev.ps1               # Windows dev launcher
├── pnpm-workspace.yaml
└── .env.example
```

---

## Prerequisites

- **Node.js 20+** — install from https://nodejs.org or `winget install OpenJS.NodeJS.LTS`
- **pnpm 9+** — `npm install -g pnpm`

---

## Install

```powershell
pnpm install
```

---

## Build all

```powershell
# SDK
pnpm --filter @agentwise/sdk build

# API
pnpm --filter @agentwise/api build

# Web
pnpm --filter @agentwise/web build
```

---

## Run (development)

### API server (port 4000)

```powershell
# Using built dist
$env:Path += ";C:\Program Files\nodejs"
$env:NEXT_PUBLIC_NETWORK = "testnet"
$env:YELLOW_SDK_API_KEY  = "dev-key"
$env:PORT = "4000"
node apps/api/dist/server.js
```

### Web frontend (port 3000)

```powershell
# In a separate terminal
$env:Path += ";C:\Program Files\nodejs"
cd apps/web
pnpm dev
```

### Or use the launcher

```powershell
.\start-dev.ps1          # starts both API + Web in new windows
.\start-dev.ps1 -ApiOnly # API only
.\start-dev.ps1 -WebOnly # Web only
```

---

## Run tests

```powershell
pnpm --filter @agentwise/sdk test
```

Output:
```
✓ Goal creation (3)
✓ State channel (2)
✓ Recurring deposits (3)
✓ Net settlement (2)
✓ Goal progress (2)
✓ Full end-to-end flow (1)

Test Files  1 passed (1)
Tests       13 passed (13)
```

---

## Run the AI Agent

```powershell
# 1. Create a goal via the dashboard or API, copy its ID
# 2. Set it in agent/.env
# 3. Run:
$env:Path += ";C:\Program Files\nodejs"
node agent/agent.mjs
```

The agent polls every 5s, detects mock income, and triggers deposits autonomously:
```
2026-06-18 11:14:35 [AgentWise] INFO   Income detected: 21.34 RLUSD
2026-06-18 11:14:35 [AgentWise] INFO   Income 21.34 >= threshold 10. Triggering top-up...
2026-06-18 11:14:35 [AgentWise] INFO     ✓ Deposit: 5 RLUSD | channel: ch_eabef125-...
2026-06-18 11:14:35 [AgentWise] INFO     → Progress: 3.0%
```

---

## API Reference

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/goals` | List all goals |
| POST | `/api/goals` | Create goal |
| GET | `/api/goals/:id` | Get goal |
| GET | `/api/goals/:id/progress` | Progress stats |
| GET | `/api/goals/:id/deposits` | Deposit history |
| POST | `/api/goals/:id/deposit-rule` | Set recurring rule |
| POST | `/api/goals/:id/deposit` | Execute one deposit |
| POST | `/api/goals/:id/settle` | Settle channel → XRPL |
| POST | `/api/channels/open` | Open Yellow state channel |
| POST | `/api/hooks/deploy` | Deploy XRPL Hook |
| POST | `/api/agent/top-up` | AI agent income signal |
| GET | `/api/agent/status/:id` | Goal status for agent |

---

## XRPL Hooks

Three MVP hooks defined in `packages/sdk/src/xrpl/hooks.ts`:

| Hook | Purpose |
|---|---|
| `auto_save_percentage` | Routes X% of incoming payments to savings |
| `spending_guard` | Enforces daily outflow limit |
| `goal_release` | Blocks withdrawals until goal reaches threshold % |

Hook WASM binaries must be compiled with [XRPL Hooks Builder](https://hooks-builder.xrpl.org/). Replace the placeholder hex strings in `hooks.ts` before production.

---

## Networks

| | XRPL Node | Yellow |
|---|---|---|
| Testnet | `wss://s.altnet.rippletest.net:51233` | sandbox broker |
| Hooks testnet | `wss://hooks-testnet2.xrpl-labs.com` | sandbox broker |
| Mainnet | `wss://xrplcluster.com` | production broker |

Switch via `NEXT_PUBLIC_NETWORK=mainnet` in `.env`.

---

## Next Steps

See the roadmap below.

---

## License

MIT — open source, built for the XRPL Africa + Yellow Builder ecosystem.
