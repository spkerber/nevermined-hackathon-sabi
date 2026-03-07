import { CodeBlock } from "./CodeBlock";

export const metadata = {
  title: "Sabi - Getting Started",
  description: "Developer documentation for the Sabi verification API.",
};

const SKILL_URL = "https://webapp-psi-inky.vercel.app/skill";
const WEBAPP_URL = "https://webapp-psi-inky.vercel.app";
const API_BASE = "https://sabi-backend.ben-imadali.workers.dev";

const AGENT_SNIPPET = `Follow the instructions at ${SKILL_URL} to use the Sabi real-world verification API. Sign up, submit verifications, and retrieve photo-verified answers about physical locations.`;

const DEMO_PROMPT = "Is the AWS vending machine Out of Order right now?";
const DEMO_PROMPT_ALT = "Is there security at the front desk?";

export default function DocsPage() {
  return (
    <main
      className="max-w-2xl mx-auto px-6 py-16 font-mono text-sabi-text"
      role="main"
      aria-label="Sabi developer documentation"
    >
      <h1 className="text-2xl font-bold mb-2 text-sabi-text">Sabi</h1>
      <p className="text-sabi-muted mb-10">
        Give your agent eyes on the physical world.
      </p>

      {/* Demo / Try it */}
      <section
        className="mb-12 p-4 rounded border border-sabi-success/40 bg-sabi-success/10"
        aria-labelledby="try-it-now"
      >
        <h2 id="try-it-now" className="text-sm font-bold text-sabi-success uppercase tracking-wider mb-3">
          Try it now
        </h2>
        <p className="text-sabi-text text-sm mb-3">
          Go to the{" "}
          <a
            href={`${WEBAPP_URL}?demo=1`}
            className="text-sabi-accent hover:text-sabi-accent-hover underline underline-offset-2"
          >
            web app
          </a>{" "}
          (demo pre-filled), or give your Nevermined agent our docs URL plus your preferred prompt to get verified.
        </p>
        <p className="text-sabi-muted text-sm mb-2">
          <span className="text-sabi-muted">Example prompt:</span> &ldquo;{DEMO_PROMPT}&rdquo;
        </p>
        <p className="text-sabi-muted text-xs mb-3">
          Or: &ldquo;{DEMO_PROMPT_ALT}&rdquo;
        </p>
        <div className="flex items-center gap-4">
          <a href={`${WEBAPP_URL}?demo=1`} className="shrink-0" aria-label="Open web app with demo">
            {/* eslint-disable-next-line @nextjs/next/no-img-element */}
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${WEBAPP_URL}?demo=1`)}`}
              alt="QR code: open web app with demo"
              className="rounded border border-sabi-border"
              width={120}
              height={120}
            />
          </a>
          <p className="text-sabi-muted text-xs">
            Scan the QR code or open{" "}
            <a
              href={`${WEBAPP_URL}?demo=1`}
              className="text-sabi-accent hover:text-sabi-accent-hover break-all underline underline-offset-2"
            >
              {WEBAPP_URL}?demo=1
            </a>{" "}
            to place the demo order (AWS vending machine).
          </p>
        </div>
      </section>

      <section className="mb-12" aria-labelledby="tell-agent">
        <h2 id="tell-agent" className="text-sm font-bold text-sabi-muted uppercase tracking-wider mb-3">
          Tell your agent
        </h2>
        <p className="text-sabi-muted text-sm mb-3">
          Copy this and paste it to your AI agent. That&apos;s all you need to do.
        </p>
        <CodeBlock code={AGENT_SNIPPET} />
      </section>

      <hr className="border-sabi-border mb-12" aria-hidden />

      <p className="text-sabi-text mb-10 leading-relaxed">
        Sabi dispatches a human verifier to any location. They capture photos
        with smart glasses and answer your agent&apos;s question. Three API calls.
        No SDK.
      </p>

      <section className="mb-12" aria-labelledby="sign-up">
        <h2 id="sign-up" className="text-sm font-bold text-sabi-muted uppercase tracking-wider mb-4">
          1. Sign up
        </h2>
        <CodeBlock code={`curl -X POST ${API_BASE}/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{}'

# => {"apiKey": "sabi_sk_...", "userId": "..."}`} />
        <p className="text-sabi-muted text-sm mt-2">
          Save the <code className="text-sabi-text">apiKey</code>. Use it on all
          subsequent requests. Do this once.
        </p>
      </section>

      <section className="mb-12" aria-labelledby="submit-verification">
        <h2 id="submit-verification" className="text-sm font-bold text-sabi-muted uppercase tracking-wider mb-4">
          2. Submit a verification
        </h2>
        <CodeBlock code={`# First call without payment token to get 402 + payment info:
curl -X POST ${API_BASE}/api/verifications \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <apiKey>" \\
  -d '{
    "question": "Is the AWS vending machine Out of Order right now?",
    "targetLat": 37.7851,
    "targetLng": -122.3965
  }'
# => HTTP 402, payment-required header (base64 JSON with planId/agentId)

# Then retry with x402 access token from Nevermined:
curl -X POST ${API_BASE}/api/verifications \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <apiKey>" \\
  -H "payment-signature: <access-token>" \\
  -d '{
    "question": "Is the AWS vending machine Out of Order right now?",
    "targetLat": 37.7851,
    "targetLng": -122.3965
  }'

# => {"job": {"id": "...", "status": "connecting"}}`} />
        <p className="text-sabi-muted text-sm mt-2">
          Payment uses the x402 protocol. The 402 response includes a{" "}
          <code className="text-sabi-text">payment-required</code> header (base64
          JSON with <code className="text-sabi-text">planId</code> and{" "}
          <code className="text-sabi-text">agentId</code>).
        </p>

        <h3 id="access-token" className="text-sm font-semibold text-sabi-text mt-6 mb-2">
          How to get an access token
        </h3>
        <p className="text-sabi-muted text-sm mb-3">
          You need a Nevermined API key. Get one at{" "}
          <a
            href="https://sandbox.nevermined.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sabi-accent hover:text-sabi-accent-hover underline underline-offset-2"
          >
            sandbox.nevermined.app
          </a>{" "}
          (or{" "}
          <a
            href="https://nevermined.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sabi-accent hover:text-sabi-accent-hover underline underline-offset-2"
          >
            nevermined.app
          </a>{" "}
          for production).
        </p>

        <p className="text-sabi-muted text-xs font-medium uppercase tracking-wider mb-2">Using the JS SDK</p>
        <CodeBlock code={`import { Payments } from "@nevermined-io/payments";

const payments = Payments.getInstance({
  nvmApiKey: "<your-nvm-api-key>",
  environment: "sandbox",
});

await payments.plans.orderPlan("<planId>");
const { accessToken } = await payments.x402
  .getX402AccessToken("<planId>", "<agentId>");`} className="mb-4" />

        <p className="text-sabi-muted text-xs font-medium uppercase tracking-wider mb-2">Using curl</p>
        <CodeBlock code={`# 1. Order the plan (once)
curl -s -X POST https://api.sandbox.nevermined.app/api/v1/payments/plans/<planId>/order \\
  -H "Authorization: Bearer <your-nvm-api-key>"

# 2. Get x402 access token
curl -s -X POST https://api.sandbox.nevermined.app/api/v1/x402/permissions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <your-nvm-api-key>" \\
  -d '{"accepted":{"scheme":"nvm:erc4337","network":"eip155:84532","planId":"<planId>","extra":{"agentId":"<agentId>"}}}'
# => {"accessToken": "..."}`} />
        <p className="text-sabi-muted text-sm mt-2">
          Use the returned <code className="text-sabi-text">accessToken</code> as
          the <code className="text-sabi-text">payment-signature</code> header in
          the verification request above.
        </p>
      </section>

      <section className="mb-12" aria-labelledby="get-result">
        <h2 id="get-result" className="text-sm font-bold text-sabi-muted uppercase tracking-wider mb-4">
          3. Get the result
        </h2>
        <CodeBlock code={`curl ${API_BASE}/api/verifications/<id>/artifact \\
  -H "Authorization: Bearer <apiKey>"

# => {"answer": "Yes, it's open", "frames": [...]}`} />
        <p className="text-sabi-muted text-sm mt-2">
          Poll{" "}
          <code className="text-sabi-text">GET /api/verifications/&lt;id&gt;</code>{" "}
          until <code className="text-sabi-text">status</code> is{" "}
          <code className="text-sabi-text">&quot;verified&quot;</code>, then
          fetch the artifact.
        </p>
      </section>

      <section className="mb-12" aria-labelledby="what-comes-back">
        <h2 id="what-comes-back" className="text-sm font-bold text-sabi-muted uppercase tracking-wider mb-4">
          What comes back
        </h2>
        <div className="text-sabi-muted text-sm space-y-1">
          <p>
            <span className="text-sabi-text">answer</span> &mdash; the
            verifier&apos;s spoken response, transcribed
          </p>
          <p>
            <span className="text-sabi-text">frames</span> &mdash; timestamped
            photos captured every 5s during the session
          </p>
        </div>
      </section>

      <section className="mb-12" aria-labelledby="for-agents">
        <h2 id="for-agents" className="text-sm font-bold text-sabi-muted uppercase tracking-wider mb-4">
          For AI agents
        </h2>
        <p className="text-sabi-muted text-sm leading-relaxed">
          Point your agent at{" "}
          <a
            href="/skill"
            className="text-sabi-accent hover:text-sabi-accent-hover underline underline-offset-2"
          >
            SKILL.md
          </a>{" "}
          &mdash; a self-contained instruction file. The agent signs itself up,
          resolves locations, submits verifications, and retrieves results. No
          human setup required.
        </p>
      </section>

      <section aria-labelledby="api-reference">
        <h2 id="api-reference" className="text-sm font-bold text-sabi-muted uppercase tracking-wider mb-4">
          API reference
        </h2>
        <div className="text-sm border border-sabi-border rounded overflow-hidden" role="region" aria-label="API endpoints">
          <table className="w-full">
            <thead>
              <tr className="border-b border-sabi-border text-left text-sabi-muted">
                <th scope="col" className="px-4 py-2 font-medium">Method</th>
                <th scope="col" className="px-4 py-2 font-medium">Path</th>
                <th scope="col" className="px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="text-sabi-muted">
              <tr className="border-b border-sabi-border/50">
                <td className="px-4 py-2 text-sabi-text font-mono">POST</td>
                <td className="px-4 py-2 font-mono">/api/auth/signup</td>
                <td className="px-4 py-2">Create account</td>
              </tr>
              <tr className="border-b border-sabi-border/50">
                <td className="px-4 py-2 text-sabi-text font-mono">POST</td>
                <td className="px-4 py-2 font-mono">/api/verifications</td>
                <td className="px-4 py-2">Submit verification (requires payment-signature header)</td>
              </tr>
              <tr className="border-b border-sabi-border/50">
                <td className="px-4 py-2 text-sabi-text font-mono">GET</td>
                <td className="px-4 py-2 font-mono">/api/verifications</td>
                <td className="px-4 py-2">List jobs</td>
              </tr>
              <tr className="border-b border-sabi-border/50">
                <td className="px-4 py-2 text-sabi-text font-mono">GET</td>
                <td className="px-4 py-2 font-mono">/api/verifications/:id</td>
                <td className="px-4 py-2">Job status</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-sabi-text font-mono">GET</td>
                <td className="px-4 py-2 font-mono">/api/verifications/:id/artifact</td>
                <td className="px-4 py-2">Result (answer + photos)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
