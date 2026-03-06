import { routeAgentRequest, getAgentByName } from "agents";
import type { Env } from "./types";
import type { JobRegistry } from "./job-registry";
import {
  buildPaymentRequired,
  verifyPayment,
  settlePayment,
  getX402AccessToken,
} from "./nevermined";
import {
  hashPassword,
  verifyPassword,
  generateApiKey,
  getAuthRegistry,
  authenticateRequest,
  type AuthUser,
} from "./auth";

export { VerificationAgent } from "./verification-agent";
export { JobRegistry } from "./job-registry";
export { AuthRegistry } from "./auth-registry";

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin ?? "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Upgrade",
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

// Paths that don't require auth
const PUBLIC_PATHS = new Set([
  "/health",
  "/api/config",
  "/api/auth/signup",
  "/api/auth/login",
  "/api/auth/github",
  "/api/auth/github/callback",
  "/api/auth/google",
  "/api/auth/google/callback",
]);

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.has(pathname) || pathname === "/api/discover";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("Origin");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    // --- Public routes (no auth) ---

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

    // ── Auth routes ──

    if (url.pathname === "/api/auth/signup" && request.method === "POST") {
      try {
        const body = await request.json() as {
          email?: string;
          password?: string;
          nvmAgentId?: string;
        };

        const registry = getAuthRegistry(env);
        const apiKey = generateApiKey();

        // Agent signup: just needs nvmAgentId
        if (body.nvmAgentId && !body.email) {
          const agentEmail = `agent_${crypto.randomUUID().slice(0, 8)}@sabi.local`;
          const account = await registry.createAccount({
            email: agentEmail,
            passwordHash: null,
            apiKey,
            nvmAgentId: body.nvmAgentId,
          });
          return json({ apiKey: account.apiKey, userId: account.id }, 201, cors);
        }

        // Human signup: email + password required
        if (!body.email || !body.password) {
          return json({ error: "Email and password are required (or nvmAgentId for agent signup)" }, 400, cors);
        }
        if (body.password.length < 8) {
          return json({ error: "Password must be at least 8 characters" }, 400, cors);
        }

        const existing = await registry.getAccountByEmail(body.email);
        if (existing) {
          return json({ error: "Account with this email already exists" }, 409, cors);
        }

        const passwordHash = await hashPassword(body.password);
        const account = await registry.createAccount({
          email: body.email,
          passwordHash,
          apiKey,
          nvmAgentId: body.nvmAgentId,
        });

        return json({ apiKey: account.apiKey, userId: account.id, email: account.email }, 201, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      try {
        const body = await request.json() as { email: string; password: string };
        if (!body.email || !body.password) {
          return json({ error: "Email and password are required" }, 400, cors);
        }

        const registry = getAuthRegistry(env);
        const account = await registry.getAccountByEmail(body.email);
        if (!account || !account.passwordHash) {
          return json({ error: "Invalid email or password" }, 401, cors);
        }

        const valid = await verifyPassword(body.password, account.passwordHash);
        if (!valid) {
          return json({ error: "Invalid email or password" }, 401, cors);
        }

        return json({ apiKey: account.apiKey, userId: account.id, email: account.email }, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── GitHub OAuth ──

    if (url.pathname === "/api/auth/github" && request.method === "GET") {
      const state = crypto.randomUUID();
      const callbackUrl = `${url.origin}/api/auth/github/callback`;
      const githubUrl = new URL("https://github.com/login/oauth/authorize");
      githubUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      githubUrl.searchParams.set("redirect_uri", callbackUrl);
      githubUrl.searchParams.set("scope", "user:email");
      githubUrl.searchParams.set("state", state);
      return Response.redirect(githubUrl.toString(), 302);
    }

    if (url.pathname === "/api/auth/github/callback" && request.method === "GET") {
      try {
        const code = url.searchParams.get("code");
        if (!code) return json({ error: "Missing code" }, 400, cors);

        // Exchange code for access token
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            client_id: env.GITHUB_CLIENT_ID,
            client_secret: env.GITHUB_CLIENT_SECRET,
            code,
          }),
        });
        const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
        if (!tokenData.access_token) {
          return json({ error: tokenData.error ?? "OAuth token exchange failed" }, 400, cors);
        }

        // Get user info
        const userRes = await fetch("https://api.github.com/user", {
          headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Sabi" },
        });
        const ghUser = await userRes.json() as { id: number; email: string | null; login: string };

        // Get primary email if not public
        let email = ghUser.email;
        if (!email) {
          const emailsRes = await fetch("https://api.github.com/user/emails", {
            headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "Sabi" },
          });
          const emails = await emailsRes.json() as { email: string; primary: boolean; verified: boolean }[];
          const primary = emails.find((e) => e.primary && e.verified);
          email = primary?.email ?? emails[0]?.email ?? null;
        }
        if (!email) {
          return redirectWithError(env, "Could not retrieve email from GitHub");
        }

        const githubId = String(ghUser.id);
        const registry = getAuthRegistry(env);

        // Check if GitHub account is already linked
        let account = await registry.getAccountByGithubId(githubId);
        if (!account) {
          // Check if email account exists — link GitHub to it
          account = await registry.getAccountByEmail(email);
          if (account) {
            await registry.linkGithub(account.id, githubId);
          } else {
            // Create new account
            const apiKey = generateApiKey();
            account = await registry.createAccount({ email, passwordHash: null, apiKey, githubId });
          }
        }

        return redirectWithToken(env, account.apiKey);
      } catch (err) {
        return redirectWithError(env, (err as Error).message);
      }
    }

    // ── Google OAuth ──

    if (url.pathname === "/api/auth/google" && request.method === "GET") {
      const callbackUrl = `${url.origin}/api/auth/google/callback`;
      const googleUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      googleUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID);
      googleUrl.searchParams.set("redirect_uri", callbackUrl);
      googleUrl.searchParams.set("response_type", "code");
      googleUrl.searchParams.set("scope", "openid email profile");
      googleUrl.searchParams.set("access_type", "offline");
      return Response.redirect(googleUrl.toString(), 302);
    }

    if (url.pathname === "/api/auth/google/callback" && request.method === "GET") {
      try {
        const code = url.searchParams.get("code");
        if (!code) return json({ error: "Missing code" }, 400, cors);

        const callbackUrl = `${url.origin}/api/auth/google/callback`;
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: callbackUrl,
            grant_type: "authorization_code",
          }),
        });
        const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
        if (!tokenData.access_token) {
          return json({ error: tokenData.error ?? "OAuth token exchange failed" }, 400, cors);
        }

        // Get user info
        const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const gUser = await userRes.json() as { id: string; email: string };
        if (!gUser.email) {
          return redirectWithError(env, "Could not retrieve email from Google");
        }

        const registry = getAuthRegistry(env);

        let account = await registry.getAccountByGoogleId(gUser.id);
        if (!account) {
          account = await registry.getAccountByEmail(gUser.email);
          if (account) {
            await registry.linkGoogle(account.id, gUser.id);
          } else {
            const apiKey = generateApiKey();
            account = await registry.createAccount({ email: gUser.email, passwordHash: null, apiKey, googleId: gUser.id });
          }
        }

        return redirectWithToken(env, account.apiKey);
      } catch (err) {
        return redirectWithError(env, (err as Error).message);
      }
    }

    // ── GET /api/auth/me ── Get current user info
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      const user = await authenticateRequest(request, env);
      if (!user) return json({ error: "Unauthorized" }, 401, cors);
      const registry = getAuthRegistry(env);
      const nvmAgentId = await registry.getNvmAgentId(user.id);
      return json({ userId: user.id, email: user.email, hasNvmAgentId: !!nvmAgentId }, 200, cors);
    }

    // ── PUT /api/auth/nvm-agent-id ── Attach or update Nevermined Agent ID
    if (url.pathname === "/api/auth/nvm-agent-id" && request.method === "PUT") {
      const user = await authenticateRequest(request, env);
      if (!user) return json({ error: "Unauthorized" }, 401, cors);
      try {
        const body = await request.json() as { nvmAgentId: string };
        if (!body.nvmAgentId) {
          return json({ error: "nvmAgentId is required" }, 400, cors);
        }
        const registry = getAuthRegistry(env);
        await registry.setNvmAgentId(user.id, body.nvmAgentId);
        return json({ ok: true }, 200, cors);
      } catch (err) {
        return json({ error: (err as Error).message }, 500, cors);
      }
    }

    // ── GET /api/discover ── Hackathon Discovery API proxy
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

    // --- Auth required for all routes below ---

    // WebSocket connections need auth via query param since headers aren't supported
    if (url.pathname.startsWith("/agents/")) {
      // Allow WebSocket upgrade with ?apiKey= query param
      const apiKeyParam = url.searchParams.get("apiKey");
      if (apiKeyParam) {
        const registry = getAuthRegistry(env);
        const user = await registry.getAccountByApiKey(apiKeyParam);
        if (!user) return json({ error: "Unauthorized" }, 401, cors);
      } else {
        const user = await authenticateRequest(request, env);
        if (!user) return json({ error: "Unauthorized" }, 401, cors);
      }
      const agentResp = await routeAgentRequest(request, env);
      if (agentResp) return agentResp;
    }

    // Authenticate all remaining API routes
    const user = await authenticateRequest(request, env);
    if (!user) {
      return json({ error: "Unauthorized. Provide Authorization: Bearer sabi_sk_..." }, 401, cors);
    }

    // ── GET /api/verifications ── List verification jobs
    if (url.pathname === "/api/verifications" && request.method === "GET") {
      try {
        const registry = getRegistry(env);
        const mine = url.searchParams.get("mine");
        const requesterId = url.searchParams.get("requesterId");
        const verifierId = mine === "true" ? user.id : url.searchParams.get("verifierId");
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

        // Resolve buyer's Nevermined Agent ID
        const authRegistry = getAuthRegistry(env);
        const buyerAgentId = await authRegistry.getNvmAgentId(user.id);

        if (!buyerAgentId) {
          return json({ error: "Nevermined Agent ID required. Set it via PUT /api/auth/nvm-agent-id" }, 402, cors);
        }

        // Get access token using our server key + buyer's agent ID
        let accessToken: string;
        try {
          accessToken = await getX402AccessToken(env, buyerAgentId);
        } catch (tokenErr) {
          const msg = (tokenErr as Error).message ?? "";
          if (msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("agent")) {
            return json({
              error: `Nevermined Agent ID "${buyerAgentId}" is not registered on the Nevermined platform. Register your agent at https://nevermined.app or update your agent ID via PUT /api/auth/nvm-agent-id with a valid Nevermined agent ID.`,
            }, 402, cors);
          }
          throw tokenErr;
        }

        // Verify the requester has sufficient credits
        const verification = await verifyPayment(env, accessToken, paymentRequired, 1n);
        if (!verification.isValid) {
          return json({ error: "Insufficient credits. Purchase more at https://nevermined.app" }, 402, cors);
        }

        const body = await request.json() as {
          question: string;
          category?: string;
          targetLat: number;
          targetLng: number;
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
          requesterId: user.id,
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
          requesterId: user.id,
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
            requesterId: user.id,
          });

          await registry.addJob({
            id: jobId,
            question: dummy.question,
            category: dummy.category,
            targetLat: dummy.targetLat,
            targetLng: dummy.targetLng,
            status: "connecting",
            payout: 5,
            requesterId: user.id,
            createdAt: Date.now(),
          });

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
        const agent = await getAgentByName(env.VerificationAgent, jobId);
        const result = await agent.acceptJob(user.id);

        const registry = getRegistry(env);
        await registry.updateJob(jobId, { status: "accepted", verifierId: user.id });

        return json(result, 200, cors);
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
        const body = await request.json() as { answer: string; transcript?: string };
        const agent = await getAgentByName(env.VerificationAgent, jobId);
        const result = await agent.endSession(body.answer, body.transcript);

        const registry = getRegistry(env);
        await registry.updateJob(jobId, { status: "verified" });

        return json(result, 200, cors);
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

// --- OAuth redirect helpers ---

function redirectWithToken(env: Env, apiKey: string): Response {
  const redirectUrl = `${env.AUTH_REDIRECT_URL}/login#token=${apiKey}`;
  return Response.redirect(redirectUrl, 302);
}

function redirectWithError(env: Env, error: string): Response {
  const redirectUrl = `${env.AUTH_REDIRECT_URL}/login#error=${encodeURIComponent(error)}`;
  return Response.redirect(redirectUrl, 302);
}
