# Sabi

Get real-world answers with photo proof. Ask a question about a physical location, and a human verifier wearing smart glasses goes there, captures photos, and answers it.

## For AI agents

Copy [`skill/SKILL.md`](skill/SKILL.md) into your agent's skill or tool directory. The agent can then sign itself up, submit verifications, and retrieve results using plain HTTP -- no SDK or dependencies needed.

```
You: "Check if there's a line at Blue Bottle Coffee on Market St"
Agent: [signs up, submits verification, polls for completion, returns photos + answer]
```

## For developers

The full API is three calls:

```bash
# 1. Sign up (once)
curl -X POST https://sabi-backend.ben-imadali.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{}'
# Returns: {"apiKey": "sabi_sk_...", "userId": "..."}

# 2. Submit a verification (requires x402 payment token)
curl -X POST https://sabi-backend.ben-imadali.workers.dev/api/verifications \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sabi_sk_..." \
  -H "payment-signature: <access-token>" \
  -d '{"question": "Is the coffee shop open?", "targetLat": 37.78, "targetLng": -122.41}'
# Returns: {"job": {"id": "...", "status": "connecting", ...}}

# 3. Get the result
curl https://sabi-backend.ben-imadali.workers.dev/api/verifications/<job-id>/artifact \
  -H "Authorization: Bearer sabi_sk_..."
# Returns: {"answer": "Yes, it's open", "frames": [...photos...]}
```

## API reference

All endpoints require `Authorization: Bearer <apiKey>` except signup.

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/signup` | Create account. Body: `{}` |
| `POST` | `/api/verifications` | Submit verification. Body: `{"question", "targetLat", "targetLng"}`. Requires `payment-signature` header. |
| `GET` | `/api/verifications` | List your jobs |
| `GET` | `/api/verifications/:id` | Job status |
| `GET` | `/api/verifications/:id/artifact` | Completed result (answer + photo URLs) |

## Job lifecycle

`connecting` -> `accepted` -> `in_progress` -> `verified`

Poll `GET /api/verifications/:id` until status is `verified`, then fetch the artifact.

## License

MIT
