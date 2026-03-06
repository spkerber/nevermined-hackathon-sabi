# Buying from another Nevermined agent

To test that our **buyer agent** can purchase from **another team’s** Nevermined agent (hackathon: “buy from 2+ teams”), use the same buyer script with their plan/agent/URL and optionally stash the response.

## Steps

1. **Get the other agent’s details**  
   From the other team or the Nevermined marketplace/catalog you need:
   - **Plan ID** (`NVM_PLAN_ID`) — the plan you’ll subscribe to.
   - **Agent ID** (`NVM_AGENT_ID`) — the agent that serves the protected resource.
   - **Seller URL** (`SELLER_URL`) — the base URL of their API (e.g. `https://their-agent.example.com`).

2. **Set env (or a separate Doppler config)**  
   Use your **buyer** `NVM_API_KEY` (same key is fine for testing) and the **other** agent’s IDs and URL:
   ```bash
   export NVM_PLAN_ID=<their-plan-id>
   export NVM_AGENT_ID=<their-agent-id>
   export SELLER_URL=https://their-agent.example.com
   ```
   Or in Doppler: create a config (e.g. `buy-external`) with those values and run with `doppler run --config buy-external --`.

3. **Run the buyer and stash the response**  
   Order their plan, get an x402 token, and call their endpoint. To **save the response** somewhere safe (e.g. to prove you bought from them):
   ```bash
   # Stash to default path: tmp/purchased/response-<timestamp>.json (tmp/ is gitignored)
   BUYER_SAVE_RESPONSE_TO=1 doppler run -- npm run buyer:order-and-call "optional prompt"

   # Or specify a path (must be under tmp/purchased/ for security)
   BUYER_SAVE_RESPONSE_TO=tmp/purchased/other-team-response.json doppler run -- npm run buyer:order-and-call
   ```
   The saved file contains `{ ok, status, body }` so you have a record of the purchased asset (even if the body isn’t useful beyond testing).

4. **Repeat for a second team**  
   Change `NVM_PLAN_ID`, `NVM_AGENT_ID`, and `SELLER_URL` to another agent’s values and run again. Use a different `BUYER_SAVE_RESPONSE_TO` path if you want to keep both responses (e.g. `tmp/purchased/team-a.json`, `tmp/purchased/team-b.json`).

## Notes

- **Credits / USDC:** Each plan order and each request uses credits (or subscription). Don’t overspend; our sandbox plan is 5 USDC for 100 credits.
- **Same key:** You can use your usual Doppler config and key; only the target plan/agent/URL change when buying from another team.
- **Stash location:** `tmp/purchased/` is in `.gitignore`; nothing there is committed. Use it to keep purchased responses for demos or proof without polluting the repo.
