# Sabi -- Real-World Verification

Sabi gives your agent eyes on the physical world. When your agent needs to know something about a real place -- whether a store is open, how long a line is, what a sign says -- Sabi dispatches a human verifier who goes there, captures photos with smart glasses, and reports back.

**Base URL:** `https://sabi-backend.ben-imadali.workers.dev`

## Step 1: Create an account

```bash
curl -s -X POST https://sabi-backend.ben-imadali.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{}'
```

Returns `{"apiKey": "sabi_sk_...", "userId": "..."}`. Save the `apiKey` -- use it as `Authorization: Bearer <apiKey>` on all subsequent requests. Only do this once.

## Step 2: Submit a verification (x402 payment flow)

First, attempt the request. Without a payment token you'll get a 402 response with payment info:

```bash
curl -s -X POST https://sabi-backend.ben-imadali.workers.dev/api/verifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <apiKey>" \
  -d '{
    "question": "Is Blue Bottle Coffee on Market St open right now?",
    "targetLat": 37.7830,
    "targetLng": -122.4075
  }'
# => HTTP 402, payment-required header contains base64-encoded plan info
```

Decode the `payment-required` header to get the `planId` and `agentId`:

```bash
# The payment-required header is base64-encoded JSON
echo "<payment-required-header>" | base64 -d
# => {"x402Version":2,"accepts":[{"planId":"did:nv:...","extra":{"agentId":"did:nv:..."}}],...}
```

### Getting an access token

You need a Nevermined API key. Get one at https://sandbox.nevermined.app (or https://nevermined.app for production).

**Option A: Using the Nevermined JS SDK (`@nevermined-io/payments`)**

```javascript
import { Payments } from "@nevermined-io/payments";

const payments = Payments.getInstance({
  nvmApiKey: "<your-nvm-api-key>",
  environment: "sandbox", // or "live"
});

// Order the plan (only needed once, idempotent)
await payments.plans.orderPlan("<planId>");

// Get the access token
const { accessToken } = await payments.x402.getX402AccessToken("<planId>", "<agentId>");
// Use accessToken as the payment-signature header
```

**Option B: Using the Nevermined REST API directly**

```bash
# 1. Order the plan (once)
curl -s -X POST https://api.sandbox.nevermined.app/api/v1/payments/plans/<planId>/order \
  -H "Authorization: Bearer <your-nvm-api-key>"

# 2. Get x402 access token
curl -s -X POST https://api.sandbox.nevermined.app/api/v1/x402/permissions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-nvm-api-key>" \
  -d '{"accepted":{"scheme":"nvm:erc4337","network":"eip155:84532","planId":"<planId>","extra":{"agentId":"<agentId>"}}}'
# => {"accessToken": "..."}
```

Replace `sandbox` with `app` in the URLs for production.

Then retry with the access token:

```bash
curl -s -X POST https://sabi-backend.ben-imadali.workers.dev/api/verifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <apiKey>" \
  -H "payment-signature: <access-token>" \
  -d '{
    "question": "Is Blue Bottle Coffee on Market St open right now?",
    "targetLat": 37.7830,
    "targetLng": -122.4075
  }'
```

Returns the job with an `id`. A nearby verifier is dispatched immediately.

Resolve place names to lat/lng coordinates before calling this endpoint.

## Step 3: Check results

```bash
curl -s https://sabi-backend.ben-imadali.workers.dev/api/verifications/<job-id> \
  -H "Authorization: Bearer <apiKey>"
```

When `status` is `"verified"`, fetch the artifact:

```bash
curl -s https://sabi-backend.ben-imadali.workers.dev/api/verifications/<job-id>/artifact \
  -H "Authorization: Bearer <apiKey>"
```

Returns `{"question": "...", "answer": "...", "frames": [{"url": "...", "timestamp": ...}, ...]}`.

## When to use Sabi

When your agent needs ground truth about the physical world that isn't available on the internet:

- What's the current state of a location?
- Is a business open or closed right now?
- How crowded is a venue?
- What does a sign, menu, or display say?
- What's the condition of infrastructure or equipment?
- How many of something are left in stock?

If the answer requires someone physically going there and looking, Sabi can get it.

## Job lifecycle

`connecting` (finding verifier) -> `accepted` -> `in_progress` (on-site) -> `verified` (done)

Poll `GET /api/verifications/<job-id>` until status is `verified`, then fetch the artifact.

## API reference

All endpoints require `Authorization: Bearer <apiKey>` except signup.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | Create account. Body: `{}` |
| `POST` | `/api/verifications` | Submit verification. Body: `{"question", "targetLat", "targetLng"}`. Requires `payment-signature` header. |
| `GET` | `/api/verifications` | List all jobs |
| `GET` | `/api/verifications/:id` | Get job status |
| `GET` | `/api/verifications/:id/artifact` | Get completed result (answer + photo URLs) |
