# Nevermined Hackathon SABI – Vending Machine Delivery

A2A (agent-to-agent) delivery service: hackathon attendees order drinks via an agent, pay with Nevermined credits, and ops (Ben + Spencer) walk the drink from the building vending machine to their desk. Real-world outcome powered by an agent-to-agent transaction.

## What we're building

- **Orderer flow**: Share location on map → identify (e.g. photo) → confirm item → pay with credits → get ETA and confirmation.
- **Ops flow**: Get notified for new orders (item, location, requester) → confirm delivery.
- **Payment**: Nevermined x402; one credit (or tier) per delivery.

See [docs/PRD.md](docs/PRD.md) for full product and technical details, [docs/team.md](docs/team.md) for the team, and [docs/references.md](docs/references.md) for hackathon and Nevermined links.

## Tech stack (current plan)

| Layer | Choice | Notes |
|-------|--------|--------|
| **Payments** | **Nevermined** | Required. A2A payments via x402; register agent + plan, validate/settle with `payment-signature` header. |
| **Hosting** | **AWS** or **Cloudflare Workers** | Preferred for deploy; exact service TBD (e.g. Lambda + API Gateway, or CF Workers). |
| **Agents / evals** | **LangChain** | Preferred for deep agents and evals when needed. |
| **Optional tools** | Exa, Apify, AWS, Mindra credits | To be added after repo setup; use for search, scraping, or extra capabilities as needed. |

Copy `.env.example` to `.env` and fill in `NVM_API_KEY`, `NVM_AGENT_ID`, `NVM_PLAN_ID` (create plan in [Nevermined App](https://nevermined.app)).

## Running (once implemented)

- Start the app (hosting TBD: AWS or Cloudflare Workers).
- Orderer: complete onboarding (location, identity, item), then place order (payment-signature from Nevermined).
- Ops: receive notification, fulfill delivery.

## License

MIT.
