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
| `APP_URL` | Public URL of seller API (for registration endpoint metadata) |

## Buyer (subscriber) usage

The **buyer** uses a **different** API key (subscriber key from Nevermined App). For local testing you can:

- Use the same `NVM_API_KEY` as seller if you are both registering the agent and testing as buyer.
- Or create a second key in Nevermined App and set it only when running the buyer script (e.g. `NVM_API_KEY=subscriber_key npx tsx scripts/buyer-order-and-call.ts`).

Doppler can hold multiple configs (e.g. `dev` with seller key, `buyer-dev` with subscriber key) if you use different projects or config names.

### Buyer key and permissions (troubleshooting)

If the buyer script fails with **"Unable to order plan"** or **`BCK.PROTOCOL.0005`**, permissions or plan setup in Nevermined are the usual cause.

1. **Buyer key** — The key used for `NVM_API_KEY` when running the buyer must be a **subscriber** key (the account that will pay for the plan). Create it in [Nevermined App](https://nevermined.app) → API Keys; it can be the same account as the seller or a different one.
2. **Order the plan in the App first** — In [Nevermined App → Permissions](https://nevermined.app/permissions/global-permissions), find your plan and **order it** (subscribe) with the buyer account. Use test USDC on Base Sepolia for sandbox. After the plan is ordered in the App, the same key can get an x402 token and call the seller; sometimes programmatic `orderPlan()` only works after the plan is orderable (e.g. published) or after a first order via the App.
3. **Same environment** — Buyer key, `NVM_PLAN_ID`, and `NVM_AGENT_ID` must all be for the same environment (`sandbox` or `live`). Plan IDs from sandbox registration are not valid in live and vice versa.
4. **Doppler** — When using `doppler run -- npm run buyer:order-and-call`, the active Doppler config must include the **buyer** `NVM_API_KEY` (and the same `NVM_PLAN_ID` / `NVM_AGENT_ID` as the seller). Use a separate config (e.g. `buyer-dev`) if seller and buyer keys differ.

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
