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

## Example: rategenius (MagicStay MarketResearch)

To run a test purchase from **rategenius** (MagicStay Market Research — dynamic pricing engine):

- **Endpoint:** `http://localhost:3003/service` (they use `/service`, not `/query`)
- **Agent DID:** `19382499784507691897099813046158899650802606062565712631387582302174094534652`
- **Plan DID:** `97866696145535066453103713195260098266633201693062554670376824816568438944699`

Ensure their service is running on port 3003, then:

```bash
export NVM_API_KEY=<your-buyer-sandbox-key>
export NVM_ENVIRONMENT=sandbox
export NVM_PLAN_ID=97866696145535066453103713195260098266633201693062554670376824816568438944699
export NVM_AGENT_ID=19382499784507691897099813046158899650802606062565712631387582302174094534652
export SELLER_URL=http://localhost:3003
export SELLER_ENDPOINT_PATH=/service

npm run buyer:order-and-call "best rate for a 2-night stay next weekend"
```

To save the response for proof:

```bash
BUYER_SAVE_RESPONSE_TO=1 npm run buyer:order-and-call "best rate for a 2-night stay"
```

If the Nevermined SDK expects full DIDs, try prefixing with `did:nv:` (e.g. `NVM_PLAN_ID=did:nv:97866...`).

## Notes

- **Credits / USDC:** Each plan order and each request uses credits (or subscription). Don’t overspend; our sandbox plan is 5 USDC for 100 credits.
- **Same key:** You can use your usual Doppler config and key; only the target plan/agent/URL change when buying from another team.
- **Stash location:** `tmp/purchased/` is in `.gitignore`; nothing there is committed. Use it to keep purchased responses for demos or proof without polluting the repo.
- **Other endpoints:** If the seller uses a path other than `/query`, set `SELLER_ENDPOINT_PATH` (e.g. `SELLER_ENDPOINT_PATH=/service`).
