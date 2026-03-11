# Web App Sign-In Test Plan

How to run a Sabi transaction through Cursor (or any agent), capture credentials, and test the web app sign-in experience.

## Two Identities, One Payment

| What | Stays same? | Purpose |
|------|--------------|---------|
| **Agent ID** | Yes | Sabi's seller agent in Nevermined |
| **Payment access token** | No — mint per request or reuse | Proves you've paid (x402). Get from Nevermined after ordering test4test plan |
| **Sabi API key** | Per account | Identity for Sabi backend. Used as `Authorization: Bearer <key>` |
| **Email + password** | Per account | Alternative to API key for web sign-in |

**Key insight:** Any Sabi account + any valid payment access token = can create a verification. The agent making the purchase can use any account as long as it has a valid x402 token from Nevermined.

## Two Ways to Sign In to the Web App

### Option A: API Key (from Cursor/agent transaction)

1. Run a transaction through Cursor (or the script below).
2. The agent signs up with `POST /api/auth/signup` and `{}` → gets `apiKey`, `userId`.
3. **Copy the `apiKey`** from the response (or Cursor logs).
4. Open [webapp login](https://webapp-psi-inky.vercel.app/login).
5. Click **"Sign in with API key"**.
6. Paste the API key → Sign in.
7. You're in. Submit a verification (you'll need a payment token when you hit 402).

### Option B: Email + Password (new account)

1. Open [webapp login](https://webapp-psi-inky.vercel.app/login).
2. Click **"Sign up"**.
3. Enter email and password (min 8 chars).
4. Create account → you get an API key under the hood, but you'll sign in with email/password next time.
5. Submit a verification (you'll need a payment token when you hit 402).

## Full Agent Flow (what Cursor did)

1. **Sign up** → `POST /api/auth/signup` with `{}` → `apiKey`, `userId`
2. **Submit (no payment)** → `POST /api/verifications` with Bearer → **402**
3. **Parse 402** → `payment-required` header (base64) has `planId`, `agentId`
4. **Order plan** → Nevermined API (with your NVM_API_KEY)
5. **Get x402 token** → Nevermined `/api/v1/x402/permissions`
6. **Retry with payment** → `POST /api/verifications` with `payment-signature: <token>` → **200**, job created
7. **viewUrl** → `https://webapp-psi-inky.vercel.app/verify/<job-id>`

To view the artifact in the webapp, open `viewUrl` and sign in with the **same API key** from step 1.

## What You Need for Web Testing

| For API key sign-in | For email sign-up |
|---------------------|-------------------|
| Sabi API key from agent signup | Nothing — create in webapp |
| (Optional) x402 token to submit new verifications | (Optional) x402 token to submit new verifications |

**Payment token:** Get from [Nevermined sandbox](https://sandbox.nevermined.app) → API Keys → create key. Then order the test4test plan and request an x402 token (see [agent-permissions-x402.md](agent-permissions-x402.md) for plan IDs, or run the script below which uses the 402 response).

## Quick Reference: Plan IDs (test4test)

From [agent-permissions-x402.md](agent-permissions-x402.md):

| Plan | Plan ID |
|------|---------|
| test4test USDC | `15862071005348587127783678656838286399971918534471913019449683689764138649556` |
| test4test USD | `39744595462135391286954931386343268405511793046947996933639278887278714014891` |

Use `did:nv:<planId>` when calling Nevermined APIs. Network: `eip155:84532` (Base Sepolia).

## Run Transaction Script (capture credentials)

A script in `tmp/sabi-run-transaction-capture-creds.js` runs the full flow and prints the Sabi API key for web sign-in:

```bash
# From Agent Access root
NVM_API_KEY=sandbox:your-key node tmp/sabi-run-transaction-capture-creds.js
```

Get `NVM_API_KEY` from [Nevermined sandbox](https://sandbox.nevermined.app) → API Keys. The script will:

1. Sign up (agent-style, no email)
2. Submit verification → get 402
3. Order plan + get x402 token (using your NVM key)
4. Retry with payment → create job
5. Print: **Sabi API key**, userId, viewUrl

Copy the API key and paste it at [webapp login](https://webapp-psi-inky.vercel.app/login) → "Sign in with API key".
