# Nevermined Hackathon — SABI Submission Answers

Draft answers for the Cerebral Valley Global Prize submission form. Copy/paste as needed.

---

## Team Name

**Most Fun**

---

## Team Members

Add by searching CV handle or email:
- **spkerber** (Spencer P)
- **Ben Imadali** — search by email or handle if he has one

---

## Project Description

**Sabi — Verifiable Real-World Information**

A2A verification-as-a-service: requesters submit real-world questions (e.g. "How many Fantas are in the vending machine?"), nearby verifiers with Ray-Ban Meta smart glasses go check, capture photo evidence, and answer vocally. Requesters review the artifact (photos + transcribed answer) in a webapp.

We sell **visual verification as a service** — photo-backed, human-verified proof for real-world questions. Think X Community Notes meets Meta VisionClaw: requesters get ground truth + evidence (photos + attested answer) for prediction markets, event validation, or on-the-ground intel. Payment via Nevermined x402; verifiers are matched by geolocation and compensated per job.

**Live deployment:**
- Webapp: https://webapp-psi-inky.vercel.app
- Backend: https://sabi-backend.ben-imadali.workers.dev

---

## Public GitHub Repository

https://github.com/spkerber/nevermined-hackathon-sabi

---

## Demo Video

*(Upload later after updates — placeholder for now)*

---

## What Theme is Your Project Under?

**Most Interconnected** — We have both selling and buying activity:
- **Seller agent:** Sabi verification-as-a-service; validates x402 payment, matches verifiers by geolocation, delivers artifacts (photos + transcribed answer)
- **Buyer agent:** Submits verification requests with payment-signature; can be webapp, skill, or dedicated buying agent

Alternative fits: **Best Autonomous Seller** (we package and monetize verification effectively) or **Best Autonomous Buyer** (we discover, evaluate, and pay for verification).

---

## What Sponsor Prize Did You Pursue?

*(Select one or leave blank if none)*

- **Ability.ai** — *(if you integrated their APIs)*
- **Mindra** — *(PRD mentions Mindra as optional orchestration for deep agents; if not integrated, skip)*
- **ZeroClick** — *(if you integrated their APIs)*

**Recommendation:** Leave blank unless you specifically integrated one of these sponsors. Your core stack is Nevermined + Cloudflare + Meta + Gemini.

---

## Which Partner APIs/Services Did You Use?

- **Nevermined** — A2A payments (x402), agent registration, plan subscription
- **Cloudflare** — Workers, Durable Objects, R2 (photo storage), Agents SDK
- **Meta** — Ray-Ban Meta glasses, Meta DAT SDK (camera streaming, photo capture)
- **Google Gemini** — Gemini 2.5 Flash (real-time voice transcription via WebSocket)
- **Vercel** — Webapp hosting
- **Doppler** — Secrets management (API keys, env config)

---

## What was Easy and Difficult when Implementing Nevermined?

*(Note: This will not impact judging.)*

**Easy:**
- Nevermined 5-minute setup and seller-simple-agent pattern gave a clear path to register agent + plan and wire x402
- Cloudflare Agents SDK (Durable Objects, SQLite, WebSocket state sync) fit our verification-job lifecycle well
- Reusing the VisionClaw/ray-banned fork for Ray-Ban Meta integration — DAT SDK pairing, 5s photo capture, and Gemini transcription were already proven

**Difficult:**
- Payment validation timing: deciding when to charge (at request vs. at artifact delivery) and gating the protected asset (verification artifact) correctly
- Sandbox → production flow: plan ordering, permissions, and ensuring buyer/seller keys and env vars align across Doppler and Cloudflare
- Integrating the full stack (Nevermined + Cloudflare Workers + companion app + webapp) with consistent env and deployment URLs

---

## Quick Reference — URLs for Form

| Field | Value |
|-------|-------|
| Webapp | https://webapp-psi-inky.vercel.app |
| Backend / Endpoint | https://sabi-backend.ben-imadali.workers.dev |
| Endpoint URL (marketplace) | https://sabi-backend.ben-imadali.workers.dev/query |
