const SKILL = `# Sabi -- Real-World Verification

Sabi gives your agent eyes on the physical world. When your agent needs to know something about a real place -- whether a store is open, how long a line is, what a sign says -- Sabi dispatches a human verifier who goes there, captures photos with smart glasses, and reports back.

**Base URL:** \`https://sabi-backend.ben-imadali.workers.dev\`

## Step 1: Create an account

\`\`\`bash
curl -s -X POST https://sabi-backend.ben-imadali.workers.dev/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"nvmAgentId": "agent_'"$(uuidgen | tr '[:upper:]' '[:lower:]' | head -c 12)"'"}'
\`\`\`

Returns \`{"apiKey": "sabi_sk_...", "userId": "..."}\`. Save the \`apiKey\` -- use it as \`Authorization: Bearer <apiKey>\` on all subsequent requests. Only do this once.

## Step 2: Submit a verification

\`\`\`bash
curl -s -X POST https://sabi-backend.ben-imadali.workers.dev/api/verifications \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <apiKey>" \\
  -d '{
    "question": "Is Blue Bottle Coffee on Market St open right now?",
    "targetLat": 37.7830,
    "targetLng": -122.4075
  }'
\`\`\`

Returns the job with an \`id\`. A nearby verifier is dispatched immediately.

Resolve place names to lat/lng coordinates before calling this endpoint.

## Step 3: Check results

\`\`\`bash
curl -s https://sabi-backend.ben-imadali.workers.dev/api/verifications/<job-id> \\
  -H "Authorization: Bearer <apiKey>"
\`\`\`

When \`status\` is \`"verified"\`, fetch the artifact:

\`\`\`bash
curl -s https://sabi-backend.ben-imadali.workers.dev/api/verifications/<job-id>/artifact \\
  -H "Authorization: Bearer <apiKey>"
\`\`\`

Returns \`{"question": "...", "answer": "...", "frames": [{"url": "...", "timestamp": ...}, ...]}\`.

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

\`connecting\` (finding verifier) -> \`accepted\` -> \`in_progress\` (on-site) -> \`verified\` (done)

Poll \`GET /api/verifications/<job-id>\` until status is \`verified\`, then fetch the artifact.

## API reference

All endpoints require \`Authorization: Bearer <apiKey>\` except signup.

| Method | Path | Description |
|--------|------|-------------|
| \`POST\` | \`/api/auth/signup\` | Create account. Body: \`{"nvmAgentId": "..."}\` |
| \`POST\` | \`/api/verifications\` | Submit verification. Body: \`{"question", "targetLat", "targetLng"}\` |
| \`GET\` | \`/api/verifications\` | List all jobs |
| \`GET\` | \`/api/verifications/:id\` | Get job status |
| \`GET\` | \`/api/verifications/:id/artifact\` | Get completed result (answer + photo URLs) |
`;

export async function GET() {
  return new Response(SKILL, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
}
