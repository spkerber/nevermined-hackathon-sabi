"use client";

import { Suspense, useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  connecting: { label: "Waiting", color: "bg-sabi-warning text-sabi-bg" },
  accepted: { label: "Accepted", color: "bg-sabi-accent text-sabi-bg" },
  in_progress: { label: "In Progress", color: "bg-sabi-inprogress text-sabi-bg" },
  verified: { label: "Verified", color: "bg-sabi-success text-sabi-bg" },
  cancelled: { label: "Cancelled", color: "bg-sabi-muted text-sabi-bg" },
};

function HomeContent() {
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
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);

  const paymentModalRef = useRef<HTMLDivElement>(null);

  // Demo mode: ?demo=1 or ?question=... pre-fills; demo uses AWS Builder Loft coords
  const searchParams = useSearchParams();
  const isDemoMode = !!searchParams.get("demo");
  const demoQuestion = searchParams.get("question") ?? (isDemoMode ? "Is the AWS vending machine Out of Order right now?" : null);
  const DEMO_LAT = 37.7851;
  const DEMO_LNG = -122.3965;

  // Pre-fill demo question from URL
  useEffect(() => {
    if (demoQuestion && !question) setQuestion(demoQuestion);
  }, [demoQuestion, question]);

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

  // Payment modal: focus trap and Escape to close
  useEffect(() => {
    if (!showPaymentModal || !paymentModalRef.current) return;
    const el = paymentModalRef.current;
    const focusable = el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setShowPaymentModal(false);
        setError("");
        return;
      }
      if (e.key !== "Tab") return;
      const target = e.target as HTMLElement;
      if (e.shiftKey) {
        if (target === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (target === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showPaymentModal]);

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
        targetLat: isDemoMode ? DEMO_LAT : 37.7749,
        targetLng: isDemoMode ? DEMO_LNG : -122.4194,
      });
      router.push(`/verify/${result.job.id}`);
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setPendingQuestion(trimmed);
        setPendingCoords({ lat: isDemoMode ? DEMO_LAT : 37.7749, lng: isDemoMode ? DEMO_LNG : -122.4194 });
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
      const coords = pendingCoords ?? { lat: 37.7749, lng: -122.4194 };
      const result = await createVerification({
        question: pendingQuestion,
        targetLat: coords.lat,
        targetLng: coords.lng,
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
      <main className="flex min-h-screen items-center justify-center" role="main" aria-busy="true" aria-live="polite">
        <p className="text-sabi-muted">Loading...</p>
      </main>
    );
  }

  const isValid = question.trim().length > 0 && validateQuestion(question.trim()).valid;

  // Extract plan info from payment-required header
  const accepts = paymentInfo ? (paymentInfo as { accepts?: { planId?: string; extra?: { agentId?: string } }[] }).accepts : null;
  const planId = accepts?.[0]?.planId;
  const agentId = accepts?.[0]?.extra?.agentId;

  return (
    <main className="flex min-h-screen flex-col items-center p-6" role="main" aria-label="Request verification">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-sabi-text">Sabi</h1>
          <p className="text-sabi-muted text-lg">
            Get verified, photo-evidenced answers to real-world questions.
          </p>
        </div>

        {/* Account bar */}
        <div className="flex items-center justify-between rounded border border-sabi-border bg-sabi-surface px-4 py-3">
          <span className="text-sm text-sabi-muted truncate">{auth?.email}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="text-xs text-sabi-muted hover:text-sabi-error transition-colors ml-3 shrink-0"
            aria-label="Sign out"
          >
            Sign out
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" aria-label="Submit verification question">
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-sabi-text mb-2">
              What do you need verified?
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='e.g. "Is the coffee shop on 5th Ave currently open?"'
              rows={3}
              aria-describedby={validationHint ? "question-hint" : undefined}
              className="w-full rounded border border-sabi-border bg-sabi-surface px-4 py-3 text-sabi-text placeholder:text-sabi-muted focus:outline-none focus:ring-2 focus:ring-sabi-focus focus:border-transparent resize-none"
            />
            {validationHint && (
              <div id="question-hint" className="mt-2 space-y-1" role="alert">
                <p className="text-sabi-warning text-sm">{validationHint}</p>
                {suggestion && (
                  <button
                    type="button"
                    onClick={() => setQuestion(suggestion)}
                    className="text-sabi-accent text-sm hover:text-sabi-accent-hover transition-colors"
                  >
                    Did you mean: &ldquo;{suggestion}&rdquo;
                  </button>
                )}
              </div>
            )}
          </div>

          {error && !showPaymentModal && (
            <p className="text-sabi-error text-sm" role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !isValid}
            aria-busy={loading}
            className="w-full rounded bg-sabi-accent px-4 py-3 font-medium text-sabi-bg hover:bg-sabi-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Processing..." : "Request Verification \u2014 1 Credit"}
          </button>
        </form>

        <p className="text-center text-xs text-sabi-muted">
          A nearby verifier with Ray-Ban Metas will go check and send you photo evidence + a vocal answer.
        </p>

        {/* Payment Modal */}
        {showPaymentModal && (
          <div ref={paymentModalRef} className="rounded border border-sabi-border bg-sabi-surface p-5 space-y-4" role="dialog" aria-modal="true" aria-labelledby="payment-heading" aria-describedby="payment-desc">
            <div className="space-y-2">
              <h3 id="payment-heading" className="text-sm font-semibold text-sabi-text">Payment Required</h3>
              <p id="payment-desc" className="text-sm text-sabi-muted">
                This verification costs 1 credit. To get an access token:
              </p>
              <ol className="text-sm text-sabi-muted list-decimal list-inside space-y-1">
                <li>
                  Sign in to{" "}
                  {nvmConfig ? (
                    <a
                      href={getNvmAppUrl(nvmConfig.nvmEnvironment)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sabi-accent hover:text-sabi-accent-hover underline"
                    >
                      Nevermined
                    </a>
                  ) : (
                    <span className="text-sabi-text">Nevermined</span>
                  )}{" "}
                  and get your NVM API key
                </li>
                <li>Order the plan using the Plan ID below</li>
                <li>Request an x402 access token (via SDK or REST API)</li>
                <li>Paste the token below</li>
              </ol>
              <p className="text-xs text-sabi-muted">
                See the{" "}
                <a href="/docs" target="_blank" rel="noopener noreferrer" className="text-sabi-accent hover:text-sabi-accent-hover underline">
                  docs
                </a>{" "}
                for detailed instructions.
              </p>
            </div>

            {(planId || agentId) && (
              <div className="text-xs text-sabi-muted space-y-2 bg-sabi-bg rounded p-3 border border-sabi-border">
                {planId && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0">Plan ID: <span className="text-sabi-text font-mono">{planId.slice(0, 16)}...{planId.slice(-8)}</span></p>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(planId); }}
                      className="shrink-0 text-sabi-accent hover:text-sabi-accent-hover transition-colors"
                      aria-label="Copy plan ID"
                    >
                      Copy
                    </button>
                  </div>
                )}
                {agentId && (
                  <div className="flex items-center justify-between gap-2">
                    <p className="min-w-0">Service Agent ID: <span className="text-sabi-text font-mono">{agentId.slice(0, 16)}...{agentId.slice(-8)}</span></p>
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard.writeText(agentId); }}
                      className="shrink-0 text-sabi-accent hover:text-sabi-accent-hover transition-colors"
                      aria-label="Copy agent ID"
                    >
                      Copy
                    </button>
                  </div>
                )}
              </div>
            )}

            <input
              type="text"
              value={accessTokenInput}
              onChange={(e) => setAccessTokenInput(e.target.value)}
              placeholder="Paste access token here..."
              aria-label="Access token"
              className="w-full rounded border border-sabi-border bg-sabi-bg px-3 py-2 text-sm text-sabi-text placeholder:text-sabi-muted focus:outline-none focus:ring-2 focus:ring-sabi-focus"
              onKeyDown={(e) => e.key === "Enter" && handlePayAndSubmit()}
            />

            {error && (
              <p className="text-sabi-error text-sm" role="alert">{error}</p>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowPaymentModal(false); setError(""); }}
                className="flex-1 rounded border border-sabi-border px-4 py-2 text-sm text-sabi-muted hover:text-sabi-text transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePayAndSubmit}
                disabled={!accessTokenInput.trim() || submittingPayment}
                aria-busy={submittingPayment}
                className="flex-1 rounded bg-sabi-accent px-4 py-2 text-sm font-medium text-sabi-bg hover:bg-sabi-accent-hover disabled:opacity-50 transition-colors"
              >
                {submittingPayment ? "Submitting..." : "Pay & Submit"}
              </button>
            </div>
          </div>
        )}

        {/* My Verifications */}
        <section className="space-y-4 pt-4 border-t border-sabi-border" aria-labelledby="my-verifications-heading">
          <div className="flex items-center justify-between">
            <h2 id="my-verifications-heading" className="text-lg font-semibold text-sabi-text">My Verifications</h2>
            <button
              type="button"
              onClick={loadMyJobs}
              className="text-xs text-sabi-muted hover:text-sabi-text transition-colors"
              aria-label="Refresh list"
            >
              Refresh
            </button>
          </div>

          {loadingJobs ? (
            <div className="text-center py-8" aria-busy="true">
              <p className="text-sabi-muted text-sm">Loading...</p>
            </div>
          ) : myJobs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sabi-muted text-sm">No verifications yet. Submit a question above to get started.</p>
            </div>
          ) : (
            <ul className="space-y-2" aria-label="Verification jobs">
              {myJobs.map((job) => {
                const style = STATUS_STYLES[job.status] ?? { label: job.status, color: "bg-sabi-muted text-sabi-bg" };
                return (
                  <li key={job.id}>
                    <Link
                      href={`/verify/${job.id}`}
                      className="block rounded border border-sabi-border bg-sabi-surface p-4 hover:border-sabi-muted transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm text-sabi-text line-clamp-2 flex-1">{job.question}</p>
                        <span className={`shrink-0 px-2 py-0.5 rounded text-xs font-medium ${style.color}`}>
                          {style.label}
                        </span>
                      </div>
                      {job.createdAt && (
                        <p className="text-xs text-sabi-muted mt-2">
                          {new Date(job.createdAt).toLocaleString()}
                        </p>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center p-6" role="main" aria-busy="true">
        <p className="text-sabi-muted">Loading...</p>
      </main>
    }>
      <HomeContent />
    </Suspense>
  );
}
