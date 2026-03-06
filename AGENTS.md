# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Sabi is a "Visual Verification as a Service" platform with three npm projects (each has its own `package.json` + `package-lock.json`):

| Directory | Service | Dev command | Port |
|-----------|---------|-------------|------|
| `/` (root) | Seller agent + tests | `npm run seller` / `npm test` | 3000 |
| `backend/` | Cloudflare Workers API | `npx wrangler dev --port 8787` | 8787 |
| `webapp/` | Next.js frontend | `npm run dev` | 3000 |

### Running services

- **Backend**: `cd backend && npx wrangler dev --port 8787` — uses Durable Objects + R2 locally (no external DB needed). Wrangler handles local SQLite and R2 simulation automatically.
- **Webapp**: `cd webapp && npm run dev` — connects to backend at `http://localhost:8787` by default (`NEXT_PUBLIC_API_URL`).
- **Seller agent** (optional, root project): `npm run seller` — standalone Express server for Nevermined A2A payment testing. Requires `NVM_API_KEY`, `NVM_PLAN_ID`, `NVM_AGENT_ID` env vars.

### Lint / test / build

- **Lint**: `cd webapp && npm run lint` (ESLint v9 flat config)
- **Tests**: `npm test` (root — vitest; mocks `@nevermined-io/payments`, no real API keys needed)
- **Type check**: `npm run build` (root — `tsc --noEmit`)
- **Webapp build**: `cd webapp && npm run build`

### Non-obvious notes

- The `POST /api/verifications` endpoint requires a Nevermined payment signature. For local demo/testing without credentials, use `POST /api/seed` to create demo jobs that bypass payment.
- There is no Docker, no external database, and no CI config in this repo. All persistence is via Cloudflare Durable Objects (local SQLite) and R2 (local filesystem).
- The `companion/` directory contains an iOS Swift app and is not buildable in a cloud VM (requires Xcode + physical iPhone).
- The webapp shows a "Not connected" state for Nevermined by default — this is expected without API keys. The UI still renders and the backend API works independently.
- Next.js may emit a warning about multiple lockfiles — this is benign and can be ignored.
