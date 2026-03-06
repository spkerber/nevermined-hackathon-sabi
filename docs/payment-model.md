# Payment model: protected asset = verification artifact

Nevermined’s same x402 check can be used in three ways: **HTTP API route**, **MCP tool handler**, or **before serving a protected asset**. For Sabi we treat the **protected asset** as the right fit.

## What we’re selling (asset source: Ben’s Meta app)

The **protected asset** is the **verification artifact**: the photos + transcribed answer that the **Meta glasses wearer (verifier)** produces via **Ben’s VisionClaw / ray-banned–style app**. That app is the asset source; this repo’s seller agent gates and sells access to those deliverables.

- **Asset source:** Ben’s app (VisionClaw, Meta DAT SDK, companion app) captures and stores the verification outputs. The seller agent (this branch) will protect and monetize access to those assets — either by serving them behind the same x402 check or by putting them behind [Nevermined’s HTTP Proxy](https://nevermined.ai/docs/solutions/access-control-monetization-static-resources) for static-resource protection.
- **Branch scope:** This branch (`feature/buyers-sellers-agents`) implements the seller/buyer payment layer; integration with Ben’s app (e.g. where artifacts are stored, how the seller serves or proxies them) is the next step. The assets for sale are whatever Ben’s app provides (artifacts at URLs, or API responses).

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

So: **protected asset = verification artifact (photos + answer)** produced by Ben’s app. Use the same check (or Nevermined’s [static resources proxy](https://nevermined.ai/docs/solutions/access-control-monetization-static-resources)) before serving it; that’s how we charge/sell the Meta glasses output.

**Nevermined guide:** We follow the [Static Resources Protection & Monetization](https://nevermined.ai/docs/solutions/access-control-monetization-static-resources) pattern (transparent HTTP Proxy, payment plans, fine-grained access). Doc index: [docs.nevermined.app/llms.txt](https://docs.nevermined.app/llms.txt). In the Nevermined App, set **API Configuration** (Protected API Endpoints, Agent Definition URL) to your deployed origin (e.g. Cloudflare Worker base URL); see [doppler-and-env.md](doppler-and-env.md#nevermined-app--api-configuration-replace-old-url).
