# Doppler and Environment Variables

Secrets and config are managed via **Doppler** in CI/deploy; for local dev you can use a `.env` file (copy from `.env.example`).

## Doppler project

- **Project:** `nevermined-hackathon-sabi`
- **Dashboard:** [Doppler → nevermined-hackathon-sabi](https://dashboard.doppler.com/workplace/37ee0f06177aa6997f55/projects/nevermined-hackathon-sabi)

## Required secrets (seller agent)

| Variable | Description | Where to get it |
|----------|-------------|-----------------|
| `NVM_API_KEY` | Nevermined API key (sandbox or production) | [Nevermined App](https://nevermined.app) → API Keys |
| `NVM_ENVIRONMENT` | `sandbox` or `live` | Use `sandbox` for testing; `live` for production |
| `NVM_AGENT_ID` | Seller agent ID | Output of `npm run register-agent` |
| `NVM_PLAN_ID` | Payment plan ID | Output of `npm run register-agent` |
| `BUILDER_ADDRESS` | Wallet address for receiving payments | Your Base Sepolia (sandbox) or mainnet wallet |
| `NVM_USDC_ADDRESS` | USDC contract (optional; default Base Sepolia) | See [5-minute setup](https://nevermined.ai/docs/integrate/quickstart/5-minute-setup) |

## Optional (app/hosting)

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default 3000) |
| `APP_URL` | **Public base URL of your deployed seller** — our backend: `https://sabi-backend.ben-imadali.workers.dev`. No trailing slash. Nevermined and the hackathon marketplace use this; the buyer endpoint is `APP_URL/query`. |
| `REMOTION_API_KEY` | Remotion API key (for demo-video cloud render or team features) | [Remotion](https://remotion.dev) → Account. Optional; Remotion is [free for individuals](https://www.remotion.dev/docs); local Studio and render work without any key. |

### Using your Cloudflare deployment URL

1. **Doppler (or .env):** Set `APP_URL` to `https://sabi-backend.ben-imadali.workers.dev` (our deployed backend). No trailing slash.
2. **Re-register the agent:** Run `npm run register-agent` with this `APP_URL` so Nevermined has the correct endpoint. Add the printed `NVM_AGENT_ID` and `NVM_PLAN_ID` to Doppler if they change.
3. **Hackathon marketplace:** In the team/agent listing, set **Endpoint URL** to `https://sabi-backend.ben-imadali.workers.dev/query`.
4. **Cloudflare Worker env:** If the seller runs on Workers, set `APP_URL` (or the equivalent) in the Worker’s env / secrets so it can report the correct URL if needed.

### Nevermined App — API Configuration

In the **Nevermined App**, your agent has an **API Configuration** section. Set the base URL to your deployed seller URL (from Doppler `APP_URL`) so buyers and the proxy hit the right origin.

| Field | Set to |
|-------|--------|
| **Protected API Endpoints** → POST | `https://sabi-backend.ben-imadali.workers.dev/query` |
| **Agent Definition URL** | `https://sabi-backend.ben-imadali.workers.dev/` |

After setting `APP_URL` in Doppler to your Cloudflare URL, use that same base above. Add the **test4test USDC** and **test4test USD** plans to Protected API Endpoints (see [docs/agent-permissions-x402.md](agent-permissions-x402.md)). You can re-run `npm run register-agent` to push the new URLs to Nevermined if the registration API updates the agent; otherwise edit these fields manually in the Nevermined App under your agent → API Configuration → *View and edit all API configuration details*.

We follow Nevermined’s **Static Resources Protection & Monetization** pattern: the Worker is the origin; Nevermined validates payment (x402) and may proxy to it. See [docs.nevermined.app](https://docs.nevermined.app/llms.txt) (doc index) and the [Static Resources Protection](https://nevermined.ai/docs/solutions/access-control-monetization-static-resources) guide.

## Buyer (subscriber) usage

**Recommended for solo testing:** Use the **same** `NVM_API_KEY` for both registering the agent (seller) and testing as buyer. One Doppler config with that key plus `NVM_AGENT_ID` and `NVM_PLAN_ID` is enough: run `register-agent`, run the seller, then run the buyer script with the same key — you’re the subscriber to your own plan.

- **Same key (seller + buyer):** One key in Doppler; use it for `npm run register-agent`, `npm run seller`, and `npm run buyer:order-and-call`. No second key or config needed.
- **Separate buyer key:** Only if you need a different account as subscriber (e.g. another team). Then use a second Doppler config (e.g. `buyer-dev`) with the buyer’s `NVM_API_KEY` and the same `NVM_PLAN_ID` / `NVM_AGENT_ID`.

### Sandbox budget (e.g. 5 USDC)

Our plan is **5 USDC for 100 credits** (1 credit per request). With only 5 USDC in the sandbox:

- **Order the plan once** (in the App or via the buyer script). That spends your 5 USDC and gives you 100 credits.
- Use those credits for up to 100 calls to `POST /query`; each successful request burns 1 credit. No extra USDC needed until credits run out.
- Don’t order the plan again unless you want to buy another 100 credits (and have more USDC). One order = one 5 USDC charge.

### Buyer key and permissions (troubleshooting)

If the buyer script fails with **"Unable to order plan"** or **`BCK.PROTOCOL.0005`**, permissions or plan setup in Nevermined are the usual cause.

1. **Buyer key** — Use the **same** key as the seller when you’re both registering and testing (one account, one config). The key must be able to subscribe to the plan; create it in [Nevermined App](https://nevermined.app) → API Keys. Use a different key only if you need another account as the subscriber.
2. **Order the plan in the App first** — In [Nevermined App → Permissions](https://nevermined.app/permissions/global-permissions), find your plan and **order it** (subscribe) with the buyer account. Use test USDC on Base Sepolia for sandbox. After the plan is ordered in the App, the same key can get an x402 token and call the seller; sometimes programmatic `orderPlan()` only works after the plan is orderable (e.g. published) or after a first order via the App.
3. **Same environment** — Buyer key, `NVM_PLAN_ID`, and `NVM_AGENT_ID` must all be for the same environment (`sandbox` or `live`). Plan IDs from sandbox registration are not valid in live and vice versa.
4. **Doppler** — Use the **same** config for seller and buyer when using one key: it should have `NVM_API_KEY`, `NVM_PLAN_ID`, and `NVM_AGENT_ID`. Only use a separate config (e.g. `buyer-dev`) when you have a different subscriber key.

## How to test both buying and selling (same key, Doppler)

Prereq: You’ve run `npm run register-agent` once and added `NVM_AGENT_ID`, `NVM_PLAN_ID`, and `NVM_API_KEY` (and `BUILDER_ADDRESS`) to Doppler. Plan is 5 USDC for 100 credits; order once in the App or via the buyer script.

**Terminal 1 — seller (selling):**

```bash
cd /path/to/nevermined-hackathon-sabi
doppler run -- npm run seller
```

Leave this running. You should see: `Sabi seller agent listening on http://localhost:3000`.

**Terminal 2 — test selling (no payment → 402):**

```bash
curl -X POST http://localhost:3000/query -H "Content-Type: application/json" -d '{"prompt": "Hello"}'
```

Expect **402** and a JSON body with `"error": "Payment Required"` and a `plans` array. That’s the seller correctly rejecting unpaid requests.

**Terminal 2 — test buying (order plan + call seller):**

```bash
cd /path/to/nevermined-hackathon-sabi
doppler run -- npm run buyer:order-and-call "Are the vending machines working?"
```

Same Doppler config (same `NVM_API_KEY`, `NVM_PLAN_ID`, `NVM_AGENT_ID`). The script will order the plan (if not already ordered), get an x402 token, then `POST /query` with `payment-signature`. Expect a **200** and a JSON `result` — that’s a successful paid request; 1 credit is burned.

**One-liner test (steps 5–8):** With the seller already running in another terminal:

```bash
doppler run -- npm run test:payment-flow
```

This runs: (1) curl without payment (402), (2) buyer script (order + token + call). Use it after the seller is up.

---

## Local dev without Doppler

1. Copy `.env.example` to `.env`.
2. Fill in `NVM_API_KEY`, `BUILDER_ADDRESS`.
3. Run `npm run register-agent` once; paste `NVM_AGENT_ID` and `NVM_PLAN_ID` into `.env`.
4. Run seller: `npm run seller`. Run buyer: `SELLER_URL=http://localhost:3000 npx tsx scripts/buyer-order-and-call.ts`.

## CI / production

Inject secrets via Doppler:

```bash
doppler run -- npm run seller
```

Or in CI: configure Doppler CLI with project/config and run commands under `doppler run -- ...`.

---

## Where do these values come from?

- **NVM_AGENT_ID and NVM_PLAN_ID** — You don’t look these up. They are **created** when you run `npm run register-agent`. The script prints them; you copy those two IDs into Doppler (or .env). Run once per environment (sandbox and live), so you get one pair for dev and one pair for prod.
- **BUILDER_ADDRESS** — The **wallet address** (`0x...`) that receives payments when someone buys your plan. **If you don’t have one yet:** (1) In [Nevermined App](https://nevermined.app) go to **Settings → Payment Settings** — set or copy the payout address they show; that’s your `BUILDER_ADDRESS`. (2) Or create a wallet (e.g. [MetaMask](https://metamask.io)), add the [Base Sepolia](https://docs.nevermined.app/docs/tutorials/web3/metamask-networks/) network for sandbox, and use that account’s `0x...` address. For **live** use your mainnet address.
- **APP_URL** — The public URL where your seller API is (or will be) deployed. **You can use a dummy/placeholder for now** (e.g. `https://sabi-placeholder.example.com`) when running `register-agent`; you can re-register or update the agent later when you have a real URL.

---

## Full flow: register in Nevermined, then fill Doppler (dev + prod)

Do the registration step **twice**: once for sandbox (→ dev config) and once for live (→ prod config). Then put the results into Doppler.

### Step A: Register for sandbox (→ Doppler **dev**)

1. Set in `.env` or terminal: `NVM_API_KEY=<sandbox-seller-key>`, `NVM_ENVIRONMENT=sandbox`, `BUILDER_ADDRESS=<your Base Sepolia 0x...>`, and optionally `APP_URL=https://placeholder.example.com` (dummy is fine).
2. Run: `npm run register-agent`
3. Copy the printed **Agent ID** and **Plan ID**.
4. In Doppler, open or create config **dev**. Add:

   | Variable | Value |
   |----------|--------|
   | `NVM_ENVIRONMENT` | `sandbox` |
   | `NVM_API_KEY` | Your sandbox **seller** key |
   | `NVM_AGENT_ID` | (paste from script output) |
   | `NVM_PLAN_ID` | (paste from script output) |
   | `BUILDER_ADDRESS` | Your Base Sepolia wallet `0x...` |
   | `APP_URL` | `https://placeholder.example.com` or real URL when you have it |

### Step B: Register for live (→ Doppler **prod**)

1. Set: `NVM_API_KEY=<live-seller-key>`, `NVM_ENVIRONMENT=live`, `BUILDER_ADDRESS=<your mainnet 0x...>`, `APP_URL=https://placeholder.example.com` (or real URL).
2. Run: `npm run register-agent` again.
3. Copy the **new** Agent ID and Plan ID (these are different from sandbox).
4. In Doppler, open or create config **production** (or **prod**). Add:

   | Variable | Value |
   |----------|--------|
   | `NVM_ENVIRONMENT` | `live` |
   | `NVM_API_KEY` | Your **live seller** key |
   | `NVM_AGENT_ID` | (paste from this run) |
   | `NVM_PLAN_ID` | (paste from this run) |
   | `BUILDER_ADDRESS` | Your mainnet wallet `0x...` |
   | `APP_URL` | Dummy for now, or your deployed seller URL |

### Step C: Run with the right config

- **Dev (sandbox):** `doppler run --config dev -- npm run seller`
- **Prod (live):** `doppler run --config production -- npm run seller`

You can use a **dummy URL** for `APP_URL` in both configs until you deploy; replace it later when you have a real seller URL.
