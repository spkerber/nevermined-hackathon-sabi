# PRD: Vending Machine Delivery (A2A) — *Legacy*

**Status:** This PRD describes the original vending-machine delivery concept. It is being revised for the new **Meta-glasses physical verification request** service (mechanical-turk + Meta glasses, human-in-the-loop, veracity scoring). Pull latest from repo after Ben’s worktree push, then redo this PRD.

Product Requirement Document for the SABI hackathon project: delivery-as-a-service powered by Nevermined A2A payments, with two user types (orderer and ops).

---

## 1. Overview

### Purpose

Enable hackathon attendees to order a drink from the building vending machine and have it delivered to their desk. The *product* is the delivery service; payment is done via agent-to-agent transaction (Nevermined credits). Ops (Ben + Spencer) are notified and perform the physical handoff.

### Background

- Hackathon focus: A2A transactions with payment (x402 / Nevermined).
- Vending machine on the floor provides free drinks (tap with phone); we add value by delivering to the requester’s location.
- Goal: learn Nevermined end-to-end, ship a working flow, and support two user types (orderer vs ops) with cloud hosting and auth.

### Success criteria

- One end-to-end order: orderer places order (credits debited) → ops notified → location + ETA confirmed → delivery completed.
- App is cloud-hosted with auth for orderer and ops.
- Nevermined payment (x402) is required and used for each delivery.

### Timeline

- V1: Order flow + Nevermined + ops notification + ETA; manual inventory and single building map.
- Post–V1: Optional tools (Exa, Apify, AWS, Mindra), deeper agents/evals (e.g. LangChain) as needed.

---

## 2. Problem statement

### The problem

Attendees want a drink without leaving their desk. The vending machine is free but not delivered. We provide delivery and charge for it via A2A credits so the transaction is clear and auditable.

### Who has this problem

- **Orderers:** Hackathon participants who want a drink delivered.
- **Ops:** Ben and Spencer, who need a clear list of orders (item, location, requester) to fulfill.

### Why now

- Hackathon theme is A2A commerce; this use case is tangible (real-world handoff) and simple to demo.
- Learning goal: Nevermined integration, two user types, cloud deploy (AWS or Cloudflare Workers).

### Current state

- Manual: person walks to vending machine, taps, gets drink. No delivery, no A2A payment.

### Pain points (addressed by V1)

- No way to “order for delivery” with a clear payment (credits).
- No single place for ops to see pending deliveries (item, location, who).

---

## 3. Users and jobs-to-be-done (JTBD)

### Orderer (customer)

- *When I’m at the hackathon and want a drink without leaving my desk, I need to request it and pay with credits so I can get it delivered and stay focused.*
- *When I place an order, I need to see a final confirmation and ETA so I know when to expect the drink.*

### Ops (delivery: Ben, Spencer)

- *When a new delivery is paid, I need to be notified with item and location so I can pick the drink and walk it to the right person.*
- *When I’m about to deliver, I need to confirm the requester (e.g. photo/name) so I hand the drink to the right person.*

### Agent users (A2A)

- The “buyer” is the orderer’s agent or the app acting on their behalf; it pays with Nevermined credits (x402) for the delivery service. The “seller” is our delivery service agent that validates payment and creates the delivery task.

---

## 4. Goals and non-goals

### Goals

- End-to-end order flow: location + identity + item selection → Nevermined payment → ops notification → final location + ETA → fulfillment.
- Two user types: orderer (place order, see ETA) and ops (see orders, fulfill).
- Cloud-hosted app with authentication for both types.
- Use Nevermined for payment (required).

### Non-goals (V1)

- Full inventory sync with the vending machine hardware.
- Complex routing or multiple buildings.
- Scale or multi-venue productization.
- Mandatory use of Exa, Apify, or Mindra (optional add-ons later).

---

## 5. Solution approach

### High-level solution

- **Orderer journey:** Onboarding (location on map, identity e.g. photo) → browse/select item from catalog → confirm order → pay with Nevermined (credits) → receive confirmation + ETA.
- **Ops journey:** Receive notification for new order (item, location, requester) → confirm delivery (and optionally update status).
- **Backend:** One delivery service that (1) exposes order/placement flow, (2) validates Nevermined payment (x402), (3) persists order and notifies ops, (4) returns ETA to orderer.
- **Inventory:** Manual/counted catalog for V1; optional stock tracking later.
- **Location:** Building map; requester pins or selects location (e.g. floor/zone/desk) so ops can deliver.

### Key features (V1)

- User onboarding: location on map; identity auto-populated from SSO profile (name, avatar).
- Catalog endpoint (`GET /catalog`) for agents/CLI to list available items.
- Item selection from vending catalog.
- Payment: Nevermined credit per delivery (x402 flow: payment-signature, verify, settle).
- Ops notification: new order with item, location, requester.
- Final confirmation: confirm location again and show ETA to orderer before considering order placed.
- Fulfillment: ops mark delivery complete (and optionally notify orderer).

### Service access: Skill + API

The delivery service is available in two modes depending on the use case:

1. **Skill (for AI coding agents):** Builders using Claude Code, Codex, or similar agents install Sabi as a skill. The agent can then place orders conversationally (e.g. "order me a Mountain Dew to desk 4").
2. **API (for applications):** Builders integrating delivery into their own code call the Sabi REST API directly (e.g. schedule a water delivery every 2 hours on a job site).

Both modes use the same backend and the same authentication (device-flow token, see below). The skill is a thin wrapper that translates natural-language requests into API calls. Both modes require Nevermined payment (x402) — every order debits credits before it is created.

### Builder onboarding and authentication

Onboarding is designed to be dead simple — one command to install, zero separate login step.

#### 1. Install the skill (agent users)

```bash
npx skills add -g https://github.com/sabi-delivery/sabi-skill
```

This registers Sabi as an agent skill. The skill definition (SKILL.md) contains the API surface and auth instructions so the agent knows how to call Sabi.

For API-only usage (no agent), builders use the unified CLI directly (see below). There is one package for both the skill and CLI — `sabi`.

#### 2. Lazy auth via device flow (zero-step login)

Authentication uses the OAuth 2.0 Device Authorization Grant (RFC 8628). There is **no separate login command** — auth is triggered lazily on first use. When the agent or CLI makes its first API call and finds no valid token in `~/.sabi/config.json`, it automatically kicks off the device flow:

1. The CLI/agent prints: *"Opening your browser to authenticate with Sabi..."*
2. Requests a device code from the auth server:
```bash
curl -s -X POST https://auth.sabi.delivery/oauth/device/code \
  -d "client_id=SABI_CLIENT_ID&audience=https://api.sabi.delivery&scope=openid profile email offline_access"
```
Response includes `verification_uri_complete`, `device_code`, `interval`, and `user_code`.

3. Opens `verification_uri_complete` in the builder's browser:
```bash
open "$verification_uri_complete"        # macOS
xdg-open "$verification_uri_complete"    # Linux
```
The builder authenticates with **GitHub** or **Google** SSO in their browser.

4. Polls for the token:
```bash
curl -s -X POST https://auth.sabi.delivery/oauth/token \
  -d "grant_type=urn:ietf:params:oauth:grant-type:device_code&client_id=SABI_CLIENT_ID&device_code=DEVICE_CODE"
```
Poll every `interval` seconds until the response contains `access_token` and `refresh_token`.

5. Saves the token locally:
```json
// ~/.sabi/config.json
{"access_token": "...", "refresh_token": "...", "expires_at": 1234567890}
```

On subsequent requests, the CLI/skill reads the token from `~/.sabi/config.json`. If the access token is expired, it **silently refreshes** using the stored `refresh_token` — the builder never sees a browser prompt again unless the refresh token itself is revoked.

**Why device flow + refresh tokens?**
- No token copy/paste — the builder just clicks "authorize" in their browser, once.
- Works from headless terminals, SSH sessions, and AI agents (the agent opens the browser, the human approves).
- Silent refresh means the human only authenticates once; no recurring browser interruptions.

#### 3. Identity from SSO (auto-populated)

The builder's name and avatar are extracted from their SSO token claims (`name`, `picture` from the OIDC `profile` scope). There is no need to pass an `identity` field when placing orders — the backend resolves it from the bearer token. This eliminates a manual step and ensures consistency.

#### 4. Making requests (skill or API)

All API calls require `Authorization: Bearer $TOKEN` **and** a Nevermined `payment-signature` header for order placement. The flow is:

1. **Browse catalog** (no payment needed):
```bash
TOKEN=$(jq -r '.access_token' ~/.sabi/config.json)

curl -s https://api.sabi.delivery/catalog \
  -H "Authorization: Bearer $TOKEN"
```

2. **Place an order** (payment required):
```bash
curl -s -X POST https://api.sabi.delivery/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "payment-signature: <x402-signature>" \
  -H "Content-Type: application/json" \
  -d '{"item": "Mountain Dew", "location": "desk 4"}'
```

The backend verifies the `payment-signature` via Nevermined SDK, debits credits, and only then creates the order. If payment fails, the order is rejected with `402 Payment Required`.

When used as a skill, the agent reads SKILL.md, loads the token from `~/.sabi/config.json`, and handles the Nevermined payment flow on behalf of the builder. The agent should call `GET /catalog` first to present available items before asking the builder to choose.

#### 5. Unified CLI (`npx sabi`)

One package provides both the agent skill and a CLI for non-agent builders:

```bash
npx sabi install-skill                            # register Sabi as an agent skill (wraps `npx skills add`)
npx sabi login                                    # explicit login (optional; auto-triggered on first use)
npx sabi catalog                                  # list available items
npx sabi order "Mountain Dew" --location "desk 4" # place an order (debits Nevermined credits)
npx sabi "Mountain Dew to desk 4"                 # natural language shorthand (same as above)
npx sabi reorder                                  # repeat last order
npx sabi status <order-id>                        # check order status
```

The CLI handles auth, token refresh, Nevermined payment, and API calls — one codebase, two interfaces (skill + CLI).

#### 6. Remembered location

The first order saves `last_location` to `~/.sabi/config.json`. Subsequent orders reuse it automatically:

```bash
npx sabi order "Mountain Dew" --location "desk 4"  # first time: saves "desk 4"
npx sabi order "Water"                              # reuses "desk 4"
npx sabi order "Sprite" --location "desk 7"         # overrides and saves "desk 7"
```

This makes repeat orders a single argument. For the API, clients can omit the `location` field and the backend falls back to the user's last known location.

#### 7. Reorder

`npx sabi reorder` repeats the last order (same item, same location, new Nevermined payment). This is the building block for scheduled deliveries — a cron job calling `npx sabi reorder` handles the "water every 2 hours" use case with zero custom code.

#### 8. QR code auth fallback

If the terminal cannot open a browser (SSH, containers, remote servers), the CLI prints a QR code to the terminal using ASCII art. The builder scans it with their phone, approves in their mobile browser, and the CLI picks up the token via the same device-flow polling. No special handling needed — just an alternative to `open`/`xdg-open`.

### Alternatives considered

- No payment: free delivery would not demonstrate A2A commerce.
- Other payment rails: hackathon requires Nevermined; we use it as the single payment layer.

---

## 6. Requirements

### Functional

- Orderer can set location (map or floor/zone/desk). Location is remembered across orders; subsequent orders reuse the last location unless overridden.
- Orderer identity (name, avatar) is auto-populated from SSO token claims — no manual input needed.
- `GET /catalog` returns the list of available items so agents/CLI can present options before ordering.
- Orderer can select an item from the current catalog.
- At order time, `POST /orders` requires a Nevermined `payment-signature` (x402). The backend verifies the signature, debits credits, and only then creates the order. No payment = no order (402 Payment Required).
- Orderer can reorder (repeat last item + location with a new payment).
- Ops receive a notification for each new order (item, location, requester identity).
- Orderer sees final confirmation and ETA after payment.
- Ops can see pending orders and mark delivery complete (and optionally update status).
- Catalog is configurable (manual inventory for V1).

### Non-functional

- **Auth:** OAuth 2.0 Device Authorization Grant with GitHub/Google SSO. Access + refresh tokens stored at `~/.sabi/config.json`. Silent refresh on expiry; human only authenticates once. Two roles – orderer and ops – with distinct access (order vs. manage/fulfill).
- **Security:** No secrets in client; Nevermined API key and plan/agent IDs only in backend env. Builder tokens are scoped per-user via SSO identity. Device flow ensures the human approves the initial login (agents cannot self-authorize). Refresh tokens enable silent renewal without repeated browser prompts.
- **Latency:** Order placement and notification within seconds of payment.
- **Hosting:** Deploy on AWS or Cloudflare Workers (exact service TBD).

### Agent / A2A

- Payment validation: require `payment-signature` (x402) for order placement; verify then settle via Nevermined SDK.
- One “delivery service” agent (or API) that accepts paid orders and notifies ops.
- Service is accessible as both an agent skill (installed via `npx skills add`) and a REST API, sharing the same backend and auth.
- Skill definition (SKILL.md) documents the API surface and auth flow so agents can self-serve.

---

## 7. Metrics and success criteria

### Success metrics

- At least one completed end-to-end order (payment → notification → ETA → delivery).
- Ops can see and fulfill orders from the app/UI.
- Nevermined credits are debited per delivery and visible in Nevermined App.

### Evaluation (optional)

- If we add LangChain-based agents or evals, we can define evals for order parsing, notification content, or ETA logic; for V1, manual verification is acceptable.

---

## 8. Technical considerations

### Architecture (high-level)

- **Frontend (or client):** Orderer and ops UIs (or minimal web flows) for onboarding, order, and ops queue. Exact stack TBD.
- **Backend / API:** Order placement, Nevermined payment validation (verify + settle), order storage, notification to ops, ETA calculation. Hosted on **AWS** or **Cloudflare Workers**. Serves both direct API consumers and the agent skill.
- **Skill layer:** A SKILL.md file (hosted in a public GitHub repo) that documents the API surface and auth flow. Installed by builders via `npx skills add -g <repo-url>`. The skill is a zero-dependency wrapper — it teaches the agent how to call the REST API; no separate server or MCP process needed.
- **Payment:** **Nevermined** only (required). Register agent + plan in Nevermined App; use payments SDK (Python or TypeScript) for verify/settle in the order flow.
- **Auth:** OAuth 2.0 Device Authorization Grant. Builders authenticate via GitHub or Google SSO in their browser. Token saved to `~/.sabi/config.json` and used for all subsequent API/skill requests. Two roles: orderer (place orders) and ops (fulfill orders).

### Dependencies

- **Nevermined:** API key, agent ID, plan ID; SDK for x402 (e.g. `payments-py` or `@nevermined-io/payments`).
- **Hosting:** AWS or Cloudflare Workers (preferred); exact service to be chosen when implementing.
- **Optional (post–repo setup):** Exa, Apify, AWS services, Mindra credits – for search, scraping, or extra capabilities; not required for V1.
- **Agents / evals:** **LangChain** preferred for any deep agents or evals we add later.

### Constraints

- Must use Nevermined for A2A payment.
- V1: single building, manual inventory, simple ETA (e.g. fixed offset or rough estimate).

---

## 9. Risks and mitigation

| Risk | Mitigation |
|------|------------|
| Nevermined integration delay | Follow 5-min setup and seller-simple-agent pattern; start with one “place order” endpoint. |
| Ops notification delivery | Use a simple channel (in-app list, email, or push) and document in PRD/runbook. |
| Location mapping complexity | V1: simple zones or desk labels; avoid full floor maps if time-bound. |

---

## 10. Open questions

- Exact AWS or Cloudflare Workers service (Lambda + API Gateway vs. Workers + Durable Objects, etc.).
- ~~Auth mechanism for orderer and ops~~ **Decided:** OAuth 2.0 Device Authorization Grant with GitHub/Google SSO.
- Auth provider: Auth0, or self-hosted (exact provider TBD; device flow is provider-agnostic).
- ETA model (fixed delay vs. simple distance/zone-based).
- Whether to add LangChain agents/evals in V1 or only after first working demo.
- Skill registry: host skill repo at `sabi-delivery/sabi-skill` or equivalent; confirm `npx skills add` compatibility.

---

## 11. Appendix

### References

- [docs/references.md](references.md) – hackathon links, Nevermined docs, seller-simple-agent.
- [Nevermined 5-minute setup](https://nevermined.ai/docs/integrate/quickstart/5-minute-setup).
- [nevermined-io/hackathons – seller-simple-agent](https://github.com/nevermined-io/hackathons/tree/main/agents/seller-simple-agent).

### Glossary

- **A2A:** Agent-to-agent (transaction or communication).
- **x402:** HTTP payment protocol used by Nevermined (402 Payment Required, payment-signature header).
- **Ops:** Operations; here, Ben and Spencer performing delivery.
- **Credits:** Nevermined plan credits consumed per delivery.
