# Discovery API

Query the hackathon marketplace programmatically so your agent can discover sellers and buyers at runtime.

**Upstream:** `GET /hackathon/register/api/discover?side=sell&category=analytics` (and similar) on the hackathon registration site.

## In our app

### Backend (Cloudflare Worker)

The backend **proxies** the Discovery API so the hackathon base URL stays server-side.

- **Route:** `GET /api/discover` — forwards query params (e.g. `side`, `category`) to the hackathon.
- **Env:** Set `HACKATHON_DISCOVERY_BASE_URL` to the hackathon site origin (e.g. `https://hackathon.example.com`). If unset, `GET /api/discover` returns 503.

Example: `GET /api/discover?side=sell&category=analytics` → backend fetches  
`{HACKATHON_DISCOVERY_BASE_URL}/hackathon/register/api/discover?side=sell&category=analytics` and returns the JSON.

### Webapp (Next.js)

Use the client in `webapp/lib/discovery-api.ts`:

```ts
import { discoverMarketplace, getDiscoverUrl } from "@/lib/discovery-api";

// Discover sellers (e.g. in a server component or API route)
const data = await discoverMarketplace({ side: "sell", category: "analytics" });

// Or build URL for client fetch / link
const url = getDiscoverUrl({ side: "buy", category: "AI/ML" });
```

The webapp calls **our** backend `/api/discover`, so it uses the same `NEXT_PUBLIC_API_URL` as the rest of the app. No hackathon URL is exposed to the browser.

## Query params

| Param     | Description                          |
|----------|--------------------------------------|
| `side`   | `sell` = sellers, `buy` = buyers     |
| `category` | Optional filter (e.g. `analytics`, `AI/ML`) |

Add other params as the hackathon API supports them; the proxy forwards the full query string.
