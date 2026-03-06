# References

## Hackathon

- **Builder guide (Google Doc):** [Autonomous Business Hackathon \| Current Builder Guide](https://docs.google.com/document/d/17SGdLqwsSo0t0fML_az95LL40BBxly-pKJQsJhxCDQ8/edit?tab=t.0)
- **Marketplace (teams / projects):** [Autonomous Business Hackathon \| Marketplace](https://docs.google.com/spreadsheets/d/1R-ohHM-NZbTJ9KDgiQmNro1zot2rMEf0XtcXyYzZ9yA/edit?gid=0#gid=0)
- **Discovery API:** Query the marketplace at runtime — `GET /hackathon/register/api/discover?side=sell|buy&category=...`. Our backend proxies this at `GET /api/discover` when `HACKATHON_DISCOVERY_BASE_URL` is set (see [docs/discovery-api.md](discovery-api.md)).

## Nevermined

- **5-minute setup:** [Nevermined – 5-Minute Setup](https://nevermined.ai/docs/integrate/quickstart/5-minute-setup)
- **Nevermined App (API keys, plans):** [nevermined.app](https://nevermined.app)
- **Docs index (LLMs):** [nevermined.app/llms.txt](https://docs.nevermined.app/llms.txt)

## Reference implementations

- **Nevermined hackathons repo:** [nevermined-io/hackathons](https://github.com/nevermined-io/hackathons)
- **Seller simple agent (x402, tiered credits, A2A):** [agents/seller-simple-agent](https://github.com/nevermined-io/hackathons/tree/main/agents/seller-simple-agent)

## Project docs

- **Doppler and env:** [docs/doppler-and-env.md](doppler-and-env.md) — secrets for seller/buyer, Doppler project link.
- **Sandbox → prod:** [docs/sandbox-to-prod.md](sandbox-to-prod.md) — path from 5-min sandbox to production transaction.
- **Buy from another agent:** [docs/buy-from-another-agent.md](buy-from-another-agent.md) — use the buyer script with another team’s plan/agent/URL and stash the response.

## Stack (for this project)

- **Payments:** Nevermined (required)
- **Hosting:** AWS or Cloudflare Workers (preferred)
- **Agents / evals:** LangChain (preferred)
- **Optional:** Exa, Apify, AWS, Mindra credits (to be added as needed)
