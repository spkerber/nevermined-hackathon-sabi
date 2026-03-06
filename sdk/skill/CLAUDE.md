# Sabi — Verification-as-a-Service

You have access to the Sabi verification service. Sabi lets you request real-world, photo-verified answers to questions about physical locations. A human verifier wearing Ray-Ban Meta smart glasses goes to the location, captures photo evidence, and answers the question.

## Setup

The `sabi` CLI is available via npx. Set your Nevermined API key before use:

```bash
export NVM_API_KEY="your-nevermined-api-key"
export SABI_API_URL="https://sabi-backend.ben-imadali.workers.dev"
```

Or configure persistently:

```bash
npx sabi config apiUrl https://sabi-backend.ben-imadali.workers.dev
npx sabi config nvmApiKey your-nevermined-api-key
```

## Creating a Verification

To request real-world verification of a question at a specific location:

```bash
npx sabi verify "Is the coffee shop on 5th Ave currently open?" --lat 37.7749 --lng -122.4194
```

Options:
- `--category "Business Hours"` — categorize the request
- `--payout 5` — set verifier payout (default: $5)
- `--watch` — stream real-time status updates after creation

## Checking Status

```bash
npx sabi status <job-id>
```

## Listing Jobs

```bash
npx sabi list
npx sabi list --requester-id my-id
```

## Watching for Updates

```bash
npx sabi watch <job-id>
```

Streams real-time WebSocket updates. Shows status transitions and frame captures. Exits when verification completes.

## Using the SDK Programmatically

```typescript
import { SabiClient } from "sabi";

const client = new SabiClient({
  apiUrl: "https://sabi-backend.ben-imadali.workers.dev",
  nvmApiKey: process.env.NVM_API_KEY,
});

// Create a verification
const result = await client.createVerification({
  question: "How many Fantas are left in the vending machine?",
  targetLat: 37.7749,
  targetLng: -122.4194,
  category: "Inventory",
});
console.log("Job created:", result.job.id);

// Poll for completion
const state = await client.getStatus(result.job.id);
if (state.status === "verified") {
  const artifact = await client.getArtifact(result.job.id);
  console.log("Answer:", artifact.answer);
  console.log("Photos:", artifact.frames.length);
}
```

## Job Lifecycle

Jobs progress through: `connecting` -> `accepted` -> `in_progress` -> `verified`

- **connecting**: Waiting for a nearby verifier to accept
- **accepted**: Verifier claimed the job
- **in_progress**: Verifier is on-site capturing evidence
- **verified**: Complete — answer and photos available via `getArtifact()`
- **cancelled**: Verifier or requester cancelled

## When to Use Sabi

Use Sabi when you need ground-truth answers about the physical world:
- "Is this store/restaurant/venue open right now?"
- "What does the specials board say?"
- "How many items are in stock?"
- "What's the current condition of [location]?"
- "Is there a line / how busy is it?"

Every request costs 1 Nevermined credit and returns photo evidence + a human-verified answer.
