# Payment model: protected asset = verification artifact

Nevermined’s same x402 check can be used in three ways: **HTTP API route**, **MCP tool handler**, or **before serving a protected asset**. For Sabi we treat the **protected asset** as the right fit.

## What we’re selling

The **protected asset** is the **verification artifact**: the photos + transcribed answer that the Meta glasses wearer (verifier) produces. That’s what the buyer pays for — access to that deliverable.

- **Not** “pay per generic API call” — the value is the verification result.
- **Yes** “pay to get this artifact” — the same `requirePayment` / verify → settle flow runs **before serving the artifact** (e.g. before returning photos + answer in a GET response or download).

So: charge when the requester **accesses** the artifact (or when we commit to delivering it). The thing being sold is the artifact.

## How it maps to our flow

1. **Request** — Requester submits a verification (e.g. `POST /verifications` or current `POST /query`). Option A: payment here reserves/charges for the job; Option B: payment is only checked when they fetch the artifact.
2. **Job** — Verifier is matched, session runs, photos + answer are captured and stored (e.g. R2).
3. **Delivery** — Requester gets the artifact. **This is where the protected-asset check belongs**: before serving the artifact (e.g. `GET /verifications/:id/artifact` or `GET /jobs/:id/artifact`), run the same x402 verify (and settle) so we only hand out the asset to a valid payer.

PRD says “requester pays upfront” and “when verified: requester is charged, can see photos + answer” — so we can either (a) charge at submit and only allow artifact access for that job’s owner, or (b) gate artifact access with the same payment check. Either way, **the artifact is the protected asset**; the payment flow protects access to it.

## In code

- **Current:** `POST /query` uses `requirePayment` + `settlePayment` as a stub (pay to create a verification request). That’s the HTTP-API-route style.
- **Next:** When we add artifact delivery (e.g. step-through viewer, or an API that returns artifact JSON + media URLs), run the **same** payment middleware (or an entitlement check: “this job was paid for by this subscriber”) **before** returning the artifact. Reuse `src/seller/middleware/payments.ts` — same `buildPaymentRequired` / `verifyPermissions` / `settlePermissions` pattern before serving the protected asset.

So: **protected asset = verification artifact (photos + answer).** Use the same check before serving it; that’s how we charge/sell the Meta glasses output.
