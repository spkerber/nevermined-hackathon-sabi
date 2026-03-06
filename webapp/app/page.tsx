"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createVerification, listMyVerifications, getMe, getConfig, PaymentRequiredError } from "@/lib/api";
import { validateQuestion } from "@/lib/validate-question";
import { getNvmAppUrl } from "@/lib/nevermined";
import { getAuth, clearAuth, type AuthState } from "@/lib/auth";

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

export default function Home() {
  const router = useRouter();
  const [auth, setAuthState] = useState<AuthState | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationHint, setValidationHint] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [nvmConfig, setNvmConfig] = useState<{ nvmEnvironment: string } | null>(null);

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [accessTokenInput, setAccessTokenInput] = useState("");
  const [paymentInfo, setPaymentInfo] = useState<Record<string, unknown> | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Check auth on mount
  useEffect(() => {
    const current = getAuth();
    if (!current) {
      router.replace("/login");
      return;
    }
    setAuthState(current);

    getMe().then(() => {
      setAuthChecked(true);
    }).catch(() => setAuthChecked(true));

    getConfig().then(setNvmConfig).catch(console.error);
  }, [router]);

  const loadMyJobs = useCallback(async () => {
    if (!auth) return;
    try {
      const result = await listMyVerifications(auth.userId);
      setMyJobs(result.jobs);
    } catch {
      // silently fail
    }
    setLoadingJobs(false);
  }, [auth]);

  useEffect(() => {
    if (authChecked) loadMyJobs();
  }, [authChecked, loadMyJobs]);

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

  function handleSignOut() {
    clearAuth();
    router.replace("/login");
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

    setLoading(true);
    setError("");

    try {
      const result = await createVerification({
        question: trimmed,
        targetLat: 37.7749,
        targetLng: -122.4194,
      });
      router.push(`/verify/${result.job.id}`);
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setPendingQuestion(trimmed);
        setPaymentInfo(err.paymentInfo ?? null);
        setShowPaymentModal(true);
      } else {
        setError((err as Error).message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePayAndSubmit() {
    const token = accessTokenInput.trim();
    if (!token) return;

    setSubmittingPayment(true);
    setError("");

    try {
      const result = await createVerification({
        question: pendingQuestion,
        targetLat: 37.7749,
        targetLng: -122.4194,
        accessToken: token,
      });
      setShowPaymentModal(false);
      setAccessTokenInput("");
      router.push(`/verify/${result.job.id}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmittingPayment(false);
    }
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-500">Loading...</p>
      </main>
    );
  }

  const isValid = question.trim().length > 0 && validateQuestion(question.trim()).valid;

  // Extract plan info from payment-required header
  const accepts = paymentInfo ? (paymentInfo as { accepts?: { planId?: string; extra?: { agentId?: string } }[] }).accepts : null;
  const planId = accepts?.[0]?.planId;
  const agentId = accepts?.[0]?.extra?.agentId;

  return (
    <main className="flex min-h-screen flex-col items-center p-6">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight">Sabi</h1>
          <p className="text-zinc-400 text-lg">
            Get verified, photo-evidenced answers to real-world questions.
          </p>
        </div>

        {/* Account bar */}
        <div className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
          <span className="text-sm text-zinc-400 truncate">{auth?.email}</span>
          <button
            onClick={handleSignOut}
            className="text-xs text-zinc-500 hover:text-red-400 transition-colors ml-3 shrink-0"
          >
            Sign out
          </button>
        </div>

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

          {error && !showPaymentModal && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isValid}
            className="w-full rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Processing..." : "Request Verification \u2014 1 Credit"}
          </button>
        </form>

        <p className="text-center text-xs text-zinc-500">
          A nearby verifier with Ray-Ban Metas will go check and send you photo evidence + a vocal answer.
        </p>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 space-y-4">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-zinc-200">Payment Required</h3>
              <p className="text-sm text-zinc-400">
                This verification costs 1 credit. To get an access token:
              </p>
              <ol className="text-sm text-zinc-400 list-decimal list-inside space-y-1">
                <li>
                  Sign in to{" "}
                  {nvmConfig ? (
                    <a
                      href={getNvmAppUrl(nvmConfig.nvmEnvironment)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 underline"
                    >
                      Nevermined
                    </a>
                  ) : (
                    <span className="text-zinc-300">Nevermined</span>
                  )}{" "}
                  and get your NVM API key
                </li>
                <li>Order the plan using the Plan ID below</li>
                <li>Request an x402 access token (via SDK or REST API)</li>
                <li>Paste the token below</li>
              </ol>
              <p className="text-xs text-zinc-500">
                See the{" "}
                <a href="/docs" target="_blank" className="text-indigo-400 hover:text-indigo-300 underline">
                  docs
                </a>{" "}
                for detailed instructions.
              </p>
            </div>

            {(planId || agentId) && (
              <div className="text-xs text-zinc-500 space-y-1 bg-zinc-800/50 rounded p-3">
                {planId && <p>Plan ID: <span className="text-zinc-300 font-mono">{planId}</span></p>}
                {agentId && <p>Agent ID: <span className="text-zinc-300 font-mono">{agentId}</span></p>}
              </div>
            )}

            <input
              type="text"
              value={accessTokenInput}
              onChange={(e) => setAccessTokenInput(e.target.value)}
              placeholder="Paste access token here..."
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={(e) => e.key === "Enter" && handlePayAndSubmit()}
            />

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => { setShowPaymentModal(false); setError(""); }}
                className="flex-1 rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePayAndSubmit}
                disabled={!accessTokenInput.trim() || submittingPayment}
                className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
              >
                {submittingPayment ? "Submitting..." : "Pay & Submit"}
              </button>
            </div>
          </div>
        )}

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
