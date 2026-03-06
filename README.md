# Nevermined Hackathon SABI

**Visual Verification as a Service** — photo-backed, human-verified proof for real-world questions. Think **X Community Notes** meets **Meta VisionClaw**: requesters get ground truth + evidence (photos + attested answer) that you can use to settle [Kalshi](https://kalshi.com) / [Polymarket](https://polymarket.com) bets, validate event claims, or just know what's really there. Human verifiers with Ray-Ban Meta glasses fulfill requests on location; payment and matching run over Nevermined A2A.

### What we're selling

**Visual Verification** — on-demand, geolocated verification with photo evidence and a human-attested answer. Request a question + location; a nearby verifier (wearing Meta glasses) captures proof and answers; you get an artifact (photos + transcription) and optional community-style scoring. Built for prediction markets, due diligence, and any claim that needs "show me."

### What we're buying

**Event and location intel** that could use a verification layer: times, places, details, and text that would benefit from additional media or validation. We're especially interested in **SF-local** and **AWS Builder Loft**–adjacent events, venues, and people — the kind of intel that's more valuable when someone can go verify it.

---

## Pivot

We previously explored a vending machine / map / delivery concept. We've pivoted to the verification service above to better align with hackathon criteria: **buyer** (3+ paid tx, buy from 2+ teams, repeat or multi-seller), **seller** (metered service to 2+ teams, 3+ paid tx, repeat buyers), and **market participation** (cross-team tx, buy + sell, integration).

## Team

- **Spencer Kerber**
- **Ben Imadali**

Ben has access and may push from a separate git worktree; pull from `origin` before redoing the PRD.

## Secrets & config

We use **Doppler** for API keys and secrets. For local dev you can still use `.env` (copy from `.env.example`); in CI/deploy, inject via Doppler. Nevermined credentials: `NVM_API_KEY`, `NVM_AGENT_ID`, `NVM_PLAN_ID` (create plan in [Nevermined App](https://nevermined.app)).

## Docs

- [docs/PRD.md](docs/PRD.md) – Product and technical details.
- [docs/team.md](docs/team.md) – Team and repo info.
- [docs/references.md](docs/references.md) – Hackathon and Nevermined links.

## Tech stack (current plan)

| Layer | Choice | Notes |
|-------|--------|--------|
| **Payments** | **Nevermined** | Required. A2A payments via x402; register agent + plan, validate/settle with `payment-signature` header. |
| **Secrets** | **Doppler** | API keys and config; optional local `.env` from `.env.example`. |
| **Hosting** | **AWS** or **Cloudflare Workers** | TBD (e.g. Lambda + API Gateway, or CF Workers). |
| **Agents / evals** | **LangChain** | For agent suggestions to purchasers and evals when needed. |

## License

MIT.
