"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createVerification, listMyVerifications, getConfig, PaymentRequiredError } from "@/lib/api";
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

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  connecting: { label: "Waiting", color: "bg-amber-500" },
  accepted: { label: "Accepted", color: "bg-indigo-500" },
  in_progress: { label: "In Progress", color: "bg-blue-500" },
  verified: { label: "Verified", color: "bg-emerald-500" },
  cancelled: { label: "Cancelled", color: "bg-zinc-500" },
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
  }, [loadMyJobs]);

  // Load stored API key and backend config
  useEffect(() => {
    setNvmApiKey(getStoredApiKey());
    getConfig().then(setNvmConfig).catch(console.error);
  }, []);

  // Live validation as user types
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
        setError("Insufficient credits. Please purchase credits on Nevermined first.");
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }

  const isValid = question.trim().length > 0 && validateQuestion(question.trim()).valid;

  return (
    <main className="flex min-h-screen flex-col items-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Sabi</h1>
          <p className="text-zinc-400 text-lg">
            Get verified, photo-evidenced answers to real-world questions.
          </p>
        </div>

        {/* Nevermined connection status */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
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
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
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

        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-4 py-3 text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
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
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading
              ? "Processing payment..."
              : !nvmApiKey
                ? "Connect & Request Verification"
                : "Request Verification — 1 Credit"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500">
          A nearby verifier with Ray-Ban Metas will go check and send you photo evidence + a vocal answer.
        </p>

        {/* My Verifications */}
        <div className="space-y-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Verifications</h2>
            <button
              onClick={loadMyJobs}
              className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Refresh
            </button>
          </div>

          {loadingJobs ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm">Loading...</p>
            </div>
          ) : myJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-zinc-500 text-sm">No verifications yet. Submit a question above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {myJobs.map((job) => {
                const style = STATUS_STYLES[job.status] ?? { label: job.status, color: "bg-zinc-600" };
                return (
                  <Link
                    key={job.id}
                    href={`/verify/${job.id}`}
                    className="block rounded-lg border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm text-zinc-200 line-clamp-2 flex-1">{job.question}</p>
                      <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium text-white ${style.color}`}>
                        {style.label}
                      </span>
                    </div>
                    {job.createdAt && (
                      <p className="text-xs text-zinc-600 mt-2">
                        {new Date(job.createdAt).toLocaleString()}
                      </p>
                    )}
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
