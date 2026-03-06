import { routeAgentRequest, getAgentByName } from "agents";
import type { Env } from "./types";

export { VerificationAgent } from "./verification-agent";

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, payment-signature, Upgrade",
    "Access-Control-Expose-Headers": "payment-required, payment-response",
  };
}

function json(data: unknown, status = 200, extraHeaders: HeadersInit = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // Route WebSocket connections to agents (path: /agents/verification-agent/:id)
    const agentResp = await routeAgentRequest(request, env);
    if (agentResp) return agentResp;

    // Health check
    if (url.pathname === "/health") {
      return json({ status: "ok", timestamp: Date.now() }, 200, cors);
    }

    // ── GET /api/verifications ── List verification jobs
    // ?requesterId=X  → all jobs for that requester (any status)
    // no param         → available jobs (connecting only, for verifiers)
    if (url.pathname === "/api/verifications" && request.method === "GET") {
      try {
        const requesterId = url.searchParams.get("requesterId");
        const { keys } = await env.JOB_REGISTRY.list();
        const jobs = [];
        for (const key of keys) {
          const meta = await env.JOB_REGISTRY.get(key.name, "json") as {
            id: string; question: string; category: string;
            targetLat: number; targetLng: number; status: string;
            payout: number; requesterId?: string;
            createdAt?: number;
          } | null;
          if (!meta) continue;
          if (requesterId) {
            // Requester dashboard: show all their jobs
            if (meta.requesterId === requesterId) {
              jobs.push(meta);
            }
          } else {
            // Verifier feed: only show available jobs
            if (meta.status === "connecting") {
              jobs.push(meta);
            }
          }
        }
        // Sort by newest first for requester dashboard
        if (requesterId) {
          jobs.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        }
        return json({ jobs }, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/verifications ── Create a new verification job
    if (url.pathname === "/api/verifications" && request.method === "POST") {
      try {
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
        });

        // Register in KV for listing
        await env.JOB_REGISTRY.put(jobId, JSON.stringify({
          id: jobId,
          question: body.question,
          category: body.category ?? "general",
          targetLat: body.targetLat,
          targetLng: body.targetLng,
          status: "connecting",
          payout: body.payout ?? 5,
          requesterId: body.requesterId ?? "anonymous",
          createdAt: Date.now(),
        }));

        return json({
          job,
          websocketUrl: `/agents/verification-agent/${jobId}`,
        }, 201, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/seed ── Create dummy verification jobs for demo
    if (url.pathname === "/api/seed" && request.method === "POST") {
      try {
        const dummyJobs = [
          {
            question: "Is the coffee shop on 5th Ave currently open?",
            category: "Business Hours",
            targetLat: 37.7749, targetLng: -122.4194,
          },
          {
            question: "How many cars are in the parking lot at Whole Foods?",
            category: "Traffic & Parking",
            targetLat: 37.7751, targetLng: -122.4180,
          },
          {
            question: "Is there a line at the taco truck on Market St?",
            category: "Wait Times",
            targetLat: 37.7739, targetLng: -122.4171,
          },
          {
            question: "What does the specials board say at the deli on 3rd?",
            category: "Menu & Prices",
            targetLat: 37.7760, targetLng: -122.4200,
          },
          {
            question: "Is the playground equipment at Dolores Park in good condition?",
            category: "Infrastructure",
            targetLat: 37.7596, targetLng: -122.4269,
          },
        ];

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

          await env.JOB_REGISTRY.put(jobId, JSON.stringify({
            id: jobId,
            question: dummy.question,
            category: dummy.category,
            targetLat: dummy.targetLat,
            targetLng: dummy.targetLng,
            status: "connecting",
            payout: 5,
            requesterId: "demo-requester",
            createdAt: Date.now(),
          }));

          created.push(job);
        }

        return json({ created, count: created.length }, 201, cors);
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

        // Update KV registry status so it no longer shows as available
        const existing = await env.JOB_REGISTRY.get(jobId, "json") as Record<string, unknown> | null;
        if (existing) {
          await env.JOB_REGISTRY.put(jobId, JSON.stringify({ ...existing, status: "accepted" }));
        }

        return json(result, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/verifications/:id/archive ── Requester cancels/archives a connecting job
    const archiveMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)\/archive$/);
    if (archiveMatch && request.method === "POST") {
      try {
        const jobId = archiveMatch[1];
        const agent = await getAgentByName(env.VerificationAgent, jobId);
        const result = await agent.archiveJob();

        // Remove from KV registry
        await env.JOB_REGISTRY.delete(jobId);

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

        // Update KV registry so job shows as available again
        const existing = await env.JOB_REGISTRY.get(jobId, "json") as Record<string, unknown> | null;
        if (existing) {
          await env.JOB_REGISTRY.put(jobId, JSON.stringify({ ...existing, status: "connecting" }));
        }

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

        const existing = await env.JOB_REGISTRY.get(jobId, "json") as Record<string, unknown> | null;
        if (existing) {
          await env.JOB_REGISTRY.put(jobId, JSON.stringify({ ...existing, status: "in_progress" }));
        }

        return json(result, 200, cors);
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
        return json(result, 201, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── POST /api/verifications/:id/end ── End session with answer
    const endMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)\/end$/);
    if (endMatch && request.method === "POST") {
      try {
        const jobId = endMatch[1];
        const body = await request.json() as { answer: string };
        const agent = await getAgentByName(env.VerificationAgent, jobId);
        const result = await agent.endSession(body.answer);

        // Update KV registry status
        const existing = await env.JOB_REGISTRY.get(jobId, "json") as Record<string, unknown> | null;
        if (existing) {
          await env.JOB_REGISTRY.put(jobId, JSON.stringify({ ...existing, status: "verified" }));
        }

        return json(result, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── GET /api/verifications/:id/artifact ── Get the completed artifact
    const artifactMatch = url.pathname.match(/^\/api\/verifications\/([^/]+)\/artifact$/);
    if (artifactMatch && request.method === "GET") {
      try {
        const agent = await getAgentByName(env.VerificationAgent, artifactMatch[1]);
        const artifact = await agent.getArtifact();
        return json(artifact, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── GET /api/frames/:key+ ── Serve a frame image from R2
    const framesServeMatch = url.pathname.match(/^\/api\/frames\/(.+)$/);
    if (framesServeMatch && request.method === "GET") {
      const r2Key = framesServeMatch[1];
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
