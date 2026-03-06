# PRD: Sabi -- Verifiable Real-World Information (A2A)

Product Requirement Document for the SABI hackathon project: verification-as-a-service powered by Nevermined A2A payments, with two user types (requester and verifier).

---

## 1. Overview

### Pitch

- **What we're selling:** **Visual Verification as a Service** — photo-backed, human-verified proof for real-world questions. Think **X Community Notes** meets **Meta VisionClaw**: requesters get ground truth + evidence (photos + attested answer) they can use to settle [Kalshi](https://kalshi.com) / [Polymarket](https://polymarket.com) bets, validate event claims, or confirm what’s actually on the ground.
- **What we're buying:** **Event and location intel** that could use additional media or validation — times, places, details, and text that become more valuable when verified. Preference for **SF-local** and **AWS Builder Loft**–adjacent events, venues, and people.

### Purpose

Enable anyone to request verifiable, real-world information — answered and evidenced by a nearby human verifier wearing Ray-Ban Meta smart glasses. The *product* is the verification service; payment is done via agent-to-agent transaction (Nevermined credits). Verifiers are matched by geolocation from a pool and compensated per job.

### Thesis

The most valuable agents operate at the interface between the abstract digital world and the chaotic physical world. In an era of fake and generated content, verifiable truth about physical reality is increasingly scarce and valuable. Sabi bridges that gap — turning real humans with wearable hardware into a paid verification layer that AI agents and remote parties can tap into for ground-truth information with photographic evidence. In that sense, Sabi is a form of **OSINT-style verification**: a way to pay for on-demand, real-world intelligence (who, what, where, when) with photo evidence, rather than scraping or aggregating existing open-source data. See [§12 Positioning: OSINT-style verification](#positioning-osint-style-verification).

### Background

- Hackathon focus: A2A transactions with payment (x402 / Nevermined).
- Sabi follows a **mechanical-turk style model**: requesters submit verification tasks; verifiers (human-in-the-loop) see and accept or decline tasks; payment per completed task. We do not use the [Amazon Mechanical Turk](https://www.mturk.com/) API — the product is our own verification marketplace with Meta-glasses-captured evidence.
- Ray-Ban Meta glasses provide a hands-free camera stream and voice interface, making them ideal for on-the-ground verification.
- Goal: learn Nevermined end-to-end, ship a working flow, and demonstrate a novel use of wearable hardware for paid verification tasks.

### Success criteria

- One end-to-end verification: requester submits question -> verifier matched by geolocation -> verifier accepts job -> verification session captures photos + vocal answer -> requester reviews artifact (photos + answer) in webapp.
- Nevermined payment (x402) is required and used for each verification job.
- Artifact review webapp allows step-through of captured photos and displays the vocal answer.
- V1 scope: two verifiers (Ben + Spencer); no open worker signup. "Mechanical turk" is the *model* (request → match → accept/decline → evidence), not scale.

### Timeline

- V1: Verification flow + Nevermined + geolocation matching + Ray-Ban Meta session capture + artifact review webapp; verifier reject and abandon flows; refund policy (Sabi absorbs cost for failed orders).
- Post-V1: Reputation/rating system, multi-verifier consensus, richer media (video clips), agent-initiated requests, open verifier pool, automated refund flows.

---

## 2. Problem statement

### The problem

Remote parties need verifiable, real-world information but have no way to get it with evidence. Examples: "How many Fantas are left in this vending machine?", "Is this storefront open right now?", "What's the current condition of this construction site?" There is no marketplace that matches these requests to nearby humans who can physically verify and provide photographic evidence. The same verification-proof pattern applies to **personal or home** ("Is my garage door closed?") and to **outcome resolution** (e.g. prediction or betting markets such as [Kalshi](https://kalshi.com) or [Polymarket](https://polymarket.com), where photo + answer can serve as evidence for real-world outcome resolution — *visual verification* in the spirit of X Community Notes + VisionClaw). V1 focuses on venue/event and place-based verification, with a bias toward **SF-local and AWS Builder Loft** intel that benefits from media and validation; the product is generic verification-as-a-service.

### Who has this problem

- **Requesters:** Anyone (person or agent) who needs ground-truth information about a physical location or object, with photo evidence.
- **Verifiers:** People with Ray-Ban Metas near the target location who want to earn credits for quick verification tasks.

### Why now

- Hackathon theme is A2A commerce; this use case demonstrates paid, verifiable real-world data.
- Ray-Ban Meta glasses enable hands-free photo capture and voice interaction, making verification natural and low-friction.
- Learning goal: Nevermined integration, geolocation-based matching, wearable hardware integration.

### Current state

- No marketplace for on-demand, geolocated, photo-evidenced verification of real-world questions.

### Pain points (addressed by V1)

- No way to get a verified, photo-backed answer to a real-world question remotely.
- No payment rail for compensating ad-hoc physical verification work.

---

## 3. Users and jobs-to-be-done (JTBD)

### Requester

- *When I need to know something about a physical location or object, I want to submit a verification question with a target location so a nearby verifier can answer it with photo evidence.*
- *When the verification is complete, I want to review the captured photos (step-through) and the vocal answer so I can assess the quality and trust the result.*

### Verifier

- *When a verification job appears near me, I want to see the pay and location so I can decide whether to accept or decline.*
- *When I accept a job, I want clear instructions and a simple voice-driven workflow (start session -> go verify -> answer the question vocally -> end session) so I can complete it quickly using my Ray-Ban Metas.*

### Agent users (A2A)

Sabi uses **multiple agents** for selling, buying, onboarding, order-help, and turker support. See [§5 Multi-agent architecture](#multi-agent-architecture) for the full set. In the core A2A transaction: the **buyer** (requester's agent or buying agent) pays with Nevermined credits (x402) for verification; the **seller** is Sabi's verification service agent that validates payment, matches a verifier, and delivers the artifact.

---

## 4. Goals and non-goals

### Goals

- End-to-end verification flow: requester submits question + location -> geolocation matching to verifier pool -> verifier accepts/declines -> verification session (photos every 5s + vocal answer via Ray-Ban Metas) -> artifact delivered to requester.
- Artifact review webapp: step-through photo viewer + transcribed vocal answer.
- Geolocation-based matching of verification requests to nearby verifiers.
- Voice-driven session control on Ray-Ban Metas (start/end session vocally).
- Use Nevermined for payment (required).

### Non-goals (V1)

- Multi-verifier consensus or dispute resolution.
- Video streaming (photos every 5s is sufficient).
- Reputation or rating system for verifiers.
- Complex routing or global coverage.
- Scale or productization beyond demo.
- Open verifier signup or public worker pool (V1: Ben + Spencer only).
- Automated refund flows (V1: Sabi absorbs cost of failed orders and labor).
- Dynamic pricing by difficulty, distance, or estimated duration (post-V1).
- Change orders / line items (post-V1; "things change" in service world — we may add later; no full price marketplace yet).

---

## 5. Solution approach

### High-level solution

- **Requester journey:** Submit verification question + target location -> pay with Nevermined credits -> wait for verifier match -> receive artifact (photos + answer) -> review in webapp.
- **Verifier journey:** Receive nearby job notification (question summary, pay, distance) -> accept or decline -> receive detailed instructions -> use voice to start verification session on Ray-Ban Metas -> go to location, observe, answer question vocally -> end session vocally -> job complete, credits received.
- **Backend:** Verification service that (1) accepts paid verification requests, (2) matches to nearby verifiers by geolocation, (3) manages session lifecycle, (4) captures photos from Ray-Ban Meta stream (1 photo / 5 seconds), (5) transcribes vocal answer, (6) assembles and delivers artifact.
- **Ray-Ban Meta integration via companion app:** A fork of the **ray-banned** app (`~/Projects/ray-banned`) runs on the verifier's iPhone, paired with Ray-Ban Metas via Meta DAT SDK. When the verifier starts a verification session, the app programmatically captures 1 photo every 5 seconds (pattern adapted from ray-banned's `captureFrameIfNeeded()` in `CookingSessionManager`). Capture stops when the session ends. Transcription uses **Gemini 2.5 Flash** native audio via WebSocket (same as ray-banned: iPhone mic → 16kHz PCM → Gemini → transcribed answer).
- **Artifact:** A bundle containing (1) the original question, (2) the transcribed vocal answer, (3) timestamped photos captured during the session. Reviewable in a webapp as a step-through slideshow with the answer displayed.
- **Job = verifiable question:** A job is a single verifiable question (e.g. "Are the vending machines working in the AWS Loft?"). Requester submits it and sees status in their **dashboard**: `connecting` (seeking a verifier) -> `accepted` (verifier took it) -> `in_progress` (session active) -> `verified` (artifact ready, job closed). When verified: requester is charged, can see photos + answer, job is closed out.
- **Job status lifecycle:** Each verification job has a status visible to the requester: `connecting` (seeking a verifier) -> `rejected` (a verifier explicitly declined; job may be re-offered to next verifier) -> `accepted` (verifier took the job) -> `in_progress` (verification session active) -> `verified` (session complete, artifact ready) or `cancelled` / `abandoned` (verifier ended the job after acceptance but before completion). Requester sees real-time status updates in the dashboard.
- **Refunds:** When a job is `rejected` (verifier declined before starting) or `cancelled`/`abandoned` (verifier ended after accept, before completion), the requester is refunded. V1: Sabi absorbs the cost of failed orders and labor (no charge to requester; verifier not paid for abandoned jobs). Post-V1: implement Nevermined reversal/refund flows as needed.
- **Verifier choice:** Verifier can decline a job (with optional reason: e.g. too far, too difficult, can't access, unsafe, or illicit) and can end a job after acceptance but before completion (abandon), with reason; backend sets status and applies refund policy. When a verifier abandons (or declines after accepting), the job returns to `connecting` and is re-offered to the market; verifier can leave a note (e.g. "can't access location") for the system or next verifier.

### Key features (V1)

- Verification request submission: question text + target geolocation.
- Geolocation-based verifier matching from a pool of available verifiers.
- Job offer to verifier (mobile app notification): shows **pay amount**, **distance** to target, and **category** of job (e.g. "venue / vending") — not the full question detail, to avoid giving away too much before accept. Verifier can accept or decline. On accept, full question and instructions are shown.
- Detailed instructions delivered to verifier on acceptance.
- Voice-initiated verification session on Ray-Ban Metas.
- Programmatic photo capture: companion app (ray-banned fork on iPhone, Meta DAT SDK) captures 1 photo every 5 seconds from Ray-Ban Meta stream via `streamSession.capturePhoto()`; pattern from ray-banned's `captureFrameIfNeeded()`. Starts when session begins, stops when session ends. Photos uploaded to Cloudflare R2.
- Vocal answer capture: verifier speaks the answer; iPhone mic (AVAudioEngine) → 16kHz PCM → Gemini 2.5 Flash WebSocket → transcribed answer (same as ray-banned). Whether verifier also explicitly confirms (e.g. "Yes, I agree") or how to handle ambiguous photos is TBD — design for flexibility in future; V1 focus is getting the pipeline running.
- Job status lifecycle: `connecting` -> `rejected` (optional) -> `accepted` -> `in_progress` -> `verified` or `cancelled`/`abandoned`, visible to requester in real-time.
- Verifier can decline a job with optional reason (e.g. too far, too difficult, can't access, unsafe, illicit); can abandon after accept with reason. Refund to requester; V1 Sabi absorbs cost.
- Artifact assembly: question + transcribed answer + timestamped photos.
- Artifact review webapp: step-through photo viewer with answer display.
- Nevermined payment: flat rate of $5 per verification task. Requester pays upfront; verifier compensated on completion.

### Job eligibility and rejection

- **System-level (optional for V1):** Simple rules can filter jobs before offer: e.g. max distance from verifier, max payout, blocklist of keywords or categories. Jobs that fail eligibility are not offered (or get a "not eligible" state).
- **Verifier-level:** Verifier can decline or abandon with reason; reasons (e.g. "too far", "illegal") can inform eligibility rules or flagging post-V1.
- **Content policy:** We do not fulfill requests that are illegal, harmful, or that ask the verifier to do anything dangerous or illicit (e.g. life-threatening). Verifiers are encouraged to decline such jobs; Sabi may add keyword/pattern checks and manual review post-V1. Examples of in-scope: "Is my garage door closed?" (with consent); out-of-scope: "Go into a restricted area" or high-risk tasks. Onboarding and order-help agents (purchaser-facing) should guide to **doable** jobs we want to offer and apply simple guardrails so nothing illegal or out-of-scope is requested "while we're sleeping."

### Verifier identity (truth providers)

To represent verifiers as accountable truth providers, the **completion/receipt** (email or in-app notification when a verification is delivered) includes the verifier's identity and a way to connect:
- **LinkedIn profile:** Include the verifier's LinkedIn URL so the requester can see who provided the verification and optionally send a connection request (e.g. "Add us on LinkedIn" CTA). V1 verifiers: [Spencer Kerber](https://www.linkedin.com/in/spencerkerber/), [Ben Imadali](https://www.linkedin.com/in/bimadali/).
- **Receipt contents:** Job summary, artifact link, verifier name + LinkedIn link, short note inviting the requester to connect. Reinforces that a real human (identifiable, linkable) provided the evidence.

### Multi-agent architecture

We set up **multiple agents** to cover selling, buying, onboarding, order-help, and turker support. Each can be implemented as a distinct agent (e.g. Nevermined-registered, or LangChain/skill) that shares the same backend and auth.

| Agent | Role | Responsibilities |
|-------|------|------------------|
| **Seller agent** | Sabi verification-as-a-service | Lists verification as a metered service on the market; validates payment (x402); matches requests to nearby verifiers; delivers artifacts; handles reject/abandon and refund policy. Registers in Nevermined as the seller. |
| **Buyer agent** | Purchasing verification (data) | Acts on behalf of the requester to buy verification. Submits verification requests with `payment-signature`; can be the webapp, a skill inside a coding agent (Claude/Codex), or a dedicated "buying" agent that helps requesters purchase verification. |
| **Onboarding agent(s)** | User onboarding | Helps people register as requester or verifier, set location, connect wallet, and understand the flow. Can be conversational (chat) or guided UI. |
| **Order-help agent** | Helping requesters make an order | For the **purchaser**: "Here are things you could be purchasing right now; what do you think would be interesting?" Suggests question types and examples (e.g. "Are the vending machines working in the AWS Loft?", "Is there food at the lunch counter?", "Open chairs in AWS Builders Loft?"); helps formulate the verification question and target location; guides through payment and submission. From the **seller** side, this agent guides requesters to doable jobs we want to offer and applies simple guardrails (nothing illegal or out-of-scope). |
| **Turker (verifier) agent** | Assisting the human verifier | Surfaces nearby jobs (pay, distance, question summary); helps accept, decline, or abandon with reason; guides the verification session (e.g. go to location, answer vocally, end session). Runs in the verifier companion app or as a voice/skill for the turker. |

- **Seller** and **buyer** agents are required for the A2A payment flow (Nevermined). **Onboarding**, **order-help**, and **turker** agents improve UX and can be phased (e.g. order-help and turker agent in V1; onboarding can start as guided UI).
- All agents use the same backend APIs and auth; agent-specific logic can live in prompts, skills, or thin wrappers over the REST API.

**Deep agent / orchestration:** The onboarding, order-help, turker (and optionally buyer) agents are good candidates for **deep agents** — i.e. conversational agents with tool use, multi-step reasoning, and API calls. This is where **LangChain** (e.g. LangGraph, agent runtimes) or **Mindra** (as orchestration) can make sense: one orchestration layer runs these agents, each with its own prompt and tools (e.g. "submit verification", "list my jobs", "accept/decline job"), while the **seller** remains the backend service that validates payment and matches verifiers. Choice of LangChain vs Mindra is a build-time decision; both can call the same Sabi REST API.

### Service access: Skill + API

The verification service is available in two modes:

1. **Skill (for AI coding agents):** Builders using Claude Code, Codex, or similar agents install Sabi as a skill. The **buyer** or **order-help** agent can then submit verification requests conversationally (e.g. "verify how many Fantas are in the vending machine at 123 Main St").
2. **API (for applications):** Builders integrating verification into their own code call the Sabi REST API directly. The **buyer agent** or app uses this under the hood.

Both modes use the same backend and the same authentication. Both require Nevermined payment (x402) -- every verification request debits credits before it is created.

### Alternatives considered

- No payment: free verification would not demonstrate A2A commerce.
- Video streaming instead of photo capture: too complex for V1; photos every 5s provide sufficient evidence.
- Manual verifier assignment: geolocation-based matching is more scalable and demonstrates the marketplace model.

---

## 6. Requirements

### Functional

#### Requester

- Requester can submit a verification question with a target geolocation.
- `POST /verifications` requires a Nevermined `payment-signature` (x402). No payment = no verification (402 Payment Required).
- Requester has a **dashboard** and sees real-time job status: `connecting`, `rejected` (verifier declined; may be re-offered), `accepted`, `in_progress`, `verified` (artifact ready), or `cancelled`/`abandoned` (verifier ended before completion; requester refunded, V1 Sabi absorbs cost). When status is `verified`, requester is charged and can see photos + answer; job is closed out.
- Requester is notified on status transitions (especially `accepted`, `verified`, `rejected`, `cancelled`/`abandoned`).
- On completion, requester receives a receipt (email or in-app) that includes the verifier's name and LinkedIn profile link, with an optional CTA to connect (truth-provider identity).
- Requester can review the artifact in a webapp: step-through photo viewer + transcribed answer.

#### Verifier

- Verifier registers in the pool with their current geolocation.
- Verifier receives job offers (mobile notification) for nearby requests: pay, distance, and category of job (e.g. "venue / vending") — not full question detail until accepted.
- Verifier can accept or decline a job offer. Decline can include an optional reason (e.g. too far, too difficult, can't access, unsafe, illicit).
- Verifier can end the job after acceptance but before completion (abandon), with optional note; job returns to `connecting` and is re-offered to the market; job status becomes `cancelled`/`abandoned`, requester is refunded, V1 Sabi absorbs cost.
- On acceptance, verifier receives detailed instructions (full question, target location details).
- Verifier can start a verification session vocally via Ray-Ban Metas.
- During an active session, 1 photo is captured every 5 seconds from the Ray-Ban Meta stream and uploaded.
- Verifier answers the core verification question vocally; the answer is transcribed.
- Verifier can end the verification session vocally (complete) or abandon mid-job (incomplete); on session end or abandon, backend applies status and refund policy.
- On successful session end, the artifact is assembled and delivered to the requester; receipt includes verifier LinkedIn (truth-provider identity).

#### Matching

- Geolocation-based matching: when a verification request comes in, the system finds verifiers within a configurable radius of the target location.
- Matched verifiers are offered the job in order of proximity (closest first) or round-robin.
- If a verifier declines, the job is offered to the next closest verifier.

### Non-functional

- **Auth:** OAuth 2.0 Device Authorization Grant with GitHub/Google SSO. Two roles -- requester and verifier.
- **Security:** No secrets in client; Nevermined API key and plan/agent IDs only in backend env.
- **Latency:** Verifier matching within seconds of payment. Photo uploads near-real-time during session.
- **Hosting:** Cloudflare Agents SDK (Durable Objects + Workers). Globally distributed, auto-scaling.

### Agent / A2A

- Payment validation: require `payment-signature` (x402) for verification request; verify then settle via Nevermined SDK.
- **Multi-agent setup:** Seller agent (Sabi verification service), buyer agent (purchasing verification), onboarding agent(s), order-help agent (suggest question types, help make an order), turker agent (help verifier see jobs, accept/decline/abandon, run session). See [§5 Multi-agent architecture](#multi-agent-architecture).
- Seller agent accepts paid requests, matches verifiers, delivers artifacts; buyer/order-help agents submit requests; turker agent assists the human verifier. Service accessible as agent skill(s) and REST API, shared backend and auth.

---

## 7. Metrics and success criteria

### Success metrics

- At least one completed end-to-end verification (payment -> verifier match -> session with photos + vocal answer -> artifact review in webapp).
- Artifact contains timestamped photos and a transcribed answer that meaningfully responds to the question.
- Nevermined credits are debited per verification and visible in Nevermined App.

### Evaluation (optional)

- If we add LangChain-based agents or evals, we can define evals for question parsing, matching quality, or transcription accuracy; for V1, manual verification is acceptable.

---

## 8. Technical considerations

### Architecture (high-level)

- **Agents:** Seller agent (verification service, Nevermined seller); buyer agent (purchase verification); onboarding agent(s); order-help agent (suggest questions, help make an order); turker agent (verifier-facing: jobs, accept/decline/abandon, session guidance). All call the same backend/API; see [§5 Multi-agent architecture](#multi-agent-architecture).
- **Webapp (requester):** Submit verification requests (optionally via order-help agent). Review artifacts via step-through photo viewer with transcribed answer. Exact stack TBD.
- **Verifier companion app (iPhone):** A fork of the ray-banned VisionClaw app (`~/Projects/ray-banned`). SwiftUI + MVVM architecture. Paired with Ray-Ban Metas via Meta DAT SDK (`MWDATCore`, `MWDATCamera`). Hosts or integrates the **turker agent** (surfaces jobs, accept/decline/abandon, session flow). Handles job notifications, accept/decline, session lifecycle, programmatic photo capture (1/5s), and voice transcription. Reference app already has a 5-second timelapse capture pattern (`captureFrameIfNeeded()` in `CookingSessionManager`) that we adapt for verification sessions.
- **Backend / API:** Built on the **Cloudflare Agents SDK** (TypeScript classes extending `Agent`, running on Durable Objects). Each verification job maps to an agent instance with built-in SQLite (`this.sql`) for structured data (jobs, sessions, frame metadata) and real-time WebSocket state sync (`this.setState()`) for pushing status updates to requesters. **Cloudflare R2** for photo storage. No external database needed -- Durable Objects provide persistence, scheduling, and real-time communication in one primitive. Used by all agents (seller, buyer, order-help, turker).
- **Ray-Ban Meta integration:** Handled entirely through the companion app. Uses Meta DAT SDK for device pairing (`wearables.startRegistration()`), camera permissions, and streaming (`StreamSession` with `StreamSessionConfig`). Photo capture via `streamSession.capturePhoto(format: .jpeg)` with `photoDataPublisher` listener. Audio captured from iPhone mic via `AVAudioEngine` (not glasses mic). Transcription via Gemini 2.5 Flash native audio WebSocket -- same approach as ray-banned reference app (audio sent as base64 PCM at 16kHz, transcription returned inline).
- **Payment:** Nevermined only (required). Register agent + plan in Nevermined App; use payments SDK for verify/settle.
- **Auth:** OAuth 2.0 Device Authorization Grant. Two roles: requester (submit requests, review artifacts) and verifier (accept jobs, perform verifications).

### Core flows

#### 1. Verification request

```
Requester -> POST /verifications (question, target_lat, target_lng, payment-signature)
Worker (routeAgentRequest) -> VerificationAgent instance created (Durable Object)
VerificationAgent.onRequest() -> verify Nevermined payment -> persist job in this.sql
  -> this.setState({ status: "connecting" })  // pushed to requester via WebSocket
  -> find nearby verifiers -> offer job to closest
```

#### 2. Job acceptance or rejection

```
Verifier -> accept or decline in companion app (decline can include optional reason)
If accept: agent.stub.acceptJob(verifierId)  // @callable() RPC
  VerificationAgent -> this.setState({ status: "accepted", verifier: {...} })
    -> requester sees status update in real-time via WebSocket
    -> send detailed instructions to verifier
If decline: agent.stub.declineJob(verifierId, reason?)  // set status rejected; optional offer to next verifier; requester refunded, V1 Sabi absorbs cost
```

#### 3. Verification session (or abandon)

```
Verifier -> taps "Start Verification" in companion app (or abandons job before starting)
Companion app -> agent.stub.startSession()  // @callable()
VerificationAgent -> this.setState({ status: "in_progress" })
             App opens StreamSession (DAT SDK) with Ray-Ban Metas
Companion app -> captureFrameIfNeeded() every 5 seconds (adapted from CookingSessionManager pattern)
             -> streamSession.capturePhoto(format: .jpeg) -> photoDataPublisher
             -> upload JPEG to R2 -> agent.stub.addFrame(r2Key, timestamp)  // persists in this.sql
Verifier -> speaks answer to verification question
             -> iPhone mic (AVAudioEngine) -> 16kHz PCM -> Gemini WebSocket -> inputTranscription returned
Verifier -> taps "End Verification" (or voice command)  OR  taps "Abandon" (end without completing)
             -> photo capture timer stops
If complete: agent.stub.endSession(transcribedAnswer)  // @callable()
  VerificationAgent -> this.sql: save answer + finalize session
    -> this.setState({ status: "verified", artifact: {...} })
    -> assemble artifact, send receipt (with verifier LinkedIn), notify requester
If abandon: agent.stub.abandonJob(reason?)  // set status cancelled/abandoned; refund requester (V1 Sabi absorbs cost)
```

#### 4. Artifact review

```
Requester webapp -> connected to VerificationAgent via WebSocket (useAgent hook)
  -> agent.state.status === "verified"
  -> agent.stub.getArtifact()  // @callable() returns question + answer + frame URLs
Webapp -> step-through photo viewer (prev/next through timestamped photos from R2)
         + transcribed vocal answer displayed alongside
```

### Backend architecture (Cloudflare Agents SDK)

```
wrangler.jsonc:
  - durable_objects: [VerificationAgent, MatchingAgent]
  - r2_buckets: [{ binding: "FRAMES", bucket_name: "sabi-frames" }]
  - migrations: [{ new_sqlite_classes: ["VerificationAgent"] }]

VerificationAgent (extends Agent):
  - this.sql: jobs, sessions, frames tables (SQLite in Durable Object)
  - this.setState(): real-time status sync to requester webapp (WebSocket)
  - @callable(): acceptJob(), startSession(), addFrame(), endSession(), getArtifact()
  - this.env.FRAMES (R2): photo storage
  - this.schedule(): job offer timeouts, session expiry

Worker (fetch handler):
  - routeAgentRequest(request, env) for WebSocket + RPC routing
  - REST endpoints for Nevermined payment validation, verifier pool management
```

### Dependencies

- **Nevermined:** API key, agent ID, plan ID; SDK for x402.
- **VisionClaw fork (ray-banned):** iPhone companion app forked from `~/Projects/ray-banned`. Key frameworks:
  - **Meta DAT SDK** (`MWDATCore`, `MWDATCamera`): Ray-Ban Meta pairing, streaming, photo capture.
  - **Gemini 2.5 Flash** (WebSocket): Real-time voice transcription (audio in -> text out). Model: `gemini-2.5-flash-native-audio-preview`.
  - **AVFoundation / AVAudioEngine**: iPhone mic capture, audio playback.
  - **SwiftUI**: UI layer (MVVM pattern with `@MainActor`, `ObservableObject`, `@Published`).
  - Info.plist requires: MetaAppID, ClientToken, ExternalAccessory protocol `com.meta.ar.wearable`, Bluetooth background modes.
- **Cloudflare Agents SDK:** Backend framework. Durable Objects for stateful agent instances with built-in SQLite (`this.sql`), real-time WebSocket state sync (`this.setState()`), scheduled tasks, and `@callable()` RPC methods. Workers handle HTTP routing via `routeAgentRequest()`.
- **Cloudflare R2:** Photo storage (JPEG frames uploaded during verification sessions).
- **Geolocation:** Browser geolocation API for verifiers; geocoding for target locations.
- **Agent orchestration (optional for V1):** **LangChain** (e.g. LangGraph, agent runtimes) or **Mindra** — for deep agents that run onboarding, order-help, turker, and optionally buyer. These orchestration layers call the Sabi REST API; the seller agent remains the backend service. Choose one for conversational/multi-step agent logic.
- **Optional (post-V1):** Exa, Apify for search/scraping; evals for agent behavior.

### Constraints

- Must use Nevermined for A2A payment.
- V1: single demo area (hackathon venue), manual verifier pool (Ben + Spencer with Ray-Ban Metas).
- Photo capture rate fixed at 1 per 5 seconds to balance evidence quality and bandwidth.
- Flat rate pricing: $5 per verification task (V1).

---

## 9. Risks and mitigation

| Risk | Mitigation |
|------|------------|
| Nevermined integration delay | Follow 5-min setup and seller-simple-agent pattern; start with one endpoint. |
| ray-banned / VisionClaw fork complexity | Start with minimal changes (add job management + photo timer); ray-banned already has DAT SDK pairing, 5s capture pattern, and Gemini transcription. |
| Voice transcription accuracy | Gemini 2.5 Flash WebSocket handles transcription; allow verifier to review/correct answer before submission if needed. |
| Geolocation accuracy indoors | V1 at hackathon venue; use coarse matching (same building/floor). |
| Photo upload bandwidth | 1 photo / 5s is modest; compress images before upload. |
| Scope creep (fork + matching + refunds) | Strict V1: two verifiers only; defer automated refund flows; Sabi absorbs cost for reject/abandon. |
| Verifier declines or abandons | Clear statuses and refund policy; V1 we absorb cost; document in receipt/UX. |

---

## 10. Open questions

- ~~Exact hosting service~~ **Decided:** Cloudflare Agents SDK (Durable Objects + Workers + R2). No external database -- SQLite built into Durable Objects.
- ~~Transcription service~~ **Decided:** Gemini 2.5 Flash native audio via WebSocket (same as ray-banned).
- ~~Photo capture approach~~ **Decided:** Programmatic via DAT SDK `capturePhoto()`, adapted from ray-banned's `captureFrameIfNeeded()` pattern.
- Auth provider: Auth0, or self-hosted (device flow is provider-agnostic).
- How to handle verifier availability/status (online/offline, busy/free).
- VisionClaw / ray-banned fork scope: key modifications needed on top of ray-banned:
  - Add job management UI (receive/accept/decline offers).
  - Adapt `CookingSessionManager` timelapse pattern into a `VerificationSessionManager` with 5s photo timer.
  - Add Sabi backend API integration (job polling, photo upload, answer submission).
  - Strip cooking-specific features (recipe synthesis, observation logging).
- Session start/end: button in companion app (primary), with optional voice command via Gemini tool call (stretch goal).
- **Agent phasing for V1:** Seller + buyer agents are required for A2A. Should order-help and turker agents be full conversational agents in V1, or start as guided UI / minimal prompts and evolve post-demo?
- **Orchestration choice:** For deep agents (onboarding, order-help, turker, buyer), use **LangChain** (e.g. LangGraph) or **Mindra**? Both can orchestrate multi-step, tool-calling agents against the same Sabi API; decision depends on team familiarity and hackathon constraints.

---

## 11. Next steps (implementation priorities)

From team alignment (Spencer + Ben): prioritize **pipeline and infra first**, then product experience.

1. **Pipeline first**
   - **App data + APIs:** App has app data; iPhone app and web app both interact with it; Ray-Bans (via companion app) provide the data needed for the APIs. Get this data pipeline and API surface in place first.
   - **Photo storage, APIs, deploy:** Photo storage (R2), APIs for jobs/sessions/artifacts, **auto-deploy on git push**, and a **local deployment experience** so we can iterate locally. Once this is up, the product experience (UX) can be "killed and rebuilt or tweaked" as needed.
2. **VisionClaw / ray-banned (Ben):** First shot at the companion app and proof of concept; expect bugs. Ben owns getting the VisionClaw/ray-banned integration up and running (photo capture, session lifecycle, connection to backend).
3. **Then:** Shared API code that both can contribute to. **Spencer:** payments logic, Nevermined integration. **Ben:** connection to Cloud deployment, deployment of front end (something simple to start). Both: contribute to API and backend.
4. **Order-help / onboarding agent:** Build an agent for the **purchaser** that does onboarding and suggests "here are things you could be purchasing right now; what would be interesting?" so the experience isn’t "what the fuck is this?" — and from the seller side, guide to doable jobs with simple guardrails (nothing illegal). Can follow once pipeline is stable.

---

## 12. Appendix

### References

- [docs/references.md](references.md) -- hackathon links, Nevermined docs, seller-simple-agent.
- [Nevermined 5-minute setup](https://nevermined.ai/docs/integrate/quickstart/5-minute-setup).
- [nevermined-io/hackathons -- seller-simple-agent](https://github.com/nevermined-io/hackathons/tree/main/agents/seller-simple-agent).
- [Cloudflare Agents SDK docs](https://developers.cloudflare.com/agents/) -- Durable Objects, SQLite, WebSocket state sync, @callable() RPC.
- [VisionClaw](https://github.com/nicholasgoulding/VisionClaw) -- iPhone app for Ray-Ban Meta integration (upstream).
- ray-banned (`~/Projects/ray-banned`) -- Working VisionClaw fork used as reference implementation and fork base. Demonstrates DAT SDK integration, 5s timelapse capture, Gemini transcription, Cloudflare Workers + Supabase + R2 backend.
- [Ray-Ban Meta developer docs](https://www.meta.com/smart-glasses/) -- hardware reference.
- [Amazon Mechanical Turk](https://www.mturk.com/) -- crowdsourcing model reference (Sabi uses the same paradigm; we do not use the MTurk API).
- [OSINT Industries](https://www.osint.industries/) -- OSINT platform (digital lookup, real-time data, linked accounts); Sabi is complementary as paid physical-world verification / OSINT-style materials with photo evidence.
- **LangChain / LangGraph** -- option for deep-agent orchestration (multi-step, tool-calling agents). [LangChain](https://www.langchain.com/), [LangGraph](https://langchain-ai.github.io/langgraph/).
- **Mindra** -- option for agent orchestration; can run onboarding, order-help, turker, buyer agents against Sabi API. (Hackathon / team docs for Mindra integration TBD.)

### Positioning: OSINT-style verification

Sabi can be framed as an **OSINT verification service** or a **way to pay for OSINT-style materials**: requesters buy verifiable, real-world intelligence (ground truth about a place, object, or condition) with photo evidence and a human-attested answer, rather than relying on pre-existing open-source data. Tools like [OSINT Industries](https://www.osint.industries/) focus on digital footprint lookup (email, phone, username, linked accounts, breach data) and real-time retrieval from 1500+ sources; Sabi complements that by supplying **physical-world verification** on demand — a human with glasses goes to the place, captures evidence, and answers the question. Same “intelligence with confidence” goal; Sabi adds a paid, human-in-the-loop layer for physical verification that isn’t available from static or scraped OSINT alone.

### Use case spectrum

- **Venue / event:** "How many Fantas in the vending machine?", "Are there open chairs in the AWS Builders Loft?" (V1 focus). **What we're buying:** event and location intel (times, places, details, text) that would benefit from additional media or validation; preference for **SF-local** and **AWS Builder Loft**–adjacent events, venues, and people.
- **Retail / place:** "Is this storefront open?", "Condition of this construction site?"
- **Personal / home:** "Is my garage door closed?" (with appropriate consent and safety).
- **Markets / resolution:** Verification proof for prediction or betting markets (e.g. [Kalshi](https://kalshi.com), [Polymarket](https://polymarket.com)) — photo + answer as evidence for outcome resolution; V1 is generic verification, not custom market integration.

### Glossary

- **A2A:** Agent-to-agent (transaction or communication).
- **x402:** HTTP payment protocol used by Nevermined (402 Payment Required, payment-signature header).
- **Seller agent:** Sabi's verification-as-a-service agent; validates payment, matches verifiers, delivers artifacts; Nevermined seller.
- **Buyer agent:** Agent that purchases verification on behalf of the requester; submits requests with payment-signature.
- **Onboarding agent:** Helps users register (requester/verifier), set location, connect wallet.
- **Order-help agent:** Suggests question types and helps requesters formulate and submit verification orders.
- **Turker agent:** Assists the human verifier (surfaces jobs, accept/decline/abandon, session guidance); runs in companion app or as voice/skill.
- **Deep agent:** A conversational agent with tool use and multi-step reasoning; often implemented with LangChain or Mindra orchestration, calling backend APIs.
- **Orchestration:** The layer (e.g. LangChain, Mindra) that runs one or more deep agents, each with prompts and tools; here, onboarding, order-help, turker, and optionally buyer agents.
- **Verifier:** A person with Ray-Ban Meta glasses who performs on-the-ground verification tasks.
- **Requester:** A person or agent who submits a verification question and pays for the service.
- **Artifact:** The deliverable for a verification job: original question + transcribed answer + timestamped photos.
- **Verification session:** The active period during which the verifier's Ray-Ban Metas capture photos and the verifier answers the question vocally.
- **Credits:** Nevermined plan credits consumed per verification job.
- **Reject:** Verifier declines the job before starting (optional reason); requester refunded.
- **Abandon / Cancel:** Verifier ends the job after acceptance but before completion; requester refunded; V1 Sabi absorbs cost.
- **Refund:** Requester credited back when job is rejected or abandoned; V1 handled by Sabi absorbing cost (no Nevermined reversal required for demo).
- **Durable Object:** Cloudflare's stateful compute primitive. Each verification job runs as a Durable Object instance with built-in SQLite and WebSocket support.
- **R2:** Cloudflare's S3-compatible object storage, used for verification session photos.
- **OSINT:** Open-Source Intelligence; Sabi delivers OSINT-style outputs (verifiable real-world intel with photo evidence) as a paid, on-demand service rather than from static or scraped sources.
