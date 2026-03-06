export const metadata = {
  title: "Sabi - Getting Started",
};

export default function DocsPage() {
  return (
    <main className="max-w-2xl mx-auto px-6 py-16 font-[family-name:var(--font-geist-mono)]">
      <h1 className="text-2xl font-bold mb-2">Sabi</h1>
      <p className="text-zinc-400 mb-12">
        Give your agent eyes on the physical world.
      </p>

      <p className="text-zinc-300 mb-10 leading-relaxed">
        Sabi dispatches a human verifier to any location. They capture photos
        with smart glasses and answer your agent&apos;s question. Three API calls.
        No SDK.
      </p>

      <section className="mb-12">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
          1. Sign up
        </h2>
        <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm overflow-x-auto">
          <code>{`curl -X POST https://sabi-backend.ben-imadali.workers.dev/api/auth/signup \\
  -H "Content-Type: application/json" \\
  -d '{"nvmAgentId": "my-agent"}'

# => {"apiKey": "sabi_sk_...", "userId": "..."}`}</code>
        </pre>
        <p className="text-zinc-500 text-sm mt-2">
          Save the <code className="text-zinc-300">apiKey</code>. Use it on all
          subsequent requests. Do this once.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
          2. Submit a verification
        </h2>
        <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm overflow-x-auto">
          <code>{`curl -X POST https://sabi-backend.ben-imadali.workers.dev/api/verifications \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <apiKey>" \\
  -d '{
    "question": "Is Blue Bottle on Market St open?",
    "targetLat": 37.7830,
    "targetLng": -122.4075
  }'

# => {"job": {"id": "...", "status": "connecting"}}`}</code>
        </pre>
        <p className="text-zinc-500 text-sm mt-2">
          A verifier is dispatched immediately.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
          3. Get the result
        </h2>
        <pre className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-sm overflow-x-auto">
          <code>{`curl https://sabi-backend.ben-imadali.workers.dev/api/verifications/<id>/artifact \\
  -H "Authorization: Bearer <apiKey>"

# => {"answer": "Yes, it's open", "frames": [...]}`}</code>
        </pre>
        <p className="text-zinc-500 text-sm mt-2">
          Poll{" "}
          <code className="text-zinc-300">GET /api/verifications/&lt;id&gt;</code>{" "}
          until <code className="text-zinc-300">status</code> is{" "}
          <code className="text-zinc-300">&quot;verified&quot;</code>, then
          fetch the artifact.
        </p>
      </section>

      <section className="mb-12">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
          What comes back
        </h2>
        <div className="text-zinc-400 text-sm space-y-1">
          <p>
            <span className="text-zinc-300">answer</span> &mdash; the
            verifier&apos;s spoken response, transcribed
          </p>
          <p>
            <span className="text-zinc-300">frames</span> &mdash; timestamped
            photos captured every 5s during the session
          </p>
        </div>
      </section>

      <section className="mb-12">
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
          For AI agents
        </h2>
        <p className="text-zinc-400 text-sm leading-relaxed">
          Point your agent at{" "}
          <a
            href="https://raw.githubusercontent.com/spkerber/nevermined-hackathon-sabi/main/sdk/skill/SKILL.md"
            className="text-zinc-200 underline underline-offset-2"
          >
            SKILL.md
          </a>{" "}
          &mdash; a self-contained instruction file. The agent signs itself up,
          resolves locations, submits verifications, and retrieves results. No
          human setup required.
        </p>
      </section>

      <section>
        <h2 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-4">
          API reference
        </h2>
        <div className="text-sm border border-zinc-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800 text-left text-zinc-500">
                <th className="px-4 py-2 font-medium">Method</th>
                <th className="px-4 py-2 font-medium">Path</th>
                <th className="px-4 py-2 font-medium">Description</th>
              </tr>
            </thead>
            <tbody className="text-zinc-400">
              <tr className="border-b border-zinc-800/50">
                <td className="px-4 py-2 text-zinc-300">POST</td>
                <td className="px-4 py-2">/api/auth/signup</td>
                <td className="px-4 py-2">Create account</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="px-4 py-2 text-zinc-300">POST</td>
                <td className="px-4 py-2">/api/verifications</td>
                <td className="px-4 py-2">Submit verification</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="px-4 py-2 text-zinc-300">GET</td>
                <td className="px-4 py-2">/api/verifications</td>
                <td className="px-4 py-2">List jobs</td>
              </tr>
              <tr className="border-b border-zinc-800/50">
                <td className="px-4 py-2 text-zinc-300">GET</td>
                <td className="px-4 py-2">/api/verifications/:id</td>
                <td className="px-4 py-2">Job status</td>
              </tr>
              <tr>
                <td className="px-4 py-2 text-zinc-300">GET</td>
                <td className="px-4 py-2">/api/verifications/:id/artifact</td>
                <td className="px-4 py-2">Result (answer + photos)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
