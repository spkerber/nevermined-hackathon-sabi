# Sabi -- Verifiable Real-World Information

A2A verification-as-a-service for the Nevermined hackathon. Requesters submit real-world questions (e.g. "How many Fantas are in the vending machine?"), nearby verifiers with Ray-Ban Meta smart glasses go check, capture photo evidence, and answer vocally. Requesters review the artifact (photos + transcribed answer) in a webapp.

## Quick start

### Backend (Cloudflare Workers)

```bash
cd backend
npm install
npx wrangler dev --port 8787
```

### Webapp (Next.js / Vercel)

```bash
cd webapp
npm install
npm run dev
```

The webapp connects to the backend at `http://localhost:8787` by default. Set `NEXT_PUBLIC_API_URL` in `webapp/.env.local` to change.

### Companion app (iOS -- iPhone + Ray-Ban Metas)

1. Open `companion/CameraAccess.xcodeproj` in Xcode
2. Copy `companion/CameraAccess/Secrets.swift.example` to `companion/CameraAccess/Secrets.swift` and fill in your Gemini API key and backend URL
3. Select your iPhone as the build target
4. Build and run

The companion app connects to the backend to accept verification jobs, streams camera from Ray-Ban Meta glasses (or iPhone camera in test mode), uses Gemini 2.5 Flash for real-time AI-assisted verification, captures photos every 5 seconds, and uploads them to the backend when the verification is complete.

## Architecture

```
webapp/           Next.js (Vercel) -- requester UI
backend/          Cloudflare Workers + Agents SDK
  src/index.ts    Worker entry point (REST API + agent routing)
  src/verification-agent.ts   Durable Object (SQLite + WebSocket state sync)
  src/types.ts    Shared types
companion/        iOS app (VisionClaw fork) -- verifier companion
  CameraAccess/   Swift source code
  CameraAccess.xcodeproj   Xcode project
docs/             PRD, references, team info
```

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/verifications` | Create a verification job |
| GET | `/api/verifications/:id` | Get job status |
| POST | `/api/verifications/:id/accept` | Verifier accepts job |
| POST | `/api/verifications/:id/start` | Start verification session |
| POST | `/api/verifications/:id/frames` | Upload a frame (JPEG) |
| POST | `/api/verifications/:id/end` | End session with answer |
| GET | `/api/verifications/:id/artifact` | Get completed artifact |
| GET | `/api/frames/:key` | Serve frame image from R2 |
| WS | `/agents/verification-agent/:id` | Real-time status updates |

### Job status lifecycle

`connecting` -> `accepted` -> `in_progress` -> `verified`

### Tech stack

| Layer | Choice |
|-------|--------|
| **Backend** | Cloudflare Workers + Agents SDK (Durable Objects, SQLite, R2) |
| **Webapp** | Next.js on Vercel |
| **Payments** | Nevermined (x402) -- wired but payment validation deferred |
| **Companion app** | VisionClaw fork (iPhone + Ray-Ban Metas) |

## Team

- **Spencer Kerber**
- **Ben Imadali**

Ben has access and may push from a separate git worktree; pull from `origin` before redoing the PRD.

## Secrets & config

We use **Doppler** for API keys and secrets. For local dev you can still use `.env` (copy from `.env.example`); in CI/deploy, inject via Doppler. Nevermined credentials: `NVM_API_KEY`, `NVM_AGENT_ID`, `NVM_PLAN_ID` (create plan in [Nevermined App](https://nevermined.app)). See [docs/doppler-and-env.md](docs/doppler-and-env.md) and [docs/sandbox-to-prod.md](docs/sandbox-to-prod.md).

## Docs

- [docs/PRD.md](docs/PRD.md) -- Full product requirements
- [docs/references.md](docs/references.md) -- Hackathon and Nevermined links
- [docs/team.md](docs/team.md) -- Team info

## Buyers / Sellers agents (feature branch)

On branch `feature/buyers-sellers-agents`: minimal **seller** (Express API with x402) and **buyer** (order plan + call seller) for sandbox → prod payment flow. No VisionClaw integration.

- **Register agent (once):** `npm run register-agent` — requires `NVM_API_KEY`, `BUILDER_ADDRESS`; writes `NVM_AGENT_ID`, `NVM_PLAN_ID` to add to env/Doppler.
- **Run seller:** `npm run seller` — serves `POST /query` with payment validation (402 without `payment-signature`).
- **Run buyer:** `npm run buyer:order-and-call "Your question"` — set `NVM_PLAN_ID`, `NVM_AGENT_ID`, `SELLER_URL`; uses subscriber `NVM_API_KEY` to order plan, get x402 token, call seller.

Refs: [5-Minute Setup](https://nevermined.ai/docs/integrate/quickstart/5-minute-setup), [Nevermined App](https://nevermined.app/permissions/global-permissions), [Doppler](https://dashboard.doppler.com/workplace/37ee0f06177aa6997f55/projects/nevermined-hackathon-sabi).

## License

MIT.
