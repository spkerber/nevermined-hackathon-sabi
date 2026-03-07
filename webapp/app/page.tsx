"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createVerification, listMyVerifications, getConfig, PaymentRequiredError, seedDemoJobs } from "@/lib/api";
import { validateQuestion } from "@/lib/validate-question";
import { getStoredApiKey, storeApiKey, clearApiKey, getX402AccessToken, getNvmAppUrl } from "@/lib/nevermined";

interface MyJob {
  id: string;
  question: string;
  category: string;
  status: string;
  payout: number;
  createdAt?: number;
}

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  connecting: { label: "Finding Verifier", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-800/30", icon: "🔍" },
  accepted: { label: "Verifier En Route", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-800/30", icon: "🚶" },
  in_progress: { label: "Capturing Evidence", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-800/30", icon: "📷" },
  verified: { label: "Verified", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-800/30", icon: "✅" },
  cancelled: { label: "Cancelled", color: "text-zinc-500", bg: "bg-zinc-500/10 border-zinc-800/30", icon: "✕" },
};

function getRequesterId(): string {
  if (typeof window === "undefined") return "anonymous";
  let id = localStorage.getItem("sabi_requester_id");
  if (!id) {
    id = `req_${crypto.randomUUID().slice(0, 8)}`;
    localStorage.setItem("sabi_requester_id", id);
  }
  return id;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function Home() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationHint, setValidationHint] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [nvmApiKey, setNvmApiKey] = useState<string | null>(null);
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [nvmConfig, setNvmConfig] = useState<{ nvmEnvironment: string; nvmPlanId: string; nvmAgentId: string } | null>(null);
  const [seeding, setSeeding] = useState(false);

  const requesterId = typeof window !== "undefined" ? getRequesterId() : "anonymous";

  const loadMyJobs = useCallback(async () => {
    try {
      const result = await listMyVerifications(requesterId);
      setMyJobs(result.jobs);
    } catch {
      // silently fail
    }
    setLoadingJobs(false);
  }, [requesterId]);

  useEffect(() => {
    loadMyJobs();
    const interval = setInterval(loadMyJobs, 5000);
    return () => clearInterval(interval);
  }, [loadMyJobs]);

  useEffect(() => {
    setNvmApiKey(getStoredApiKey());
    getConfig().then(setNvmConfig).catch(console.error);
  }, []);

  useEffect(() => {
    if (!question.trim()) {
      setValidationHint("");
      setSuggestion("");
      return;
    }
    const result = validateQuestion(question);
    if (!result.valid) {
      setValidationHint(result.error ?? "");
      setSuggestion(result.suggestion ?? "");
    } else {
      setValidationHint("");
      setSuggestion("");
    }
  }, [question]);

  function handleSaveApiKey() {
    const key = apiKeyInput.trim();
    if (!key) return;
    storeApiKey(key);
    setNvmApiKey(key);
    setShowApiKeyInput(false);
    setApiKeyInput("");
  }

  function handleDisconnect() {
    clearApiKey();
    setNvmApiKey(null);
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedDemoJobs();
      await loadMyJobs();
    } catch {
      // ignore
    }
    setSeeding(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    const validation = validateQuestion(trimmed);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid question");
      return;
    }

    if (!nvmApiKey) {
      setShowApiKeyInput(true);
      return;
    }

    if (!nvmConfig) {
      setError("Loading payment config... Please try again.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const token = await getX402AccessToken(
        nvmApiKey,
        nvmConfig.nvmEnvironment,
        nvmConfig.nvmPlanId,
        nvmConfig.nvmAgentId,
      );
      const result = await createVerification(
        {
          question: trimmed,
          targetLat: 37.7749,
          targetLng: -122.4194,
          requesterId,
        },
        token,
      );
      router.push(`/verify/${result.job.id}`);
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setError("Insufficient credits. Purchase credits on Nevermined to submit verification requests.");
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }

  const isValid = question.trim().length > 0 && validateQuestion(question.trim()).valid;
  const activeJobs = myJobs.filter((j) => j.status !== "cancelled");
  const verifiedCount = myJobs.filter((j) => j.status === "verified").length;
  const pendingCount = myJobs.filter((j) => j.status !== "verified" && j.status !== "cancelled").length;

  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center p-6">
      <div className="w-full max-w-lg space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3 pt-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Get real-world answers,<br />verified with photos.
          </h1>
          <p className="text-zinc-500 text-sm max-w-sm mx-auto">
            Ask a question about a physical place. A verifier with smart glasses will go check, capture evidence, and send you the answer.
          </p>
        </div>

        {/* Nevermined connection */}
        <div className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`h-2 w-2 rounded-full ${nvmApiKey ? "bg-emerald-500" : "bg-zinc-600"}`} />
            <span className="text-sm text-zinc-400">
              {nvmApiKey ? "Nevermined connected" : "Not connected"}
            </span>
          </div>
          {nvmApiKey ? (
            <button
              onClick={handleDisconnect}
              className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setShowApiKeyInput(true)}
              className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Connect
            </button>
          )}
        </div>

        {/* API Key input */}
        {showApiKeyInput && !nvmApiKey && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            <p className="text-sm text-zinc-300">
              Enter your Nevermined API key to pay for verifications.
              {nvmConfig && (
                <>
                  {" "}
                  <a
                    href={getNvmAppUrl(nvmConfig.nvmEnvironment)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Get one here
                  </a>
                </>
              )}
            </p>
            <div className="flex gap-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="sandbox:eyJ..."
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                onKeyDown={(e) => e.key === "Enter" && handleSaveApiKey()}
              />
              <button
                onClick={handleSaveApiKey}
                disabled={!apiKeyInput.trim()}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        )}

        {/* Question form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-zinc-300 mb-2">
              What do you need verified?
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='e.g. "Is the coffee shop on 5th Ave currently open?"'
              rows={3}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            {validationHint && (
              <div className="mt-2 space-y-1">
                <p className="text-amber-400 text-sm">{validationHint}</p>
                {suggestion && (
                  <button
                    type="button"
                    onClick={() => setQuestion(suggestion)}
                    className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors"
                  >
                    Did you mean: &ldquo;{suggestion}&rdquo;
                  </button>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-red-800/50 bg-red-950/20 px-3 py-2">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full rounded-xl bg-indigo-600 px-4 py-3.5 font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "Processing payment..."
              : !nvmApiKey
                ? "Connect & Request Verification"
                : "Request Verification — 1 Credit"}
          </button>
        </form>

        {/* My Verifications */}
        <div className="space-y-4 pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">My Verifications</h2>
              {activeJobs.length > 0 && (
                <div className="flex gap-2">
                  {pendingCount > 0 && (
                    <span className="rounded-full bg-amber-500/10 border border-amber-800/30 px-2 py-0.5 text-xs text-amber-400">
                      {pendingCount} pending
                    </span>
                  )}
                  {verifiedCount > 0 && (
                    <span className="rounded-full bg-emerald-500/10 border border-emerald-800/30 px-2 py-0.5 text-xs text-emerald-400">
                      {verifiedCount} done
                    </span>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={loadMyJobs}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Refresh
            </button>
          </div>

          {loadingJobs ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 animate-pulse">
                  <div className="h-4 bg-zinc-800 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-zinc-800 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : myJobs.length === 0 ? (
            <div className="text-center py-10 space-y-4">
              <div className="text-4xl">🔭</div>
              <p className="text-zinc-500 text-sm">No verifications yet.</p>
              <p className="text-zinc-600 text-xs">Submit a question above, or switch to <Link href="/jobs" className="text-indigo-400 hover:text-indigo-300">Verifier mode</Link> to answer requests.</p>

              <button
                onClick={handleSeed}
                disabled={seeding}
                className="mt-2 rounded-lg border border-dashed border-zinc-700 px-4 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 disabled:opacity-50 transition-colors"
              >
                {seeding ? "Creating..." : "Load demo jobs for testing"}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myJobs.map((job) => {
                const style = STATUS_STYLES[job.status] ?? { label: job.status, color: "text-zinc-500", bg: "bg-zinc-500/10 border-zinc-800/30", icon: "•" };
                return (
                  <Link
                    key={job.id}
                    href={`/verify/${job.id}`}
                    className="group block rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-zinc-200 group-hover:text-white transition-colors line-clamp-2">
                          {job.question}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${style.color} ${style.bg}`}>
                            <span>{style.icon}</span> {style.label}
                          </span>
                          {job.createdAt && (
                            <span className="text-xs text-zinc-600">{timeAgo(job.createdAt)}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-zinc-700 group-hover:text-zinc-500 transition-colors text-sm">&rarr;</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
