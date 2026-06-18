"""
AgentWise AI Agent — Autonomous Savings Monitor
================================================
A lightweight Python agent that:
  1. Polls a mock income source (or real XRPL account) for incoming payments.
  2. When income >= threshold, calls the AgentWise API to trigger an auto top-up
     (opens a state channel if needed, or executes a deposit).
  3. Logs all actions for auditability.

Usage:
    cp ../.env.example .env  # fill in AGENT_* vars
    python agent.py

For production, replace mock_check_income() with real XRPL account monitoring.
"""

import os
import time
import logging
import httpx
from dotenv import load_dotenv

load_dotenv()

# ── Config ─────────────────────────────────────────────────────────────────────

API_URL: str = os.getenv("NEXT_PUBLIC_API_URL", "http://localhost:4000")
GOAL_ID: str = os.getenv("AGENT_GOAL_ID", "")
PARTICIPANT_ADDRESS: str = os.getenv("AGENT_XRPL_ADDRESS", "")
TOP_UP_THRESHOLD: float = float(os.getenv("AGENT_TOP_UP_THRESHOLD_RLUSD", "10"))
POLL_INTERVAL: int = int(os.getenv("AGENT_POLL_INTERVAL_SECONDS", "30"))
XRPL_NODE: str = os.getenv("NEXT_PUBLIC_XRPL_NODE_TESTNET", "wss://s.altnet.rippletest.net:51233")

# ── Logger ─────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [AgentWise Agent] %(levelname)s  %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
log = logging.getLogger("agentwise")


# ── Mock Income Source ─────────────────────────────────────────────────────────

def mock_check_income() -> float:
    """
    Simulate checking for new income.

    In production, replace with:
      - xrpl-py account subscription to detect incoming payments
      - Integration with payroll / freelance platform webhooks
      - Chipper Cash or Yellow Card balance polling

    Returns the detected income amount in RLUSD (0.0 if none).
    """
    import random
    # Simulate income arriving ~40% of the time, between ₦500–₦5000 (mock RLUSD)
    if random.random() < 0.4:
        amount = round(random.uniform(5.0, 50.0), 2)
        log.info(f"Income detected: {amount} RLUSD")
        return amount
    return 0.0


# ── API Calls ──────────────────────────────────────────────────────────────────

def get_goal_status(client: httpx.Client) -> dict:
    """Fetch current goal status from the AgentWise API."""
    resp = client.get(f"{API_URL}/api/agent/status/{GOAL_ID}", timeout=10)
    resp.raise_for_status()
    return resp.json()


def trigger_top_up(client: httpx.Client, income_amount: float) -> dict:
    """
    Signal the AgentWise API to execute a deposit or open a channel.
    The API handles the logic of whether to deposit off-chain or open a new channel.
    """
    payload = {
        "goalId": GOAL_ID,
        "incomeAmount": income_amount,
        "participantAddress": PARTICIPANT_ADDRESS,
        "additionalFunding": round(income_amount * 0.1, 4),  # auto-save 10% of income
    }
    resp = client.post(f"{API_URL}/api/agent/top-up", json=payload, timeout=15)
    resp.raise_for_status()
    return resp.json()


# ── Main Loop ──────────────────────────────────────────────────────────────────

def run_agent() -> None:
    """Main polling loop."""
    log.info("=" * 60)
    log.info("AgentWise Autonomous Savings Agent starting…")
    log.info(f"  API:              {API_URL}")
    log.info(f"  Goal ID:          {GOAL_ID or '⚠ NOT SET'}")
    log.info(f"  Participant:      {PARTICIPANT_ADDRESS or '⚠ NOT SET'}")
    log.info(f"  Top-up threshold: {TOP_UP_THRESHOLD} RLUSD")
    log.info(f"  Poll interval:    {POLL_INTERVAL}s")
    log.info("=" * 60)

    if not GOAL_ID:
        log.error("AGENT_GOAL_ID not set. Create a goal first, then set it in .env")
        return

    consecutive_errors = 0

    with httpx.Client() as client:
        while True:
            try:
                # 1. Check current goal status
                status = get_goal_status(client)
                progress = status.get("progress", {})
                log.info(
                    f"Goal: {status['goal']['name']} | "
                    f"Saved: {progress.get('savedAmount', 0):.2f} / "
                    f"{progress.get('targetAmount', 0):.2f} RLUSD "
                    f"({progress.get('percentComplete', 0):.1f}%)"
                )

                # 2. Check for income
                income = mock_check_income()

                # 3. Trigger top-up if above threshold
                if income >= TOP_UP_THRESHOLD:
                    log.info(f"Income {income} RLUSD >= threshold {TOP_UP_THRESHOLD}. Triggering top-up…")
                    result = trigger_top_up(client, income)
                    action = result.get("action", "unknown")
                    log.info(f"Top-up result: {action}")

                    if action == "deposit_executed":
                        deposit = result.get("deposit", {})
                        log.info(
                            f"  Deposit: {deposit.get('amount', 0):.2f} RLUSD "
                            f"(channel: {deposit.get('channelId', 'n/a')})"
                        )
                    elif action == "channel_opened":
                        log.info(f"  New channel: {result.get('channelId')}")

                    after_pct = result.get("progress", {}).get("percentComplete", 0)
                    log.info(f"  Progress after: {after_pct:.1f}%")
                else:
                    log.debug(f"Income {income:.2f} RLUSD below threshold. No action.")

                consecutive_errors = 0

            except httpx.HTTPStatusError as e:
                log.error(f"API error {e.response.status_code}: {e.response.text[:200]}")
                consecutive_errors += 1
            except httpx.RequestError as e:
                log.error(f"Network error: {e}")
                consecutive_errors += 1
            except Exception as e:
                log.error(f"Unexpected error: {e}")
                consecutive_errors += 1

            # Back-off on repeated errors
            if consecutive_errors >= 5:
                backoff = POLL_INTERVAL * 4
                log.warning(f"5 consecutive errors. Backing off {backoff}s…")
                time.sleep(backoff)
                consecutive_errors = 0
            else:
                time.sleep(POLL_INTERVAL)


# ── Entry Point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    run_agent()
