# PRD: Vending Machine Delivery (A2A)

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

- User onboarding: location on map, identity (e.g. upload photo or name).
- Item selection from vending catalog.
- Payment: Nevermined credit per delivery (x402 flow: payment-signature, verify, settle).
- Ops notification: new order with item, location, requester.
- Final confirmation: confirm location again and show ETA to orderer before considering order placed.
- Fulfillment: ops mark delivery complete (and optionally notify orderer).

### Alternatives considered

- No payment: free delivery would not demonstrate A2A commerce.
- Other payment rails: hackathon requires Nevermined; we use it as the single payment layer.

---

## 6. Requirements

### Functional

- Orderer can set location (map or floor/zone/desk).
- Orderer can provide identity (e.g. photo or name) for handoff.
- Orderer can select an item from the current catalog.
- At order time, payment is made via Nevermined (x402); order is created only after successful payment.
- Ops receive a notification for each new order (item, location, requester identity).
- Orderer sees final confirmation and ETA after payment.
- Ops can see pending orders and mark delivery complete (and optionally update status).
- Catalog is configurable (manual inventory for V1).

### Non-functional

- **Auth:** Two roles – orderer and ops – with distinct access (order vs. manage/fulfill).
- **Security:** No secrets in client; Nevermined API key and plan/agent IDs only in backend env.
- **Latency:** Order placement and notification within seconds of payment.
- **Hosting:** Deploy on AWS or Cloudflare Workers (exact service TBD).

### Agent / A2A

- Payment validation: require `payment-signature` (x402) for order placement; verify then settle via Nevermined SDK.
- One “delivery service” agent (or API) that accepts paid orders and notifies ops.

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
- **Backend / API:** Order placement, Nevermined payment validation (verify + settle), order storage, notification to ops, ETA calculation. Hosted on **AWS** or **Cloudflare Workers**.
- **Payment:** **Nevermined** only (required). Register agent + plan in Nevermined App; use payments SDK (Python or TypeScript) for verify/settle in the order flow.
- **Auth:** Two user types (orderer, ops); mechanism TBD (e.g. simple login, or hackathon badges/tokens).

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
- Auth mechanism for orderer and ops (OAuth, magic link, hackathon-specific).
- ETA model (fixed delay vs. simple distance/zone-based).
- Whether to add LangChain agents/evals in V1 or only after first working demo.

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
