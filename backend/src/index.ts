import { routeAgentRequest, getAgentByName } from "agents";
import type { Env } from "./types";
import type { JobRegistry } from "./job-registry";
import {
  buildPaymentRequired,
  build402Response,
  verifyPayment,
  settlePayment,
} from "./nevermined";

export { VerificationAgent } from "./verification-agent";
export { JobRegistry } from "./job-registry";

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Upgrade, payment-signature",
    "Access-Control-Expose-Headers": "payment-required, payment-response",
  };
}

function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

function getRegistry(env: Env): DurableObjectStub<JobRegistry> {
  const id = env.JobRegistry.idFromName("global");
  return env.JobRegistry.get(id) as DurableObjectStub<JobRegistry>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === "/health") {
      return json({ status: "ok", timestamp: Date.now() }, 200, cors);
    }

    if (url.pathname === "/api/config" && request.method === "GET") {
      return json({
        apiBaseUrl: url.origin,
        nvmEnvironment: env.NVM_ENVIRONMENT,
        nvmPlanId: env.NVM_PLAN_ID,
        nvmAgentId: env.NVM_AGENT_ID,
      }, 200, cors);
    }

    // ── GET /api/discover ── Hackathon Discovery API proxy (discover sellers & buyers at runtime)
    // Forwards to GET {HACKATHON_DISCOVERY_BASE_URL}/hackathon/register/api/discover?side=sell|buy&category=...
    if (url.pathname === "/api/discover" && request.method === "GET") {
      const base = env.HACKATHON_DISCOVERY_BASE_URL?.replace(/\/$/, "");
      if (!base) {
        return json(
          { error: "Discovery API not configured", hint: "Set HACKATHON_DISCOVERY_BASE_URL" },
          503,
          cors
        );
      }
      const discoverPath = "/hackathon/register/api/discover";
      const discoverUrl = `${base}${discoverPath}${url.search}`;
      try {
        const res = await fetch(discoverUrl);
        const data = await res.json().catch(() => ({}));
        return json(data, res.status, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 502, cors);
      }
    }

    // Route WebSocket connections to agents (path: /agents/verification-agent/:id)
    if (url.pathname.startsWith("/agents/")) {
      const agentResp = await routeAgentRequest(request, env);
      if (agentResp) return agentResp;
    }

    // ── GET /api/verifications ── List verification jobs
    if (url.pathname === "/api/verifications" && request.method === "GET") {
      try {
        const registry = getRegistry(env);
        const requesterId = url.searchParams.get("requesterId");
        const verifierId = url.searchParams.get("verifierId");
        const jobs = await registry.listJobs(
          requesterId ? { requesterId } : verifierId ? { verifierId } : undefined
        );
        return json({ jobs }, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/verifications ── Create a new verification job (payment required)
    if (url.pathname === "/api/verifications" && request.method === "POST") {
      try {
        const paymentRequired = buildPaymentRequired(env, "/api/verifications", "POST");
        const accessToken = request.headers.get("payment-signature");

        if (!accessToken) {
          return build402Response(paymentRequired, cors);
        }

        // Verify the requester has sufficient credits
        const verification = await verifyPayment(env, accessToken, paymentRequired, 1n);
        if (!verification.isValid) {
          return build402Response(paymentRequired, cors);
        }

        const body = await request.json() as {
          question: string;
          category?: string;
          targetLat: number;
          targetLng: number;
          requesterId?: string;
          payout?: number;
        };

        if (!body.question || body.targetLat == null || body.targetLng == null) {
          return json({ error: "Missing required fields: question, targetLat, targetLng" }, 400, cors);
        }

        // Settle (burn) credits upfront before creating the job
        const settlement = await settlePayment(env, accessToken, paymentRequired, 1n);
        if (!settlement.success) {
          return json({ error: "Payment settlement failed" }, 402, cors);
        }

        const jobId = crypto.randomUUID();
        const agent = await getAgentByName<typeof import("./verification-agent").VerificationAgent>(
          env.VerificationAgent, jobId
        );

        const job = await agent.createJob({
          id: jobId,
          question: body.question,
          category: body.category,
          targetLat: body.targetLat,
          targetLng: body.targetLng,
          requesterId: body.requesterId ?? "anonymous",
          paymentTx: settlement.transaction,
        });

        const registry = getRegistry(env);
        await registry.addJob({
          id: jobId,
          question: body.question,
          category: body.category ?? "general",
          targetLat: body.targetLat,
          targetLng: body.targetLng,
          status: "connecting",
          payout: body.payout ?? 5,
          requesterId: body.requesterId ?? "anonymous",
          createdAt: Date.now(),
        });

        return json({
          job,
          websocketUrl: `/agents/verification-agent/${jobId}`,
          payment: {
            transaction: settlement.transaction,
            creditsRedeemed: settlement.creditsRedeemed,
            remainingBalance: settlement.remainingBalance,
          },
        }, 201, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/seed ── Create dummy verification jobs for demo
    if (url.pathname === "/api/seed" && request.method === "POST") {
      try {
        const dummyJobs = [
          { question: "Is the coffee shop on 5th Ave currently open?", category: "Business Hours", targetLat: 37.7749, targetLng: -122.4194 },
          { question: "How many cars are in the parking lot at Whole Foods?", category: "Traffic & Parking", targetLat: 37.7751, targetLng: -122.4180 },
          { question: "Is there a line at the taco truck on Market St?", category: "Wait Times", targetLat: 37.7739, targetLng: -122.4171 },
          { question: "What does the specials board say at the deli on 3rd?", category: "Menu & Prices", targetLat: 37.7760, targetLng: -122.4200 },
          { question: "Is the playground equipment at Dolores Park in good condition?", category: "Infrastructure", targetLat: 37.7596, targetLng: -122.4269 },
        ];

        const registry = getRegistry(env);
        const created = [];
        for (const dummy of dummyJobs) {
          const jobId = crypto.randomUUID();
          const agent = await getAgentByName<typeof import("./verification-agent").VerificationAgent>(
            env.VerificationAgent, jobId
          );

          const job = await agent.createJob({
            id: jobId,
            question: dummy.question,
            category: dummy.category,
            targetLat: dummy.targetLat,
            targetLng: dummy.targetLng,
            requesterId: "demo-requester",
          });

          await registry.addJob({
            id: jobId,
            question: dummy.question,
            category: dummy.category,
            targetLat: dummy.targetLat,
            targetLng: dummy.targetLng,
            status: "connecting",
            payout: 5,
            requesterId: "demo-requester",
            createdAt: Date.now(),
          });

          created.push(job);
        }

        return json({
          created,
          count: created.length,
          message: `${created.length} demo verification jobs created. Browse them at /api/verifications or in the webapp.`,
        }, 201, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── GET /api/verifications/:id ── Get job status
    const jobMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)$/);
    if (jobMatch && request.method === "GET") {
      try {
        const agent = await getAgentByName(env.VerificationAgent, jobMatch[1]);
        const status = await agent.getStatus();
        return json(status, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/verifications/:id/accept ── Verifier accepts job
    const acceptMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)\/accept$/);
    if (acceptMatch && request.method === "POST") {
      try {
        const jobId = acceptMatch[1];
        const body = await request.json() as { verifierId: string };
        const agent = await getAgentByName(env.VerificationAgent, jobId);
        const result = await agent.acceptJob(body.verifierId);

        const registry = getRegistry(env);
        await registry.updateJob(jobId, { status: "accepted", verifierId: body.verifierId });

        return json({
          ...result,
          message: "Job accepted. Head to the location and start the verification session when you arrive.",
          nextStep: { action: "POST", url: `/api/verifications/${jobId}/start`, hint: "Call when on-site" },
        }, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/verifications/:id/archive ── Requester cancels/archives
    const archiveMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)\/archive$/);
    if (archiveMatch && request.method === "POST") {
      try {
        const jobId = archiveMatch[1];
        const agent = await getAgentByName(env.VerificationAgent, jobId);
        const result = await agent.archiveJob();

        const registry = getRegistry(env);
        await registry.removeJob(jobId);

        return json(result, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/verifications/:id/cancel ── Verifier cancels, job goes back to available
    const cancelMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)\/cancel$/);
    if (cancelMatch && request.method === "POST") {
      try {
        const jobId = cancelMatch[1];
        const agent = await getAgentByName(env.VerificationAgent, jobId);
        const result = await agent.cancelJob();

        const registry = getRegistry(env);
        await registry.updateJob(jobId, { status: "connecting" });

        return json(result, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/verifications/:id/start ── Start verification session
    const startMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)\/start$/);
    if (startMatch && request.method === "POST") {
      try {
        const jobId = startMatch[1];
        const agent = await getAgentByName(env.VerificationAgent, jobId);
        const result = await agent.startSession();

        const registry = getRegistry(env);
        await registry.updateJob(jobId, { status: "in_progress" });

        return json({
          ...result,
          message: "Verification session started. Begin capturing photos — upload frames every ~5 seconds.",
          nextStep: { action: "POST", url: `/api/verifications/${startMatch[1]}/frames`, hint: "Upload JPEG frames" },
        }, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/verifications/:id/frames ── Upload a frame (photo)
    const frameMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)\/frames$/);
    if (frameMatch && request.method === "POST") {
      try {
        const jobId = frameMatch[1];
        const contentType = request.headers.get("Content-Type") ?? "image/jpeg";
        const imageData = await request.arrayBuffer();
        const timestamp = Date.now();
        const r2Key = `${jobId}/${timestamp}.jpg`;

        await env.FRAMES.put(r2Key, imageData, {
          httpMetadata: { contentType },
        });

        const agent = await getAgentByName(env.VerificationAgent, jobId);
        const result = await agent.addFrame(r2Key, timestamp);
        return json({
          ...result,
          message: `Frame captured. ${result.frameCount} photo${result.frameCount !== 1 ? "s" : ""} in session.`,
          timestamp,
        }, 201, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/verifications/:id/end ── End session with answer
    const endMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)\/end$/);
    if (endMatch && request.method === "POST") {
      try {
        const jobId = endMatch[1];
        const body = await request.json() as { answer: string; transcript?: string };
        const agent = await getAgentByName(env.VerificationAgent, jobId);
        const result = await agent.endSession(body.answer, body.transcript);

        const registry = getRegistry(env);
        await registry.updateJob(jobId, { status: "verified" });

        return json({
          ...result,
          message: "Verification complete. The requester can now review your evidence and answer.",
        }, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── GET /api/verifications/:id/artifact ── Get the completed artifact (payment-gated)
    const artifactMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)\/artifact$/);
    if (artifactMatch && request.method === "GET") {
      try {
        const agent = await getAgentByName(env.VerificationAgent, artifactMatch[1]);
        const status = await agent.getStatus();

        // Only serve artifact if the job was paid for
        if (!status.job?.payment_tx) {
          return json({ error: "Payment required to access artifact" }, 402, cors);
        }

        const artifact = await agent.getArtifact();
        return json(artifact, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── GET /api/frames/:key+ ── Serve a frame image from R2 (payment-gated)
    const framesServeMatch = url.pathname.match(/^\/api\/frames\/(.+)$/);
    if (framesServeMatch && request.method === "GET") {
      const r2Key = framesServeMatch[1];

      // Extract jobId from the r2Key (format: jobId/timestamp.jpg)
      const jobId = r2Key.split("/")[0];
      if (jobId) {
        try {
          const agent = await getAgentByName(env.VerificationAgent, jobId);
          const status = await agent.getStatus();
          if (!status.job?.payment_tx) {
            return json({ error: "Payment required to access frames" }, 402, cors);
          }
        } catch {
          return json({ error: "Job not found" }, 404, cors);
        }
      }

      const object = await env.FRAMES.get(r2Key);

      if (!object) {
        return json({ error: "Frame not found" }, 404, cors);
      }

      return new Response(object.body, {
        headers: {
          "Content-Type": object.httpMetadata?.contentType ?? "image/jpeg",
          "Cache-Control": "public, max-age=31536000, immutable",
          ...cors,
        },
      });
    }

    return json({ error: "Not found" }, 404, cors);
  },
} satisfies ExportedHandler<Env>;
