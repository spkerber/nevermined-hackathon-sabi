# Nevermined Hackathon SABI

A2A (agent-to-agent) service for the Nevermined hackathon: we're building a **Meta-glasses physical verification request** service for the shared market. Purchasers request real-world verification (e.g. “Is there food at the lunch counter?”, “Is the vending machine working?”, “Are there open chairs in the AWS Builders Loft?”); human wearers with Meta glasses fulfill requests with photo evidence from their POV; results are scored for veracity/accuracy (community-note style). Users = purchasers and sellers; human-in-the-loop required. An agent can suggest purchase types to purchasers.

## Pivot

We previously explored a vending machine / map / delivery concept. We've pivoted to the verification service above to better align with hackathon criteria: **buyer** (3+ paid tx, buy from 2+ teams, repeat or multi-seller), **seller** (metered service to 2+ teams, 3+ paid tx, repeat buyers), and **market participation** (cross-team tx, buy + sell, integration).

## Team

- **Spencer Kerber**
- **Ben Imadali**

Ben has access and may push from a separate git worktree; pull from `origin` before redoing the PRD.

## Secrets & config

We use **Doppler** for API keys and secrets. For local dev you can still use `.env` (copy from `.env.example`); in CI/deploy, inject via Doppler. Nevermined credentials: `NVM_API_KEY`, `NVM_AGENT_ID`, `NVM_PLAN_ID` (create plan in [Nevermined App](https://nevermined.app)).

## Docs

- [docs/PRD.md](docs/PRD.md) – Product and technical details (**being revised** for the Meta-glasses verification service after Ben’s worktree push).
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
