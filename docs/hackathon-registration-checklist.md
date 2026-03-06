# Hackathon registration & go-live checklist

What you still need to do to get SABI **registered** and **live** in the hackathon marketplace, in order.

---

## 1. Register & Connect (hackathon dashboard)

Do this on the **hackathon’s team/dashboard site** (not just nevermined.app):

- [ ] **Team name, description, competitive theme** — Enter “SABI” (or your chosen name), short description, and pick the theme that fits (e.g. A2A / autonomous business).
- [ ] **Nevermined account** — Create a free account at [nevermined.app](https://nevermined.app) if you haven’t.
- [ ] **Sandbox API key** — In nevermined.app: **Settings → API Keys** → create key → use the **Sandbox** key (e.g. `sandbox:...`).
- [ ] **Connect on hackathon site** — Paste the Sandbox API key into the hackathon dashboard and hit **Connect**. Your wallet address becomes the team identity.
- [ ] **Claim 20 USDC (Base Sepolia)** — On first registration you get 20 USDC testnet to run on-chain transactions. One-time welcome bonus.

*Returning teams:* Skip to the API key step and reconnect if needed.

---

## 2. Sell & monetize (Nevermined + hackathon)

### 2a. Register agent and plan on Nevermined

You already have `npm run register-agent`; use it with the **public URL** of your seller API (or a placeholder, then re-run when you have the real URL).

- [ ] **Set env** (Doppler or `.env`): `NVM_API_KEY`, `NVM_ENVIRONMENT=sandbox` (or `live` for prod), `BUILDER_ADDRESS`, and **`APP_URL`** = public base URL of your seller (e.g. `https://your-sabi-api.com`).  
  If not deployed yet, use a placeholder (e.g. `https://sabi-placeholder.example.com`) and **re-run register-agent** after deploy.
- [ ] **Run**  
  `npm run register-agent`  
  Copy the printed **Agent ID** and **Plan ID** into Doppler (or `.env`) as `NVM_AGENT_ID` and `NVM_PLAN_ID`.
- [ ] **Payment plans** — The script creates one **USDC** plan (5 USDC per request). To maximise reach, add a **Credit Card (Fiat)** plan in [nevermined.app](https://nevermined.app) for the same agent so buyers can pay with card or USDC.

### 2b. Sync and complete listing on hackathon dashboard

- [ ] **Sync from Nevermined** — On the hackathon dashboard, use **“Sync from Nevermined”** so it pulls your agent and plan(s) from nevermined.app.
- [ ] **Complete marketplace listing** — Fill in the fields the guide marks as **Critical** so the agent is discoverable:

| Field | Status | What to use for SABI |
|-------|--------|----------------------|
| **Description** | Critical | e.g. “On-demand, geolocated verification with photo evidence and human-attested answer. Request a question + location; a nearby verifier captures proof and answers.” (Already in `register-agent.ts`; ensure it’s set in Nevermined / visible after Sync.) |
| **Category** | Critical | Pick a preset (e.g. **AI/ML**, **Data Analytics**) or create one that fits “verification / real-world data”. |
| **Services offered** | Critical | Comma-separated list, e.g. `visual verification, photo evidence, geolocated verification, human-attested answers, prediction market evidence`. |
| **Services per request** | Critical | e.g. “One verification job: question + location in, artifact (photos + transcribed answer) out.” |
| Endpoint URL | Auto | Filled from Nevermined agent registration. |
| Price / metering | Auto | From your payment plan(s). |

Without at least one plan linked in Nevermined, the agent won’t appear in Sync; you’ve already created one plan via the script.

---

## 3. Deploy seller API (so the agent is callable)

The hackathon and buyers will call your **endpoint URL**. That must be a **public** URL.

- [ ] **Deploy** the seller (e.g. `src/seller/server.ts`) to your chosen host (e.g. AWS, Cloudflare Workers). See README “Tech stack” and [docs/sandbox-to-prod.md](sandbox-to-prod.md).
- [ ] **Set `APP_URL`** in Doppler (prod) to that public base URL (e.g. `https://api.sabi.example.com`).
- [ ] **Re-run register-agent** with prod config (`NVM_ENVIRONMENT=live`, prod API key, `APP_URL`) so Nevermined has the correct endpoint. Then **Sync from Nevermined** again on the hackathon dashboard if it doesn’t auto-update.

---

## 4. Buy & discover (optional but good for criteria)

Hackathon criteria mention buying from 2+ teams, repeat/multi-seller, etc. To support that:

- [ ] **Add buy-side agent** — On the hackathon dashboard, **“Add Buy-Side Agent”** and describe the services SABI needs (e.g. event/location intel, SF-local and AWS Builder Loft–adjacent events/venues).
- [ ] **Integrate** — Use your API key and the Nevermined Payments library to purchase and call other teams’ agents (see [docs/buy-from-another-agent.md](buy-from-another-agent.md) if present).

You don’t need to register an agent on Nevermined to **buy**; your API key + Payments library is enough to purchase and call other agents.

---

## 5. Quick reference: what’s where

| Task | Where |
|------|--------|
| Team name, description, theme, Connect with API key, 20 USDC | **Hackathon dashboard** |
| Create Sandbox (or prod) API key | **nevermined.app** → Settings → API Keys |
| Register agent + plan (name, description, endpoint) | **This repo**: `npm run register-agent` (or nevermined.app UI) |
| Add a second plan (e.g. Card) | **nevermined.app** (or extend `register-agent` / use API) |
| Sync agent/plans into hackathon | **Hackathon dashboard** → “Sync from Nevermined” |
| Category, services offered, services per request | **Hackathon dashboard** (after Sync) |
| Deploy seller so endpoint is public | **Your infra** (AWS, Cloudflare, etc.); set `APP_URL`, re-register if needed |

---

## 6. Checklist summary

1. **Hackathon dashboard**: Register team, connect Sandbox API key, get 20 USDC.
2. **Nevermined + repo**: Run `register-agent` with `APP_URL` (placeholder or real), store `NVM_AGENT_ID` and `NVM_PLAN_ID`; optionally add Card plan in nevermined.app.
3. **Hackathon dashboard**: “Sync from Nevermined”, then fill **Description**, **Category**, **Services offered**, **Services per request**.
4. **Deploy**: Seller API at a public URL; set prod `APP_URL`, re-run register-agent for live; re-Sync if needed.
5. **Optional**: Add buy-side agent and integrate with other teams for buy-side criteria.

Once 1–4 are done, SABI is registered and live in the hackathon marketplace with a callable seller endpoint and a complete listing.
