"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listMyVerifications, getMe } from "@/lib/api";
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

export default function Home() {
  const router = useRouter();
  const [auth, setAuthState] = useState<AuthState | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

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

  function handleSignOut() {
    clearAuth();
    router.replace("/login");
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center" role="main" aria-busy="true" aria-live="polite">
        <p className="text-sabi-muted">Loading...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-6" role="main" aria-label="Verification dashboard">
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

        {/* My Verifications */}
        <section className="space-y-4" aria-labelledby="my-verifications-heading">
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
              <p className="text-sabi-muted text-sm">No verifications yet. Verifications created via the API will appear here.</p>
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
