"use client";

import { useState } from "react";
import Link from "next/link";
function validateQuestion(question: string): { valid: boolean; error?: string; suggestion?: string } {
  const trimmed = question.trim();
  if (trimmed.length < 10) return { valid: false, error: "Question is too short. Please describe what you need verified." };
  if (trimmed.length > 500) return { valid: false, error: "Question is too long. Keep it under 500 characters." };
  const isQuestion = /\?$/.test(trimmed);
  const isRequest = /^(check|verify|confirm|is|are|does|do|how|what|where|when|can|could|will|would|has|have)/i.test(trimmed);
  if (!isQuestion && !isRequest) return { valid: false, error: "Try phrasing it as a question (ending with ?).", suggestion: `${trimmed}?` };
  return { valid: true };
}

const STATUS_STYLES: Record<string, { label: string; color: string }> = {
  connecting: { label: "Waiting", color: "bg-sabi-warning text-sabi-bg" },
  accepted: { label: "Accepted", color: "bg-sabi-accent text-sabi-bg" },
  in_progress: { label: "In Progress", color: "bg-sabi-inprogress text-sabi-bg" },
  verified: { label: "Verified", color: "bg-sabi-success text-sabi-bg" },
  cancelled: { label: "Cancelled", color: "bg-sabi-muted text-sabi-bg" },
};

const MOCK_JOBS = [
  {
    id: "demo-1",
    question: "Is the AWS vending machine Out of Order right now?",
    category: "venue",
    status: "verified",
    payout: 1,
    createdAt: Date.now() - 3600000,
  },
  {
    id: "demo-2",
    question: "Is the coffee shop on 5th Ave currently open?",
    category: "venue",
    status: "in_progress",
    payout: 1,
    createdAt: Date.now() - 1800000,
  },
  {
    id: "demo-3",
    question: "How many Fantas are in the vending machine?",
    category: "venue",
    status: "connecting",
    payout: 1,
    createdAt: Date.now() - 60000,
  },
];

export default function DemoPage() {
  const [question, setQuestion] = useState("");
  const [validationHint, setValidationHint] = useState("");
  const [suggestion, setSuggestion] = useState("");
  const [myJobs] = useState(MOCK_JOBS);

  // Live validation as user types
  const handleQuestionChange = (value: string) => {
    setQuestion(value);
    if (!value.trim()) {
      setValidationHint("");
      setSuggestion("");
      return;
    }
    const result = validateQuestion(value);
    if (!result.valid) {
      setValidationHint(result.error ?? "");
      setSuggestion(result.suggestion ?? "");
    } else {
      setValidationHint("");
      setSuggestion("");
    }
  };

  const isValid = question.trim().length > 0 && validateQuestion(question.trim()).valid;

  return (
    <main className="flex min-h-screen flex-col items-center p-6" role="main" aria-label="Demo — request verification">
      <div className="w-full max-w-lg space-y-8">
        <div className="flex items-center justify-between w-full">
          <Link href="/login" className="text-sabi-muted hover:text-sabi-text text-sm transition-colors">
            &larr; Back to login
          </Link>
          <span className="text-xs text-sabi-warning bg-sabi-warning/20 px-2 py-1 rounded" aria-label="Demo mode">Demo mode</span>
        </div>

        <div className="text-center space-y-3">
          <h1 className="text-4xl font-bold tracking-tight text-sabi-text">Sabi</h1>
          <p className="text-sabi-muted text-lg">
            Get verified, photo-evidenced answers to real-world questions.
          </p>
        </div>

        {/* Account bar (mock) */}
        <div className="flex items-center justify-between rounded border border-sabi-border bg-sabi-surface px-4 py-3">
          <span className="text-sm text-sabi-muted truncate">demo@buyer.example.com</span>
          <span className="text-xs text-sabi-muted">Signed in</span>
        </div>

        <form
          onSubmit={(e) => e.preventDefault()}
          className="space-y-4"
          aria-label="Submit verification question (demo)"
        >
          <div>
            <label htmlFor="question" className="block text-sm font-medium text-sabi-text mb-2">
              What do you need verified?
            </label>
            <textarea
              id="question"
              value={question}
              onChange={(e) => handleQuestionChange(e.target.value)}
              placeholder='e.g. "Is the coffee shop on 5th Ave currently open?"'
              rows={3}
              aria-describedby={validationHint ? "demo-question-hint" : undefined}
              className="w-full rounded border border-sabi-border bg-sabi-surface px-4 py-3 text-sabi-text placeholder:text-sabi-muted focus:outline-none focus:ring-2 focus:ring-sabi-focus focus:border-transparent resize-none"
            />
            {validationHint && (
              <div id="demo-question-hint" className="mt-2 space-y-1" role="alert">
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

          <button
            type="button"
            disabled={!isValid}
            className="w-full rounded bg-sabi-accent px-4 py-3 font-medium text-sabi-bg hover:bg-sabi-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Request Verification — 1 Credit
          </button>
        </form>

        <p className="text-center text-xs text-sabi-muted">
          A nearby verifier with Ray-Ban Metas will go check and send you photo evidence + a vocal answer.
        </p>

        {/* My Verifications */}
        <section className="space-y-4 pt-4 border-t border-sabi-border" aria-labelledby="demo-verifications-heading">
          <h2 id="demo-verifications-heading" className="text-lg font-semibold text-sabi-text">My Verifications</h2>

          <ul className="space-y-2" aria-label="Demo verification jobs">
            {myJobs.map((job) => {
              const style = STATUS_STYLES[job.status] ?? { label: job.status, color: "bg-sabi-muted text-sabi-bg" };
              return (
                <li key={job.id}>
                  <Link
                    href={`/demo/verify/${job.id}`}
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
        </section>
      </div>
    </main>
  );
}
