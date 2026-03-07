"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { listAvailableJobs, seedDemoJobs } from "@/lib/api";

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

const CATEGORY_ICONS: Record<string, string> = {
  "Business Hours": "🏪",
  "Traffic & Parking": "🚗",
  "Wait Times": "⏳",
  "Menu & Prices": "🍽️",
  "Infrastructure": "🏗️",
  "general": "📍",
};

function timeAgo(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

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
    <main className="flex min-h-[calc(100vh-57px)] flex-col items-center p-6">
      <div className="w-full max-w-2xl space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Available Jobs</h1>
              <p className="text-sm text-zinc-500 mt-1">
                Accept a verification request, go check, and earn credits.
              </p>
            </div>
            <button
              onClick={refresh}
              className="rounded-lg border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Verifier identity notice */}
        <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/50 px-4 py-3">
          <span className="text-lg">📷</span>
          <div className="flex-1">
            <p className="text-sm text-zinc-300">Verifier Mode</p>
            <p className="text-xs text-zinc-500">
              Accept a job below, then go to the location and capture photo evidence with your camera or Ray-Ban Metas.
            </p>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-lg border border-zinc-800 bg-zinc-900 p-5 animate-pulse">
                <div className="h-4 bg-zinc-800 rounded w-3/4 mb-3" />
                <div className="h-3 bg-zinc-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-16 space-y-4">
            <div className="text-5xl">📭</div>
            <p className="text-zinc-400 text-lg">No verification jobs available right now.</p>
            <p className="text-zinc-600 text-sm">New requests appear here in real time.</p>
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="mt-4 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition-colors"
            >
              {seeding ? "Creating..." : "Load Demo Jobs"}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                className="group block rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-indigo-600/50 hover:bg-zinc-900/80 transition-all"
              >
                <div className="flex items-start gap-4">
                  <span className="mt-0.5 text-2xl">
                    {CATEGORY_ICONS[job.category] ?? "📍"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-zinc-100 font-medium leading-snug group-hover:text-white transition-colors">
                      {job.question}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-2.5">
                      <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
                        {job.category}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {timeAgo(job.createdAt)}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {job.targetLat.toFixed(2)}°, {job.targetLng.toFixed(2)}°
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600/20 px-3 py-1 text-sm font-semibold text-emerald-400">
                      {job.payout} <span className="text-xs font-normal">credits</span>
                    </span>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      tap to accept
                    </p>
                  </div>
                </div>
              </Link>
            ))}
            <p className="text-center text-xs text-zinc-600 pt-2">
              {jobs.length} job{jobs.length !== 1 ? "s" : ""} available &middot; auto-refreshes every 5s
            </p>
          </div>
        )}

        {jobs.length > 0 && (
          <div className="border-t border-zinc-800 pt-4">
            <button
              onClick={handleSeed}
              disabled={seeding}
              className="w-full rounded-lg border border-dashed border-zinc-700 px-4 py-2.5 text-sm text-zinc-500 hover:text-zinc-300 hover:border-zinc-600 disabled:opacity-50 transition-colors"
            >
              {seeding ? "Creating..." : "+ Add more demo jobs"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
