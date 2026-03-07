"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listAvailableJobs, seedDemoJobs } from "@/lib/api";
import { getAuth } from "@/lib/auth";

interface Job {
  id: string;
  question: string;
  category: string;
  status: string;
  payout: number;
  targetLat: number;
  targetLng: number;
  requesterId: string;
  createdAt: number;
}

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function JobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (!auth) { router.replace("/login"); return; }
  }, [router]);

  const refresh = useCallback(async () => {
    try {
      const data = await listAvailableJobs();
      setJobs(data.jobs);
    } catch {
      // ignore
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listAvailableJobs()
      .then((data) => { if (!cancelled) { setJobs(data.jobs); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    const interval = setInterval(() => {
      listAvailableJobs()
        .then((data) => { if (!cancelled) setJobs(data.jobs); })
        .catch(() => {});
    }, 5000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  async function handleSeed() {
    setSeeding(true);
    try {
      await seedDemoJobs();
      await refresh();
    } catch {
      // ignore
    }
    setSeeding(false);
  }

  return (
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center p-6" role="main" aria-label="Available verification jobs">
      <div className="w-full max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-sabi-text">Available Jobs</h1>
            <p className="text-sm text-sabi-muted mt-1">
              Accept a verification request, go check, and earn credits.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded border border-sabi-border px-3 py-1.5 text-xs text-sabi-muted hover:text-sabi-text hover:border-sabi-muted transition-colors"
            aria-label="Refresh jobs"
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-3" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded border border-sabi-border bg-sabi-surface p-5 animate-pulse">
                <div className="h-4 bg-sabi-border rounded w-3/4 mb-3" />
                <div className="h-3 bg-sabi-border rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <p className="text-sabi-muted text-lg">No verification jobs available right now.</p>
            <p className="text-sabi-muted/60 text-sm">New requests appear here in real time.</p>
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="mt-4 rounded bg-sabi-accent px-5 py-2.5 text-sm font-medium text-sabi-bg hover:bg-sabi-accent-hover disabled:opacity-50 transition-colors"
            >
              {seeding ? "Creating..." : "Load Demo Jobs"}
            </button>
          </div>
        ) : (
          <ul className="space-y-3" aria-label="Verification jobs">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link
                  href={`/jobs/${job.id}`}
                  className="group block rounded border border-sabi-border bg-sabi-surface p-5 hover:border-sabi-accent/50 transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sabi-text font-medium leading-snug group-hover:text-sabi-accent transition-colors">
                        {job.question}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2.5">
                        <span className="rounded bg-sabi-border px-2.5 py-0.5 text-xs text-sabi-muted">
                          {job.category}
                        </span>
                        <span className="text-xs text-sabi-muted">
                          {timeAgo(job.createdAt)}
                        </span>
                      </div>
                    </div>
                    <span className="shrink-0 rounded bg-sabi-success/15 px-3 py-1 text-sm font-semibold text-sabi-success">
                      {job.payout} credits
                    </span>
                  </div>
                </Link>
              </li>
            ))}
            <p className="text-center text-xs text-sabi-muted pt-2">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} available &middot; auto-refreshes every 5s
            </p>
          </ul>
        )}

        {jobs.length > 0 && (
          <div className="border-t border-sabi-border pt-4">
            <button
              type="button"
              onClick={handleSeed}
              disabled={seeding}
              className="w-full rounded border border-dashed border-sabi-border px-4 py-2.5 text-sm text-sabi-muted hover:text-sabi-text hover:border-sabi-muted disabled:opacity-50 transition-colors"
            >
              {seeding ? "Creating..." : "+ Add more demo jobs"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
