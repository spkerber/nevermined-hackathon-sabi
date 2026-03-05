# PRD: Sabi -- Verifiable Real-World Information (A2A)

Product Requirement Document for the SABI hackathon project: verification-as-a-service powered by Nevermined A2A payments, with two user types (requester and verifier).

---

## 1. Overview

### Purpose

Enable anyone to request verifiable, real-world information -- answered and evidenced by a nearby human verifier wearing Ray-Ban Meta smart glasses. The *product* is the verification service; payment is done via agent-to-agent transaction (Nevermined credits). Verifiers are matched by geolocation from a pool and compensated per job.

### Background

- Hackathon focus: A2A transactions with payment (x402 / Nevermined).
- Ray-Ban Meta glasses provide a hands-free camera stream and voice interface, making them ideal for on-the-ground verification.
- Goal: learn Nevermined end-to-end, ship a working flow, and demonstrate a novel use of wearable hardware for paid verification tasks.

### Success criteria

- One end-to-end verification: requester submits question -> verifier matched by geolocation -> verifier accepts job -> verification session captures photos + vocal answer -> requester reviews artifact (photos + answer) in webapp.
- Nevermined payment (x402) is required and used for each verification job.
- Artifact review webapp allows step-through of captured photos and displays the vocal answer.

### Timeline

- V1: Verification flow + Nevermined + geolocation matching + Ray-Ban Meta session capture + artifact review webapp.
- Post-V1: Reputation/rating system, multi-verifier consensus, richer media (video clips), agent-initiated requests.

---

## 2. Problem statement

### The problem

Remote parties need verifiable, real-world information but have no way to get it with evidence. Examples: "How many Fantas are left in this vending machine?", "Is this storefront open right now?", "What's the current condition of this construction site?" There is no marketplace that matches these requests to nearby humans who can physically verify and provide photographic evidence.

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

- The "buyer" is the requester's agent or the app acting on their behalf; it pays with Nevermined credits (x402) for the verification service. The "seller" is Sabi's verification service agent that validates payment, matches a verifier, and delivers the artifact.

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

---

## 5. Solution approach

### High-level solution

- **Requester journey:** Submit verification question + target location -> pay with Nevermined credits -> wait for verifier match -> receive artifact (photos + answer) -> review in webapp.
- **Verifier journey:** Receive nearby job notification (question summary, pay, distance) -> accept or decline -> receive detailed instructions -> use voice to start verification session on Ray-Ban Metas -> go to location, observe, answer question vocally -> end session vocally -> job complete, credits received.
- **Backend:** Verification service that (1) accepts paid verification requests, (2) matches to nearby verifiers by geolocation, (3) manages session lifecycle, (4) captures photos from Ray-Ban Meta stream (1 photo / 5 seconds), (5) transcribes vocal answer, (6) assembles and delivers artifact.
- **Ray-Ban Meta integration via companion app:** A forked version of [VisionClaw](https://github.com/nicholasgoulding/VisionClaw) runs on the verifier's iPhone, paired with their Ray-Ban Metas. When the verifier starts a verification session, the app programmatically captures 1 photo every 5 seconds from the glasses' camera stream and uploads them. Capture stops automatically when the session ends (i.e. the verifier has answered the core question). Transcription of the verifier's vocal answer uses VisionClaw's built-in transcription capabilities.
- **Artifact:** A bundle containing (1) the original question, (2) the transcribed vocal answer, (3) timestamped photos captured during the session. Reviewable in a webapp as a step-through slideshow with the answer displayed.
- **Job status lifecycle:** Each verification job has a status visible to the requester: `connecting` (seeking a verifier; stays here if verifiers decline) -> `accepted` (verifier has taken the job) -> `in_progress` (verification session active) -> `verified` (session complete, artifact ready). Requester sees real-time status updates.

### Key features (V1)

- Verification request submission: question text + target geolocation.
- Geolocation-based verifier matching from a pool of available verifiers.
- Job offer to verifier: shows pay amount, distance to target, question summary. Verifier can accept or decline.
- Detailed instructions delivered to verifier on acceptance.
- Voice-initiated verification session on Ray-Ban Metas.
- Programmatic photo capture: companion app (VisionClaw fork on iPhone) captures 1 photo every 5 seconds from Ray-Ban Meta stream. Starts automatically when session begins, stops when session ends.
- Vocal answer capture: verifier speaks the answer to the verification question; transcribed using VisionClaw's built-in transcription.
- Job status lifecycle: `connecting` -> `accepted` -> `in_progress` -> `verified`, visible to requester in real-time.
- Artifact assembly: question + transcribed answer + timestamped photos.
- Artifact review webapp: step-through photo viewer with answer display.
- Nevermined payment: flat rate of $5 per verification task. Requester pays upfront; verifier compensated on completion.

### Service access: Skill + API

The verification service is available in two modes:

1. **Skill (for AI coding agents):** Builders using Claude Code, Codex, or similar agents install Sabi as a skill. The agent can then submit verification requests conversationally (e.g. "verify how many Fantas are in the vending machine at 123 Main St").
2. **API (for applications):** Builders integrating verification into their own code call the Sabi REST API directly.

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
- Requester sees real-time job status: `connecting` (waiting for verifier match; remains here if verifiers decline), `accepted` (verifier took the job), `in_progress` (session active), `verified` (artifact ready).
- Requester is notified on status transitions (especially `accepted` and `verified`).
- Requester can review the artifact in a webapp: step-through photo viewer + transcribed answer.

#### Verifier

- Verifier registers in the pool with their current geolocation.
- Verifier receives job offers for nearby verification requests (question summary, pay, distance).
- Verifier can accept or decline a job offer.
- On acceptance, verifier receives detailed instructions (full question, target location details).
- Verifier can start a verification session vocally via Ray-Ban Metas.
- During an active session, 1 photo is captured every 5 seconds from the Ray-Ban Meta stream and uploaded.
- Verifier answers the core verification question vocally; the answer is transcribed.
- Verifier can end the verification session vocally.
- On session end, the artifact is assembled and delivered to the requester.

#### Matching

- Geolocation-based matching: when a verification request comes in, the system finds verifiers within a configurable radius of the target location.
- Matched verifiers are offered the job in order of proximity (closest first) or round-robin.
- If a verifier declines, the job is offered to the next closest verifier.

### Non-functional

- **Auth:** OAuth 2.0 Device Authorization Grant with GitHub/Google SSO. Two roles -- requester and verifier.
- **Security:** No secrets in client; Nevermined API key and plan/agent IDs only in backend env.
- **Latency:** Verifier matching within seconds of payment. Photo uploads near-real-time during session.
- **Hosting:** Deploy on AWS or Cloudflare Workers (exact service TBD).

### Agent / A2A

- Payment validation: require `payment-signature` (x402) for verification request; verify then settle via Nevermined SDK.
- One "verification service" agent that accepts paid requests, matches verifiers, and delivers artifacts.
- Service accessible as both an agent skill and a REST API, sharing the same backend and auth.

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

- **Webapp (requester):** Submit verification requests. Review artifacts via step-through photo viewer with transcribed answer. Exact stack TBD.
- **Verifier companion app (iPhone):** A fork of [VisionClaw](https://github.com/nicholasgoulding/VisionClaw) running on the verifier's iPhone, paired with Ray-Ban Metas. Handles job notifications, accept/decline, session lifecycle, programmatic photo capture (1/5s), and voice transcription. All Ray-Ban Meta interaction flows through this app.
- **Backend / API:** Verification request handling, Nevermined payment validation (verify + settle), geolocation matching, session lifecycle management, photo storage, voice transcription, artifact assembly. Hosted on AWS or Cloudflare Workers.
- **Ray-Ban Meta integration:** Handled entirely through the VisionClaw fork companion app on iPhone. The app interfaces with Ray-Ban Metas for programmatic photo capture (1/5s) and leverages VisionClaw's built-in transcription for vocal answers. Photos uploaded to cloud storage during session.
- **Payment:** Nevermined only (required). Register agent + plan in Nevermined App; use payments SDK for verify/settle.
- **Auth:** OAuth 2.0 Device Authorization Grant. Two roles: requester (submit requests, review artifacts) and verifier (accept jobs, perform verifications).

### Core flows

#### 1. Verification request

```
Requester -> POST /verifications (question, target_lat, target_lng, payment-signature)
Backend -> verify payment -> find nearby verifiers -> offer job to closest
```

#### 2. Job acceptance

```
Verifier -> POST /jobs/:id/accept
Backend -> notify requester -> send detailed instructions to verifier
```

#### 3. Verification session

```
Verifier -> starts session in companion app (VisionClaw fork)
             Status: connecting -> accepted -> in_progress
Companion app -> programmatically captures 1 photo every 5 seconds from Ray-Ban Metas -> uploads to backend
Verifier -> speaks answer to verification question -> transcribed by VisionClaw
Verifier -> ends session in companion app (answer captured)
             Status: in_progress -> verified
Backend -> assemble artifact (question + answer + photos) -> notify requester
```

#### 4. Artifact review

```
Requester -> opens artifact in webapp
Webapp -> step-through photo viewer (prev/next through timestamped photos)
         + transcribed vocal answer displayed alongside
```

### Dependencies

- **Nevermined:** API key, agent ID, plan ID; SDK for x402.
- **VisionClaw fork:** iPhone companion app (forked from [VisionClaw](https://github.com/nicholasgoulding/VisionClaw)) for Ray-Ban Meta integration, programmatic photo capture, and built-in transcription.
- **Geolocation:** Browser geolocation API for verifiers; geocoding for target locations.
- **Cloud storage:** S3 or equivalent for session photos.
- **Hosting:** AWS or Cloudflare Workers.
- **Optional (post-V1):** Exa, Apify, LangChain for deeper agent capabilities.

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
| VisionClaw fork complexity | Start with minimal changes (add job management + photo timer); VisionClaw already handles Ray-Ban Meta pairing and transcription. |
| Voice transcription accuracy | VisionClaw's built-in transcription handles this; allow verifier to review/correct answer before submission if needed. |
| Geolocation accuracy indoors | V1 at hackathon venue; use coarse matching (same building/floor). |
| Photo upload bandwidth | 1 photo / 5s is modest; compress images before upload. |

---

## 10. Open questions

- Exact hosting service (Lambda + API Gateway vs. Workers + Durable Objects, etc.).
- Auth provider: Auth0, or self-hosted (device flow is provider-agnostic).
- How to handle verifier availability/status (online/offline, busy/free).
- VisionClaw fork scope: what modifications are needed beyond adding Sabi job management and programmatic photo timer?
- How to trigger session start/end: voice command via Ray-Ban Metas, button in companion app, or both?

---

## 11. Appendix

### References

- [docs/references.md](references.md) -- hackathon links, Nevermined docs, seller-simple-agent.
- [Nevermined 5-minute setup](https://nevermined.ai/docs/integrate/quickstart/5-minute-setup).
- [nevermined-io/hackathons -- seller-simple-agent](https://github.com/nevermined-io/hackathons/tree/main/agents/seller-simple-agent).
- [VisionClaw](https://github.com/nicholasgoulding/VisionClaw) -- iPhone app for Ray-Ban Meta integration (fork base).
- [Ray-Ban Meta developer docs](https://www.meta.com/smart-glasses/) -- hardware reference.

### Glossary

- **A2A:** Agent-to-agent (transaction or communication).
- **x402:** HTTP payment protocol used by Nevermined (402 Payment Required, payment-signature header).
- **Verifier:** A person with Ray-Ban Meta glasses who performs on-the-ground verification tasks.
- **Requester:** A person or agent who submits a verification question and pays for the service.
- **Artifact:** The deliverable for a verification job: original question + transcribed answer + timestamped photos.
- **Verification session:** The active period during which the verifier's Ray-Ban Metas capture photos and the verifier answers the question vocally.
- **Credits:** Nevermined plan credits consumed per verification job.
