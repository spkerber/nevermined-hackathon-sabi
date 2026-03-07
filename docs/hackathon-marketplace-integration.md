# Hackathon marketplace — buyer integration

Copy the sections below into the hackathon marketplace listing to help buyers integrate with Sabi.

---

## Request structure (help buyers integrate)

**Base URL:** `https://sabi-backend.ben-imadali.workers.dev`

### Step 1: Create account (one-time)

| Field | Value |
|-------|-------|
| **HTTP Method** | `POST` |
| **Path** | `/api/auth/signup` |
| **Request Body (JSON)** | `{}` |
| **Response Example (JSON)** | `{"apiKey": "sabi_sk_...", "userId": "..."}` |

### Step 2: Submit a verification (paid)

| Field | Value |
|-------|-------|
| **HTTP Method** | `POST` |
| **Path** | `/api/verifications` |
| **Headers** | `Content-Type: application/json`, `Authorization: Bearer <apiKey>`, `payment-signature: <x402-access-token>` |
| **Request Body (JSON)** | See below |
| **Response Example (JSON)** | See below |

**Request Body (JSON):**
```json
{
  "question": "Is the AWS vending machine Out of Order right now?",
  "targetLat": 37.7851,
  "targetLng": -122.3965,
  "category": "Infrastructure",
  "requesterId": "my-agent"
}
```

*Demo coords (37.7851, -122.3965) = AWS Builder Loft, SF.*

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `question` | string | Yes | The question to verify at the location |
| `targetLat` | number | Yes | Latitude of the target location |
| `targetLng` | number | Yes | Longitude of the target location |
| `category` | string | No | Category label (e.g. "Business Hours", "Inventory") |
| `requesterId` | string | No | Your agent/requester ID (defaults to "anonymous") |

**Response Example (JSON):**
```json
{
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "question": "Is Blue Bottle Coffee on Market St open right now?",
    "targetLat": 37.7830,
    "targetLng": -122.4075,
    "status": "connecting",
    "payout": 5,
    "requesterId": "my-agent",
    "createdAt": 1709654400000
  },
  "websocketUrl": "/agents/verification-agent/550e8400-e29b-41d4-a716-446655440000",
  "viewUrl": "https://webapp-psi-inky.vercel.app/verify/550e8400-e29b-41d4-a716-446655440000",
  "payment": {
    "transaction": "tx-hash",
    "creditsRedeemed": "1",
    "remainingBalance": "42"
  }
}
```

**viewUrl** — Direct link for the user to view the artifact (answer + photos) on the Sabi webapp. Present this to the buyer so they can open it; they may need to log in with their Sabi API key.

**402 without payment:** If called without `payment-signature`, the API returns HTTP 402 with a `payment-required` header (base64 JSON containing `planId` and `agentId`). Order the plan in Nevermined, get an x402 access token, and retry with the header.

### Step 3: Get job status

| Field | Value |
|-------|-------|
| **HTTP Method** | `GET` |
| **Path** | `/api/verifications/:id` |
| **Headers** | `Authorization: Bearer <apiKey>` |
| **Response Example (JSON)** | `{"status": "in_progress", "job": {...}, "frames": [...]}` |

### Step 4: Get result (when status is `verified`)

| Field | Value |
|-------|-------|
| **HTTP Method** | `GET` |
| **Path** | `/api/verifications/:id/artifact` |
| **Headers** | `Authorization: Bearer <apiKey>` |
| **Response Example (JSON)** | See below |

**Response Example (JSON):**
```json
{
  "question": "Is the AWS vending machine Out of Order right now?",
  "answer": "Yes, it's working.",
  "transcript": "...",
  "frames": [
    {
      "url": "/api/frames/jobId/1709654400000.jpg",
      "fullUrl": "https://sabi-backend.ben-imadali.workers.dev/api/frames/jobId/1709654400000.jpg",
      "timestamp": 1709654400000
    }
  ],
  "viewUrl": "https://webapp-psi-inky.vercel.app/verify/550e8400-e29b-41d4-a716-446655440000",
  "apiBaseUrl": "https://sabi-backend.ben-imadali.workers.dev"
}
```

**viewUrl** — Open this URL for the user to see the full artifact (answer + photo step-through) on the Sabi webapp. Present it to the user; they may need to log in with their Sabi API key. **fullUrl** — Each frame has a hosted URL; these require Authorization header. Use viewUrl for the simplest display.

---

## Compact copy-paste for marketplace fields

If the marketplace has separate fields for **Request Body (JSON)** and **Response Example (JSON)** for the main paid endpoint:

**Request Body (JSON):**
```json
{
  "question": "Is the AWS vending machine Out of Order right now?",
  "targetLat": 37.7851,
  "targetLng": -122.3965
}
```

**Response Example (JSON):**
```json
{
  "job": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "question": "Is Blue Bottle on Market St open?",
    "status": "connecting",
    "targetLat": 37.7830,
    "targetLng": -122.4075
  },
  "viewUrl": "https://webapp-psi-inky.vercel.app/verify/550e8400-e29b-41d4-a716-446655440000",
  "payment": {
    "creditsRedeemed": "1",
    "remainingBalance": "42"
  }
}
```

**HTTP Method:** `POST`

**Endpoint:** `https://sabi-backend.ben-imadali.workers.dev/api/verifications`

**Required headers:** `Content-Type: application/json`, `Authorization: Bearer <apiKey>`, `payment-signature: <x402-access-token>`
